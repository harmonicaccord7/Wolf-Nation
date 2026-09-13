/** Private, deterministic research. No market orders or publication. */
export const BTC24_VERSION = '0.1.0'
export const DAY = 86_400
export const BTC24_SOURCE = 'https://api.exchange.coinbase.com/products/BTC-USD/candles'
export const BTC24_DOCS = 'https://docs.cdp.coinbase.com/api-reference/exchange-api/rest-api/products/get-product-candles'
export const FEATURE_NAMES = ['return_1d', 'return_3d', 'return_7d', 'return_14d', 'volatility_7d', 'volatility_30d', 'range_1d', 'relative_volume_7d']
// Coinbase order: bucket start (seconds), low, high, open, close, base volume.
export type Candle = [number, number, number, number, number, number]
export type Sample = { cutoff: number; start: number; end: number; x: number[]; y: number; move: number; open: number; close: number }
export type FittedModel = { means: number[]; scales: number[]; coefficients: number[]; prior: number; observations: number; lastTargetEnd: number; iterations: number; gradientMax: number; penalty: number }
export type Scored = Sample & { probability: number; baseline: number; fold: string }
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
const sigmoid = (x: number) => x >= 0 ? 1 / (1 + Math.exp(-x)) : Math.exp(x) / (1 + Math.exp(x))
const dot = (a: number[], b: number[]) => a.reduce((sum, n, i) => sum + n * b[i], 0)
export const iso = (seconds: number) => new Date(seconds * 1000).toISOString()

export function cleanCandles(input: unknown[], cutoff: number) {
  const map = new Map<number, Candle>(); let duplicates = 0, incomplete = 0
  for (const raw of input) {
    if (!Array.isArray(raw) || raw.length !== 6 || raw.some(n => typeof n !== 'number' || !Number.isFinite(n))) throw new Error('Malformed Coinbase candle')
    const c = raw as Candle
    if (!Number.isInteger(c[0]) || c[0] % DAY || c.slice(1, 5).some(n => n <= 0) || c[5] <= 0 || c[1] > Math.min(c[3], c[4]) || c[2] < Math.max(c[3], c[4]) || c[1] > c[2]) throw new Error('Invalid candle time/OHLC/volume')
    if (c[0] + DAY > cutoff) { incomplete++; continue }
    if (map.has(c[0])) {
      if (JSON.stringify(map.get(c[0])) !== JSON.stringify(c)) throw new Error('Conflicting duplicate candle')
      duplicates++
    } else map.set(c[0], c)
  }
  const candles = [...map.values()].sort((a, b) => a[0] - b[0])
  const gaps = candles.slice(1).flatMap((c, i) => c[0] - candles[i][0] === DAY ? [] : [{ after: iso(candles[i][0]), before: iso(c[0]), missingDays: (c[0] - candles[i][0]) / DAY - 1 }])
  return { candles, quality: { rows: candles.length, duplicates, incomplete, gaps, first: candles[0] ? iso(candles[0][0]) : null, last: candles.length ? iso(candles.at(-1)![0]) : null } }
}

export function featuresAt(candles: Candle[], i: number): number[] | null {
  if (i < 30) return null
  for (let k = i - 29; k <= i; k++) if (candles[k][0] - candles[k - 1][0] !== DAY) return null
  const close = candles[i][4]
  const returns = Array.from({ length: 30 }, (_, n) => Math.log(candles[i - 29 + n][4] / candles[i - 30 + n][4]))
  const volatility = (n: number) => { const r = returns.slice(-n), m = mean(r); return Math.sqrt(mean(r.map(v => (v - m) ** 2))) }
  return [1, 3, 7, 14].map(n => Math.log(close / candles[i - n][4])).concat([
    volatility(7), volatility(30), Math.log(candles[i][2] / candles[i][1]),
    Math.log(mean(candles.slice(i - 6, i + 1).map(c => c[5])) / mean(candles.slice(i - 29, i + 1).map(c => c[5])))
  ])
}

/** A forecast issued on date D predicts the full UTC day D+1.
 * Inputs end at D 00:00; the intervening day is deliberately excluded.
 * This same 24h input gap applies to historical and prospective samples. */
export function makeSamples(candles: Candle[]): Sample[] {
  const result: Sample[] = []
  for (let i = 30; i + 2 < candles.length; i++) {
    const x = featuresAt(candles, i), target = candles[i + 2]
    if (!x || candles[i + 1][0] - candles[i][0] !== DAY || target[0] - candles[i + 1][0] !== DAY) continue
    result.push({ cutoff: candles[i][0] + DAY, start: target[0], end: target[0] + DAY, x, y: Number(target[4] > target[3]), move: target[4] / target[3] - 1, open: target[3], close: target[4] })
  }
  return result
}

// Small positive-definite Newton system; deterministic partial-pivot elimination.
function solve(matrix: number[][], vector: number[]) {
  const a = matrix.map((r, i) => [...r, vector[i]]), n = vector.length
  for (let k = 0; k < n; k++) {
    let pivot = k
    for (let j = k + 1; j < n; j++) if (Math.abs(a[j][k]) > Math.abs(a[pivot][k])) pivot = j
    ;[a[k], a[pivot]] = [a[pivot], a[k]]
    if (Math.abs(a[k][k]) < 1e-14) throw new Error('Singular model fit')
    const d = a[k][k]; for (let j = k; j <= n; j++) a[k][j] /= d
    for (let i = 0; i < n; i++) if (i !== k) { const f = a[i][k]; for (let j = k; j <= n; j++) a[i][j] -= f * a[k][j] }
  }
  return a.map(r => r[n])
}

/** Minimize SUM binary log loss + penalty/2 * SUM standardized weights squared.
 * Intercept is unpenalized. Fixed penalty=10 (sklearn C=0.1); no test tuning. */
export function fitLogistic(samples: Sample[], penalty = 10): FittedModel {
  if (samples.length < 500 || !(penalty > 0)) throw new Error('At least 500 training observations and positive penalty required')
  const prior = mean(samples.map(s => s.y))
  if (prior <= 0 || prior >= 1) throw new Error('Training needs both outcomes')
  const means = FEATURE_NAMES.map((_, j) => mean(samples.map(s => s.x[j])))
  const scales = means.map((m, j) => Math.sqrt(mean(samples.map(s => (s.x[j] - m) ** 2))) || 1)
  const x = samples.map(s => [1, ...s.x.map((v, j) => (v - means[j]) / scales[j])]), n = means.length + 1
  let coefficients = [Math.log(prior / (1 - prior)), ...means.map(() => 0)], gradientMax = Infinity, iterations = 0
  const loss = (b: number[]) => x.reduce((s, row, i) => { const z = dot(row, b); return s + Math.max(z, 0) + Math.log1p(Math.exp(-Math.abs(z))) - samples[i].y * z }, 0) + penalty / 2 * b.slice(1).reduce((s, v) => s + v * v, 0)
  for (; iterations < 50; iterations++) {
    const gradient = coefficients.map((b, j) => j ? penalty * b : 0), hessian = Array.from({ length: n }, (_, j) => Array.from({ length: n }, (_, k) => j === k && j ? penalty : 0))
    x.forEach((row, i) => { const p = sigmoid(dot(row, coefficients)), w = Math.max(p * (1 - p), 1e-12)
      for (let j = 0; j < n; j++) { gradient[j] += (p - samples[i].y) * row[j]; for (let k = 0; k < n; k++) hessian[j][k] += w * row[j] * row[k] }
    })
    gradientMax = Math.max(...gradient.map(Math.abs))
    if (gradientMax < 1e-7) break
    const step = solve(hessian, gradient), previous = loss(coefficients); let alpha = 1, accepted = false
    // Below machine-resolvable loss improvement, take the final Newton step.
    if (dot(gradient, step) / 2 < 1e-12) { coefficients = coefficients.map((v, j) => v - step[j]); break }
    for (let attempt = 0; attempt < 25; attempt++) {
      const candidate = coefficients.map((v, j) => v - alpha * step[j])
      if (loss(candidate) <= previous) { coefficients = candidate; accepted = true; break }
      alpha /= 2
    }
    if (!accepted) throw new Error('Optimizer line search failed')
  }
  if (iterations === 50 || coefficients.some(v => !Number.isFinite(v))) throw new Error('Optimizer did not converge')
  return { means, scales, coefficients, prior, observations: samples.length, lastTargetEnd: Math.max(...samples.map(s => s.end)), iterations, gradientMax, penalty }
}

export function predict(model: FittedModel, x: number[]) {
  if (x.length !== model.means.length || x.some(n => !Number.isFinite(n))) throw new Error('Invalid forecast features')
  return sigmoid(dot([1, ...x.map((v, j) => (v - model.means[j]) / model.scales[j])], model.coefficients))
}

export function classification(rows: Scored[], baseline = false) {
  if (!rows.length) throw new Error('No evaluation observations')
  const prob = (r: Scored) => baseline ? r.baseline : r.probability
  const positives = rows.filter(r => prob(r) >= .5), hits = rows.filter(r => Number(prob(r) >= .5) === r.y).length
  return { observations: rows.length, hitRate: hits / rows.length, precision: positives.length ? mean(positives.map(r => r.y)) : null,
    brier: mean(rows.map(r => (prob(r) - r.y) ** 2)), logLoss: mean(rows.map(r => -r.y * Math.log(Math.max(prob(r), 1e-15)) - (1 - r.y) * Math.log(Math.max(1 - prob(r), 1e-15)))), actualUpRate: mean(rows.map(r => r.y)),
    reliability: Array.from({ length: 10 }, (_, i) => { const bin = rows.filter(r => Math.min(9, Math.floor(prob(r) * 10)) === i); return { lower: i / 10, upper: (i + 1) / 10, count: bin.length, predicted: bin.length ? mean(bin.map(prob)) : null, observed: bin.length ? mean(bin.map(r => r.y)) : null } }) }
}

/** Each long is closed after its UTC day: two cost legs per exposure, even on
 * adjacent days. No leverage, shorting, cash interest or assumed intraday fills. */
export function strategy(rows: Scored[], costBps: number, mode: 'model' | 'always-long' | 'momentum' | 'cash' = 'model') {
  let equity = 1, peak = 1, drawdown = 0, activeDays = 0, total = 0
  const cost = costBps / 10000
  const curve = rows.map(r => {
    const active = mode === 'always-long' || mode === 'model' && r.probability >= .55 || mode === 'momentum' && r.x[0] > 0
    const change = active ? (1 - cost) * (1 + r.move) * (1 - cost) - 1 : 0
    if (active) activeDays++
    total += change; equity *= 1 + change; peak = Math.max(peak, equity); drawdown = Math.max(drawdown, 1 - equity / peak)
    return { at: iso(r.end), equity }
  })
  return { costBpsPerSide: costBps, totalReturnPct: (equity - 1) * 100, averageDayReturnPct: total / rows.length * 100, maxDrawdownPct: drawdown * 100, activeDays, observations: rows.length, curve }
}

export function buyHold(rows: Scored[], costBps: number) {
  const cost = costBps / 10000, first = rows[0].open; let peak = 1, drawdown = 0
  const curve = rows.map((r, i) => { const equity = (1 - cost) * r.close / first * (i === rows.length - 1 ? 1 - cost : 1); peak = Math.max(peak, equity); drawdown = Math.max(drawdown, 1 - equity / peak); return { at: iso(r.end), equity } })
  return { costBpsPerSide: costBps, totalReturnPct: (curve.at(-1)!.equity - 1) * 100, maxDrawdownPct: drawdown * 100, curve }
}

// Fixed-seed circular moving-block bootstrap: preserves local dependence.
export function brierDifferenceInterval(rows: Scored[], repetitions = 1000, blockDays = 14) {
  const differences = rows.map(r => (r.probability - r.y) ** 2 - (r.baseline - r.y) ** 2)
  let state = 241017
  const rand = () => { state = (Math.imul(1664525, state) + 1013904223) >>> 0; return state / 4294967296 }
  const draws: number[] = []
  for (let k = 0; k < repetitions; k++) { let sum = 0, count = 0; while (count < rows.length) { const start = Math.floor(rand() * rows.length); for (let j = 0; j < blockDays && count < rows.length; j++, count++) sum += differences[(start + j) % rows.length] } draws.push(sum / rows.length) }
  draws.sort((a, b) => a - b)
  return { difference: mean(differences), lower95: draws[Math.floor(.025 * repetitions)], upper95: draws[Math.floor(.975 * repetitions)], repetitions, blockDays, seed: 241017, interpretation: 'Negative favors model; uncertainty is exploratory and not corrected for future model searches.' }
}

export function researchExperiment(candles: Candle[]) {
  const samples = makeSamples(candles), at = (s: string) => Date.parse(s) / 1000
  const train = samples.filter(s => s.end < at('2022-12-31')), validation = samples.filter(s => s.start >= at('2023-01-01') && s.end <= at('2024-01-01'))
  if (validation.length < 300) throw new Error('Full validation-year coverage required')
  const initial = fitLogistic(train), validationRows = validation.map(s => ({ ...s, probability: predict(initial, s.x), baseline: initial.prior, fold: 'validation-2023' }))
  const test = samples.filter(s => s.start >= at('2024-01-01')); if (test.length < 365) throw new Error('At least one year of final holdout required')
  const folds: { start: string; trainingLastTargetEnd: string; trainingObservations: number; observations: number; model: FittedModel }[] = [], rows: Scored[] = []
  let foldKey = '', fitted: FittedModel = initial
  for (const sample of test) {
    const date = new Date(sample.start * 1000), key = date.getUTCFullYear() + '-Q' + (Math.floor(date.getUTCMonth() / 3) + 1)
    if (key !== foldKey) {
      // Purge all labels not known BEFORE the first forecast's input cutoff.
      fitted = fitLogistic(samples.filter(s => s.end < sample.cutoff))
      if (fitted.lastTargetEnd >= sample.cutoff) throw new Error('Training label leakage')
      folds.push({ start: iso(sample.start), trainingLastTargetEnd: iso(fitted.lastTargetEnd), trainingObservations: fitted.observations, observations: 0, model: fitted }); foldKey = key
    }
    folds.at(-1)!.observations++; rows.push({ ...sample, probability: predict(fitted, sample.x), baseline: fitted.prior, fold: key })
  }
  const fittedFinal = fitLogistic(samples), modelMetrics = classification(rows), baselineMetrics = classification(rows, true), interval = brierDifferenceInterval(rows)
  const strategies = [10, 25, 50].map(cost => ({ costBpsPerSide: cost, model: strategy(rows, cost), alwaysLongDaily: strategy(rows, cost, 'always-long'), momentum: strategy(rows, cost, 'momentum'), buyHold: buyHold(rows, cost), cash: strategy(rows, cost, 'cash') }))
  return { version: BTC24_VERSION, features: FEATURE_NAMES, target: 'Probability that BTC-USD closes above its open over the next complete UTC day; inputs end 24 hours before target day starts.', train: { first: iso(train[0].start), last: iso(train.at(-1)!.end), observations: train.length },
    validation: { periodStart: iso(validation[0].start), periodEnd: iso(validation.at(-1)!.end), model: classification(validationRows), baseline: classification(validationRows, true) },
    test: { periodStart: iso(rows[0].start), periodEnd: iso(rows.at(-1)!.end), model: modelMetrics, baseline: baselineMetrics, brierDifference: interval, folds, strategies, rows }, fittedFinal,
    gate: { status: 'experimental', historicalSkill: interval.upper95 < 0 && modelMetrics.logLoss < baselineMetrics.logLoss ? 'provisional-evidence' : 'not-demonstrated', forwardValidation: 'pending', publication: 'blocked', reason: 'No prospective outcomes have established calibration or performance; historical data are a present-day vendor vintage.' } }
}

export function nextForecast(candles: Candle[], fitted: FittedModel, nowSeconds: number) {
  const today = Math.floor(nowSeconds / DAY) * DAY, last = candles.at(-1), x = featuresAt(candles, candles.length - 1)
  if (!last || last[0] + DAY !== today || !x || today + DAY - nowSeconds < 300 || fitted.lastTargetEnd > today) throw new Error('Missing complete current inputs or insufficient time to freeze forecast')
  return { sourceAsOf: iso(today), windowStart: iso(today + DAY), windowEnd: iso(today + 2 * DAY), features: x, probability: predict(fitted, x), probabilityDefinition: 'P(target UTC-day close > target UTC-day open)', horizonHours: 24, generatedAt: iso(nowSeconds), opportunityScore: null, tradeAction: 'abstain-unvalidated' }
}
