import assert from 'node:assert/strict'
import { DAY, BTC24_SOURCE, iso, predict } from '../lib/models/btc24.ts'
import { canonicalJson } from '../lib/models/modules.ts'
import { sha256 } from '../lib/models/btc24-history.ts'
import { evaluateBtc24Forward } from '../lib/models/btc24-forward.ts'
import { readCompleteLedger } from '../lib/data/complete-ledger.ts'

// Synthetic test data only: never written to the production database.
export const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
export const start = Date.parse('2020-01-01T00:00:00Z') / 1000
const fitted = { means: Array(8).fill(0), scales: Array(8).fill(1), coefficients: [Math.log(.6 / .4), .4, ...Array(7).fill(0)], prior: .52, observations: 1000, lastTargetEnd: start - DAY, iterations: 4, gradientMax: 1e-8, penalty: 10 }
const artifact = await sha256(canonicalJson(fitted))
export const model = { id: id(90000), code: 'K-BTC-24H', version: 'synthetic-v1', status: 'experimental', created_at: iso(start - DAY + 100), methodology: { fitted, artifact_hash: artifact } }
export function prediction(i, resolved = true) {
  const x = [i % 2 ? -1 : 1, ...Array(7).fill(0)], probability = predict(fitted, x)
  const open = 100 + i / 5, close = open * (i % 3 ? 1.02 : .99), move = close / open - 1
  const row = { id: id(i + 1), model_version_id: model.id, symbol: 'BTC-USD', asset_class: 'crypto', horizon_hours: 24,
    probability, direction: probability >= .5 ? 'bullish' : 'bearish', status: resolved ? 'resolved' : 'open',
    opportunity_score: 0, expected_move_pct: null, source_as_of: iso(start + (i - 1) * DAY), created_at: iso(start + (i - 1) * DAY + 3600),
    features: { protocol: 'btc24-v1', window_start: iso(start + i * DAY), window_end: iso(start + (i + 1) * DAY),
      x, baseline_probability: fitted.prior, artifact_hash: artifact, snapshot_id: id(90001), snapshot_hash: 'a'.repeat(64), trade_action: 'abstain-unvalidated' },
    outcomes: [] }
  if (resolved) row.outcomes.push({ id: id(10000 + i), prediction_id: row.id, resolved_at: iso(start + (i + 1) * DAY), created_at: iso(start + (i + 1) * DAY + 1200),
    realized_move_pct: move * 100, resolution_price: close, hit: (probability >= .5) === (move > 0),
    notes: JSON.stringify({ provider: 'Coinbase Exchange', source_url: BTC24_SOURCE, snapshot_id: id(90002), snapshot_hash: 'b'.repeat(64), candle: [start + i * DAY, Math.min(open, close) - 1, Math.max(open, close) + 1, open, close, 100] }) })
  return row
}

const cutoff = iso(start + 90 * DAY + 3600)
const rows = Array.from({ length: 92 }, (_, i) => prediction(i, i < 90))
const original = JSON.stringify({ model, rows })
export const report = await evaluateBtc24Forward(model, rows, cutoff, true)
assert.equal(report.issueCount, 0)
assert.equal(report.forecasts, 92)
assert.equal(report.resolved, 90)
assert.equal(report.pending, 2)
assert.equal(report.gate, 'human-review-required') // Not validated; never auto-publish.
assert.equal(report.metrics.model.observations, 90)
assert.equal(report.metrics.model.reliability.reduce((n, b) => n + b.count, 0), 90)
assert.equal(report.metrics.benchmark.reliability.reduce((n, b) => n + b.count, 0), 90)
assert.ok(report.metrics.model.reliability.some(b => b.count === 0 && b.observed === null))
const matured = rows.slice(0, 90)
const expectedBrier = matured.reduce((n, p) => n + (p.probability - Number(p.outcomes[0].realized_move_pct > 0)) ** 2, 0) / 90
const expectedBenchmark = matured.reduce((n, p) => n + (.52 - Number(p.outcomes[0].realized_move_pct > 0)) ** 2, 0) / 90
assert.ok(Math.abs(report.metrics.model.brier - expectedBrier) < 1e-12)
assert.ok(Math.abs(report.metrics.benchmark.brier - expectedBenchmark) < 1e-12)
assert.ok(Math.abs(report.metrics.model.logLoss - matured.reduce((n, p) => n - Math.log(p.outcomes[0].realized_move_pct > 0 ? p.probability : 1 - p.probability), 0) / 90) < 1e-12)
assert.equal(report.metrics.model.hitRate, matured.filter(p => p.outcomes[0].hit).length / 90)
assert.equal(report.metrics.costs[0].model.activeDays, 45)
assert.equal(report.metrics.costs[0].cash.totalReturnPct, 0)
assert.equal(report.metrics.costs[0].cash.activeDays, 0)
const net = matured.reduce((equity, p) => equity * (p.probability >= .55 ? .999 * (1 + p.outcomes[0].realized_move_pct / 100) * .999 : 1), 1)
assert.ok(Math.abs(report.metrics.costs[0].model.totalReturnPct - (net - 1) * 100) < 1e-10)
assert.ok(report.metrics.costs[0].model.totalReturnPct > report.metrics.costs[2].model.totalReturnPct)
assert.deepEqual(report.metrics.uncertainty, (await evaluateBtc24Forward(model, [...rows].reverse(), cutoff, true)).metrics.uncertainty)
assert.equal(JSON.stringify({ model, rows }), original, 'Evaluation must not mutate frozen evidence')

const early = await evaluateBtc24Forward(model, rows.slice(0, 8), iso(start + 8 * DAY + 3600), true)
assert.equal(early.gate, 'insufficient-evidence')
assert.equal(early.metrics.uncertainty, null)
const empty = await evaluateBtc24Forward(model, [], cutoff, true)
assert.equal(empty.metrics, null)
assert.equal(empty.gate, 'insufficient-evidence')
const objectRelation = rows.map(p => ({ ...p, outcomes: p.outcomes[0] ?? null }))
assert.deepEqual((await evaluateBtc24Forward(model, objectRelation, cutoff, true)).metrics, report.metrics)

async function rejected(mutator, pattern) {
  const copy = structuredClone(rows), m = structuredClone(model)
  await mutator(copy, m)
  const result = await evaluateBtc24Forward(m, copy, cutoff, true)
  assert.equal(result.metrics, null)
  assert.equal(result.gate, 'evidence-incomplete')
  assert.match(result.issues.join(' '), pattern)
}
await rejected(r => { r[0].model_version_id = id(99999) }, /another model version/)
await rejected(r => { r[0].features.baseline_probability = .9 }, /frozen benchmark/)
await rejected(r => { r[0].probability = .99 }, /does not reproduce/)
await rejected(async (r, m) => {
  m.methodology.fitted.scales[1] = Number.MIN_VALUE
  m.methodology.artifact_hash = await sha256(canonicalJson(m.methodology.fitted))
  for (const p of r) p.features.artifact_hash = m.methodology.artifact_hash
  r[0].features.x[1] = 1
}, /does not reproduce/)
await rejected((r, m) => { m.methodology.fitted.prior = .6 }, /checksum/)
await rejected(r => { r[0].created_at = r[0].features.window_start }, /retrospective/)
await rejected(r => { r[0].source_as_of = r[0].features.window_start }, /future information/)
await rejected(r => { r[0].features.window_end = iso(start + 2 * DAY) }, /invalid window/)
await rejected(r => { r[0].features.snapshot_hash = 'missing' }, /provenance/)
await rejected(r => { r[0].features.x[0] = NaN }, /invalid probability/)
await rejected(r => { r[0].features.artifact_hash = 'c'.repeat(64) }, /provenance/)
await rejected(r => { r[0].features.trade_action = 'buy-now' }, /abstain/)
await rejected(r => { r[0].opportunity_score = 90 }, /unscored/)
await rejected(r => { r.push(structuredClone(r[0])) }, /duplicate/)
await rejected(r => { const duplicate = structuredClone(r[0]); duplicate.id = id(99998); r.push(duplicate) }, /overlapping/)
await rejected(r => { r[0].outcomes[0].hit = !r[0].outcomes[0].hit }, /source candle/)
await rejected(r => { r[0].outcomes[0].realized_move_pct = 42 }, /source candle/)
await rejected(r => { r[0].outcomes[0].prediction_id = r[1].id }, /identity/)
await rejected(r => { r[0].outcomes[0].created_at = r[0].features.window_start }, /timing/)
await rejected(r => { r[0].outcomes[0].notes = 'invalid-json' }, /provenance/)
await rejected(r => { const note = JSON.parse(r[0].outcomes[0].notes); note.candle[0] += DAY; r[0].outcomes[0].notes = JSON.stringify(note) }, /target candle/)
await rejected(r => { r[0].outcomes.push(structuredClone(r[0].outcomes[0])) }, /ambiguous/)
await rejected(r => { delete r[0].outcomes }, /unavailable/)
await rejected(r => { r[0].outcomes = [] }, /mature forecast/)
await rejected(r => { r[0].outcomes[0].created_at = iso(start + 91 * DAY) }, /mature forecast/)
await rejected(r => { r.splice(25, 1) }, /daily forecast.*missing/)
await rejected(r => { r[90] = prediction(90); r[90].outcomes[0].created_at = cutoff }, /before the target matured/)
const incomplete = await evaluateBtc24Forward(model, rows, cutoff, false)
assert.equal(incomplete.metrics, null)
assert.equal(incomplete.ledgerComplete, false)
const stalled = await evaluateBtc24Forward(model, rows.slice(0, 8), iso(start + 100 * DAY), true)
assert.equal(stalled.daysSinceLastTarget, 92)
assert.equal(stalled.missingForecastDays, 0, 'Retired version is evaluated within its own issued span')

const all = Array.from({ length: 1107 }, (_, i) => ({ id: String(i) }))
let calls = 0
const paged = await readCompleteLedger(async (from, to) => { calls++; return { data: all.slice(from, to + 1), count: all.length, error: null } }, 50)
assert.equal(paged.complete, true)
assert.equal(paged.rows.length, 1107)
assert.equal(calls, 23)
assert.equal((await readCompleteLedger(async (from) => ({ data: all.slice(from, from + 7), count: all.length, error: null }), 50)).complete, true, 'Server cap below page size must not silently truncate')
assert.equal((await readCompleteLedger(async () => ({ data: [], count: 0, error: null }))).complete, true)
for (const fetch of [
  async () => ({ data: null, count: null, error: { message: 'private error' } }),
  async () => { throw new Error('network') },
  async () => ({ data: [], count: null, error: null }),
  async () => ({ data: [], count: 10_001, error: null }),
  async () => ({ data: [all[0]], count: 0, error: null }),
  async from => ({ data: from ? [] : all.slice(0, 50), count: 100, error: null }),
  async from => ({ data: all.slice(0, 50), count: from ? 99 : 100, error: null }),
  async () => ({ data: all.slice(0, 50), count: 100, error: null }),
]) assert.equal((await readCompleteLedger(fetch, 50)).complete, false)
assert.equal((await readCompleteLedger(async () => { throw Error('must not be called') }, 0)).complete, false)
console.log('Forward evidence QA passed: >1,000-row pagination, one-to-one outcomes, exact counts, version isolation, frozen probability/benchmark reproduction, cutoff/coverage failures, calibration, costs, deterministic uncertainty and no automatic validation.')
