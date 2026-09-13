export type ModelPoint = { observedAt: string; value: number; provider?: string; ingestedAt?: string }
export type ModelSnapshot = Record<string, ModelPoint[]>
export type ModuleResult = {
  moduleCode: string; label: string; status: 'observed' | 'abstained';
  value: number | null; unit: string; horizon: string; asOf: string | null;
  inputs: string[]; metrics: Record<string, number | null>; rationale: string; limitation: string
}
export const DECISION_MODEL_VERSION = '0.2.1'
export const DAY = 86_400_000

// JSONB may reorder object keys. A canonical serialization keeps the checksum
// reproducible after a database round trip as well as before insertion.
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']'
  if (value !== null && typeof value === 'object') return '{' + Object.entries(value).filter(([,v])=>v!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([key,v])=>JSON.stringify(key)+':'+canonicalJson(v)).join(',') + '}'
  return JSON.stringify(value) ?? 'null'
}

// Information arriving after the run cutoff cannot influence that run.
export function availablePoints(points: ModelPoint[] = [], cutoff: number): ModelPoint[] {
  const unique = new Map<number, ModelPoint>()
  for (const point of points) {
    const time = Date.parse(point.observedAt)
    if (!Number.isFinite(time) || time > cutoff || !Number.isFinite(point.value)) continue
    if (point.ingestedAt && !(Date.parse(point.ingestedAt) <= cutoff)) continue
    unique.set(time, point)
  }
  return [...unique.values()].sort((a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt))
}
export function pointAtOrBefore(points: ModelPoint[], target: number, tolerance: number) {
  const point = points.findLast(p => Date.parse(p.observedAt) <= target)
  return point && target - Date.parse(point.observedAt) <= tolerance ? point : null
}
export function elapsedReturn(points: ModelPoint[], hours: number, cutoff: number, tolerance = 30 * 60_000) {
  const latest = pointAtOrBefore(points, cutoff, tolerance)
  if (!latest || latest.value <= 0) return null
  const prior = pointAtOrBefore(points, Date.parse(latest.observedAt) - hours * 3_600_000, tolerance)
  return prior && prior.value > 0 ? (latest.value / prior.value - 1) * 100 : null
}

export function runDecisionModules(snapshot: ModelSnapshot, now = new Date().toISOString()): ModuleResult[] {
  const cutoff = Date.parse(now)
  if (!Number.isFinite(cutoff)) throw new Error('A valid run cutoff is required')
  const series = (code: string) => availablePoints(snapshot[code], cutoff)
  const result = (moduleCode: string, label: string, points: ModelPoint[], value: number | null, unit: string, horizon: string, inputs: string[], metrics: ModuleResult['metrics'], rationale: string, limitation: string): ModuleResult => ({
    moduleCode, label, status: value === null ? 'abstained' : 'observed', value, unit, horizon,
    asOf: points.at(-1)?.observedAt ?? null, inputs, metrics, rationale, limitation,
  })
  const cpi = series('CPI_US'), latestCpi = cpi.at(-1), priorCpi = cpi.at(-2)
  const cpiGap = latestCpi && priorCpi ? Date.parse(latestCpi.observedAt) - Date.parse(priorCpi.observedAt) : 0
  const cpiChange = latestCpi && priorCpi && priorCpi.value > 0 && cpiGap >= 27 * DAY && cpiGap <= 32 * DAY && cutoff - Date.parse(latestCpi.observedAt) <= 75 * DAY
    ? (latestCpi.value / priorCpi.value - 1) * 100 : null
  const macro = result('macro_regime', 'U.S. inflation observation', cpi, cpiChange, '% month over month', 'Last two monthly observations', ['CPI_US'], { monthlyChangePct: cpiChange },
    'Change in the stored seasonally adjusted CPI index. The observation month differs from the publication date.',
    'This is measured inflation, not a macro forecast or a surprise versus market consensus. Revised history cannot establish a historical trading advantage.')

  const rates = series('US10Y'), latestRate = pointAtOrBefore(rates, cutoff, 5 * DAY)
  const priorRate = latestRate ? pointAtOrBefore(rates, Date.parse(latestRate.observedAt) - 7 * DAY, 4 * DAY) : null
  const rateChange = latestRate && priorRate ? latestRate.value - priorRate.value : null
  const liquidity = result('liquidity_conditions', 'Treasury yield conditions', rates, rateChange, 'percentage points', '7 calendar days; prior business observation if needed', ['US10Y'], { yieldChangePercentagePoints: rateChange },
    'Observed change in the U.S. 10-year Treasury yield. Yield changes use percentage points, not percentage returns.',
    'A Treasury yield is only one financial-conditions indicator. Funding spreads, real yields and balance sheets are needed for a broader liquidity model.')

  const btc = series('BTC'), btc24 = elapsedReturn(btc, 24, cutoff), btc72 = elapsedReturn(btc, 72, cutoff)
  const crypto = result('btc_direction', 'Bitcoin observed momentum', btc, btc24, '%', '24 elapsed hours; 72h comparison', ['BTC'], { change24hPct: btc24, change72hPct: btc72 },
    'Returns compare actual timestamps 24 and 72 hours apart, with at most 30 minutes of sampling tolerance.',
    'Past momentum is not a calibrated price forecast. Missing or stale endpoints cause abstention, not interpolation.')

  const latestBtc = pointAtOrBefore(btc, cutoff, 30 * 60_000)
  const daily = latestBtc ? Array.from({ length: 8 }, (_, i) => pointAtOrBefore(btc, Date.parse(latestBtc.observedAt) - (7 - i) * DAY, 30 * 60_000)) : []
  let volatility: number | null = null
  if (daily.length === 8 && daily.every(p => p && p.value > 0)) {
    const sampled = daily as ModelPoint[]
    const squared = sampled.slice(1).reduce((sum, p, i) => sum + Math.log(p.value / sampled[i].value) ** 2, 0)
    const elapsedDays = (Date.parse(sampled[7].observedAt) - Date.parse(sampled[0].observedAt)) / DAY
    volatility = Math.sqrt(squared / elapsedDays * 365) * 100
  }
  const vol = result('volatility_expectations', 'Bitcoin realized volatility', btc, volatility, '% annualized', '7 days, sampled daily', ['BTC'], { realizedVolatilityPct: volatility },
    'Square root of summed daily squared log returns divided by elapsed days, annualized on 365 days. Values are not capped at 100%.',
    'Seven days is a noisy historical window, not implied volatility or a prediction. Every daily sampling endpoint is required.')

  const nigeria = series('NGA_INFLATION'), cameroon = series('CMR_INFLATION')
  const latestNigeria = pointAtOrBefore(nigeria, cutoff, 800 * DAY), latestCameroon = pointAtOrBefore(cameroon, cutoff, 800 * DAY)
  const africa = result('africa_country', 'Nigeria annual inflation', nigeria, latestNigeria?.value ?? null, '% annual', 'Latest annual observation', ['NGA_INFLATION', 'CMR_INFLATION'], { nigeriaInflationPct: latestNigeria?.value ?? null, cameroonInflationPct: latestCameroon?.value ?? null },
    'Country-specific annual inflation observations; Cameroon is shown separately for context.',
    'Annual country data is not a live Africa-wide score or a near-term asset forecast. Publication and revision lags apply.')
  const geopolitics = result('geopolitics_exposure', 'Geopolitical exposure research', [], null, '', 'Human-reviewed event research', [], {},
    'No numeric prediction is emitted without reviewed event evidence and identified asset exposures.',
    'No validated geopolitical forecasting model or probability is available.')
  return [macro, liquidity, crypto, vol, africa, geopolitics]
}

// Chronological, non-overlapping baseline replay; no tuning and no probabilities.
// The inputs are current stored history, so this is NOT a vintage macro backtest.
export function replayBtcBaseline(raw: ModelPoint[], cutoff: string, oneWayCostBps = 10) {
  if (!Number.isFinite(oneWayCostBps) || oneWayCostBps < 0) throw new Error('Invalid cost assumption')
  const points = availablePoints(raw, Date.parse(cutoff))
  const rows: { at: string; resolvedAt: string; exposure: number; returnPct: number; netReturnPct: number; buyHoldReturnPct: number }[] = []
  const start = points[0] ? Math.ceil(Date.parse(points[0].observedAt) / DAY) * DAY + DAY : Infinity
  let previousExposure = 0
  for (let at = start; at + DAY <= Date.parse(cutoff); at += DAY) {
    const known = points.filter(p => Date.parse(p.observedAt) <= at)
    const momentum = elapsedReturn(known, 24, at)
    const entry = pointAtOrBefore(known, at, 30 * 60_000)
    const exit = pointAtOrBefore(points, at + DAY, 30 * 60_000)
    if (momentum === null || !entry || !exit || exit.value <= 0 || entry.value <= 0) continue
    const exposure = momentum > 0 ? 1 : 0, move = (exit.value / entry.value - 1) * 100
    const cost = Math.abs(exposure - previousExposure) * oneWayCostBps / 100
    rows.push({ at: new Date(at).toISOString(), resolvedAt: exit.observedAt, exposure, returnPct: exposure * move, netReturnPct: exposure * move - cost, buyHoldReturnPct: move })
    previousExposure = exposure
  }
  if (rows.length) {
    rows[rows.length - 1].netReturnPct -= previousExposure * oneWayCostBps / 100
    rows[0].buyHoldReturnPct -= oneWayCostBps / 100
    rows[rows.length - 1].buyHoldReturnPct -= oneWayCostBps / 100
  }
  return { version: DECISION_MODEL_VERSION, method: '24h positive momentum / cash; daily non-overlapping hold; buy-and-hold comparator', oneWayCostBps, observations: rows.length, rows,
    validation: 'experimental', limitation: 'Exploratory replay of stored BTC snapshots, not an independently validated investment strategy. No tuned parameters, shorting, leverage or estimated probabilities. Forward evidence is still required.' }
}
