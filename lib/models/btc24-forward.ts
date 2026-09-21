import { BTC24_SOURCE, DAY, classification, strategy, buyHold, brierDifferenceInterval, predict, iso } from './btc24.ts'
import type { FittedModel, Scored } from './btc24.ts'
import { canonicalJson } from './modules.ts'
import { sha256 } from './btc24-history.ts'

export const MINIMUM_FORWARD_OUTCOMES = 90
const object = (v: unknown): Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {}
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const vector = (v: unknown, n: number): v is number[] => Array.isArray(v) && v.length === n && v.every(finite)
const at = (v: unknown) => typeof v === 'string' ? Date.parse(v) / 1000 : NaN
const hash = (v: unknown) => typeof v === 'string' && /^[0-9a-f]{64}$/.test(v)
const uuid = (v: unknown) => typeof v === 'string' && /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(v)

/** Audit ONE immutable version. Never refits, tunes a threshold, replaces a
 * source candle, or changes publication status. Database guards pin candles
 * to immutable snapshots; this also reproduces probabilities and outcomes. */
export async function evaluateBtc24Forward(modelValue: unknown, predictionValues: unknown[], asOf: string, ledgerComplete: boolean) {
  const model = object(modelValue), method = object(model.methodology), fittedValue = object(method.fitted)
  const now = at(asOf), modelCreated = at(model.created_at), issues: string[] = []
  const scored: Scored[] = [], ids = new Set<string>(), outcomeIds = new Set<string>(), windows = new Set<number>()
  let pending = 0, mature = 0, missingOutcomes = 0, invalidRows = 0
  const issue = (message: string) => { issues.push(message) }
  if (!ledgerComplete) issue('The database ledger is incomplete; performance is withheld.')
  if (!Number.isFinite(now)) issue('The report cutoff is invalid.')
  const fittedValid = model.code === 'K-BTC-24H' && uuid(model.id) && Number.isFinite(modelCreated) && modelCreated <= now &&
    vector(fittedValue.means, 8) && vector(fittedValue.scales, 8) && fittedValue.scales.every(v => v > 0) &&
    vector(fittedValue.coefficients, 9) && finite(fittedValue.prior) && fittedValue.prior > 0 && fittedValue.prior < 1 &&
    finite(fittedValue.lastTargetEnd) && fittedValue.lastTargetEnd <= modelCreated && hash(method.artifact_hash)
  if (!fittedValid || await sha256(canonicalJson(fittedValue)) !== method.artifact_hash) issue('The frozen fitted model or its checksum is invalid.')
  const fitted = fittedValue as FittedModel

  for (const value of predictionValues) {
    const p = object(value), f = object(p.features), before = issues.length
    const label = typeof p.id === 'string' ? p.id.slice(0, 8) : 'unknown'
    const bad = (reason: string) => issue(`Forecast ${label}: ${reason}`)
    const start = at(f.window_start), end = at(f.window_end), cutoff = at(p.source_as_of), created = at(p.created_at)
    if (!uuid(p.id) || ids.has(String(p.id))) bad('missing or duplicate ID.')
    ids.add(String(p.id))
    if (p.model_version_id !== model.id) bad('belongs to another model version.')
    if (f.protocol !== 'btc24-v1' || p.symbol !== 'BTC-USD' || p.asset_class !== 'crypto' || p.horizon_hours !== 24) bad('unsupported target or protocol.')
    if (![start, end, cutoff, created].every(Number.isFinite) || start % DAY !== 0 || end - start !== DAY || cutoff !== start - DAY ||
      cutoff > created || created + 300 >= start || created > now || modelCreated > created || !finite(fitted.lastTargetEnd) || fitted.lastTargetEnd > cutoff) bad('invalid window, future information, or retrospective issuance.')
    if (windows.has(start)) bad('duplicate/overlapping daily target.')
    if (Number.isFinite(start)) windows.add(start)
    if (!hash(f.snapshot_hash) || !uuid(f.snapshot_id) || f.artifact_hash !== method.artifact_hash) bad('source/model provenance is not pinned.')
    if (f.trade_action !== 'abstain-unvalidated' || p.expected_move_pct !== null || p.opportunity_score !== 0) bad('unvalidated research must remain unscored and abstain.')
    if (!vector(f.x, 8) || !finite(p.probability) || p.probability < 0 || p.probability > 1 ||
      !finite(f.baseline_probability) || f.baseline_probability !== fitted.prior) bad('invalid probability, features, or frozen benchmark.')
    else if (fittedValid) {
      const reproduced = predict(fitted, f.x)
      if (!Number.isFinite(reproduced) || Math.abs(reproduced - p.probability) > 1e-10) bad('probability does not reproduce from the frozen fit.')
    }
    if (p.direction !== (Number(p.probability) >= .5 ? 'bullish' : 'bearish')) bad('stored direction disagrees with the frozen probability.')
    // PostgREST returns object/null for the unique prediction_id relation;
    // array form is also accepted for SQL exports and explicit join fixtures.
    const related = p.outcomes === null ? [] : Array.isArray(p.outcomes) ? p.outcomes
      : p.outcomes !== undefined && Object.keys(object(p.outcomes)).length ? [p.outcomes] : null
    if (!related || related.length > 1) bad('outcome relation is unavailable or ambiguous.')
    if (issues.length !== before) { invalidRows++; continue }

    // Outcomes inserted after this cutoff cannot enter an as-of evaluation,
    // even if they became visible during multi-page reads.
    const all = related!.map(object)
    if (all.some(o => !Number.isFinite(at(o.created_at)))) { bad('outcome timestamp is invalid.'); invalidRows++; continue }
    const outcomes = all.filter(o => at(o.created_at) <= now)
    if (end > now) {
      pending++
      if (outcomes.length) { bad('outcome was recorded before the target matured.'); invalidRows++ }
      continue
    }
    mature++
    if (!outcomes.length) { missingOutcomes++; continue }
    const o = outcomes[0]
    if (!uuid(o.id) || outcomeIds.has(String(o.id)) || o.prediction_id !== p.id || at(o.resolved_at) !== end || at(o.created_at) < end) bad('outcome identity or timing mismatch.')
    outcomeIds.add(String(o.id))
    let detail: Record<string, unknown> = {}
    try { detail = object(JSON.parse(typeof o.notes === 'string' ? o.notes : '')) } catch { bad('outcome provenance is not valid JSON.') }
    const c = detail.candle
    if (detail.provider !== 'Coinbase Exchange' || detail.source_url !== BTC24_SOURCE || !uuid(detail.snapshot_id) || !hash(detail.snapshot_hash) ||
      !vector(c, 6) || c[0] !== start || c.slice(1, 5).some(v => v <= 0) || c[5] <= 0 || c[1] > Math.min(c[3], c[4]) || c[2] < Math.max(c[3], c[4])) bad('invalid pinned Coinbase target candle.')
    if (issues.length !== before) { invalidRows++; continue }
    const candle = c as number[], move = candle[4] / candle[3] - 1, y = Number(move > 0)
    if (!finite(o.realized_move_pct) || Math.abs(o.realized_move_pct - move * 100) > 1e-8 ||
      o.resolution_price !== candle[4] || o.hit !== ((Number(p.probability) >= .5) === (y === 1))) {
      bad('stored outcome does not match its source candle.'); invalidRows++; continue
    }
    scored.push({ start, end, cutoff, x: f.x as number[], y, move, open: candle[3], close: candle[4], probability: p.probability as number, baseline: fitted.prior, fold: String(model.version) })
  }
  scored.sort((a, b) => a.start - b.start)
  const starts = [...windows].sort((a, b) => a - b)
  // Coverage is this version's issued span, not an assumption that an older
  // version kept running after retirement. Recency is shown separately.
  const missingForecastDays = starts.length ? Math.max(0, Math.round((starts.at(-1)! - starts[0]) / DAY) + 1 - starts.length) : 0
  if (missingForecastDays) issue(`${missingForecastDays} daily forecast(s) are missing inside this version's issued span.`)
  if (missingOutcomes) issue(`${missingOutcomes} mature forecast(s) have no outcome recorded by the report cutoff.`)
  const metrics = !issues.length && scored.length ? {
    model: classification(scored), benchmark: classification(scored, true),
    brierDifference: classification(scored).brier - classification(scored, true).brier,
    uncertainty: scored.length >= MINIMUM_FORWARD_OUTCOMES ? brierDifferenceInterval(scored) : null,
    costs: [10, 25, 50].map(cost => ({ costBpsPerSide: cost, model: strategy(scored, cost), alwaysLongDaily: strategy(scored, cost, 'always-long'), momentum: strategy(scored, cost, 'momentum'), buyHold: buyHold(scored, cost), cash: strategy(scored, cost, 'cash') })),
  } : null
  return {
    asOf, modelId: model.id, modelVersion: model.version, ledgerComplete, forecasts: predictionValues.length,
    mature, resolved: scored.length, pending, missingOutcomes, missingForecastDays, invalidRows,
    firstTarget: starts.length ? iso(starts[0]) : null,
    lastTargetEnd: starts.length ? iso(starts.at(-1)! + DAY) : null,
    daysSinceLastTarget: starts.length && Number.isFinite(now) ? Math.max(0, Math.floor((now - starts.at(-1)! - DAY) / DAY)) : null,
    evaluatedStart: scored.length ? iso(scored[0].start) : null, evaluatedEnd: scored.length ? iso(scored.at(-1)!.end) : null,
    issues: issues.slice(0, 20), issueCount: issues.length, metrics,
    minimum: MINIMUM_FORWARD_OUTCOMES,
    gate: issues.length ? 'evidence-incomplete' : scored.length < MINIMUM_FORWARD_OUTCOMES ? 'insufficient-evidence' : 'human-review-required',
  }
}
