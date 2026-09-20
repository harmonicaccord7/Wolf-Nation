import { createClient } from 'npm:@supabase/supabase-js@2.112.3'
import { BTC24_VERSION, DAY, researchExperiment, nextForecast, iso } from '../../../lib/models/btc24.ts'
import type { FittedModel } from '../../../lib/models/btc24.ts'
import { fetchBtcHistory, sha256 } from '../../../lib/models/btc24-history.ts'
import type { HistorySnapshot } from '../../../lib/models/btc24-history.ts'
import { canonicalJson } from '../../../lib/models/modules.ts'
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })
Deno.serve(async request => {
  if (request.method !== 'POST') return json({ error: 'POST required' }, 405)
  const key = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}').default ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const db = createClient(Deno.env.get('SUPABASE_URL')!, key, { auth: { persistSession: false } })
  const authorization = await db.rpc('authorize_workspace_refresh', { token_input: request.headers.get('x-kaporal-job-token') ?? '' })
  if (authorization.error || !authorization.data) return json({ error: 'Unauthorized' }, 401)
  const now = Date.now() / 1000
  try {
    const input = await request.json().catch(() => ({}))
    if (!['history', 'train', 'daily'].includes(input.action ?? 'daily')) return json({ error: 'Unknown action' }, 400)
    const previous = await db.from('model_runs').select('id,input_snapshot').eq('module_code', 'btc24-history').order('as_of', { ascending: false }).limit(1).maybeSingle()
    if (previous.error) throw new Error('History lookup failed')
    const snapshot = await fetchBtcHistory(now, previous.data?.input_snapshot as HistorySnapshot | undefined), snapshotHash = await sha256(canonicalJson(snapshot.candles))
    let snapshotId = previous.data?.id
    if (previous.data?.input_snapshot.hash !== snapshotHash) {
      const saved = await db.from('model_runs').insert({ module_code: 'btc24-history', model_version: BTC24_VERSION, run_type: 'research_snapshot', universe: 'Coinbase BTC-USD daily OHLCV', as_of: iso(now), input_snapshot: { ...snapshot, hash: snapshotHash }, metrics: snapshot.quality, results: [] }).select('id').single()
      if (saved.error) throw new Error('History persistence failed: ' + saved.error.message)
      snapshotId = saved.data.id
    }
    if (input.action === 'history') return json({ ok: true, snapshotId, snapshotHash, quality: snapshot.quality })
    let model = (await db.from('signal_model_versions').select('id,methodology').eq('code', 'K-BTC-24H').eq('version', BTC24_VERSION).eq('asset_class', 'crypto').maybeSingle()).data
    if (!model) {
      if (input.action !== 'train') throw new Error('Training must be explicitly completed before daily inference')
      const experiment = researchExperiment(snapshot.candles), artifactHash = await sha256(canonicalJson(experiment.fittedFinal))
      const modelPayload = { code: 'K-BTC-24H', version: BTC24_VERSION, asset_class: 'crypto', status: 'experimental', methodology: { target: experiment.target, features: experiment.features, fitted: experiment.fittedFinal, artifact_hash: artifactHash, snapshot_id: snapshotId, snapshot_hash: snapshotHash, train: experiment.train, validation: experiment.validation, gate: experiment.gate, protocol: 'research/btc24/README.md' }, feature_weights: Object.fromEntries(experiment.features.map((name, i) => [name, experiment.fittedFinal.coefficients[i + 1]])), notes: 'Fitted logistic baseline. Chronological simulation is not forward validation. Private and experimental; no trading recommendation.' }
      const cost = experiment.test.strategies[0].model
      const backtestPayload = { universe: 'BTC-USD / Coinbase / next complete UTC day', period_start: experiment.test.periodStart.slice(0, 10), period_end: experiment.test.periodEnd.slice(0, 10), train_end: experiment.train.last.slice(0, 10), observations: experiment.test.rows.length, hit_rate: experiment.test.model.hitRate * 100, precision_score: experiment.test.model.precision, brier_score: experiment.test.model.brier, avg_return_pct: cost.averageDayReturnPct, max_drawdown_pct: cost.maxDrawdownPct, assumptions: { protocol: 'btc24-v1', snapshot_id: snapshotId, snapshot_hash: snapshotHash, artifact_hash: artifactHash, cutoff: snapshot.fetchedAt, vintage: snapshot.vintage, daily_input_gap_hours: 24, target_hours: 24, costs_bps_per_side: [10, 25, 50], long_probability_threshold: .55, fitted_parameters_frozen: true, simulated: true }, results: experiment }
      const saved = await db.rpc('store_btc24_training', { model_json: modelPayload, backtest_json: backtestPayload })
      if (saved.error) throw new Error('Atomic training persistence failed: ' + saved.error.message)
      model = { id: saved.data, methodology: modelPayload.methodology }
    }
    const evidence = await db.from('backtest_runs').select('id').eq('model_version_id', model.id).limit(1).maybeSingle()
    if (evidence.error || !evidence.data) throw new Error('Model has no stored backtest; inference blocked')
    // Resolve only already-frozen calls whose exact target day is fully complete.
    const pending = await db.from('signal_predictions').select('id,probability,features').eq('model_version_id', model.id).eq('status', 'open').order('source_as_of').limit(120)
    if (pending.error) throw new Error('Forward ledger lookup failed')
    let resolved = 0
    for (const p of pending.data ?? []) {
      const start = Date.parse(p.features.window_start) / 1000, end = Date.parse(p.features.window_end) / 1000
      if (end > now) continue
      const candle = snapshot.candles.find(c => c[0] === start)
      if (!candle || end !== start + DAY) continue
      const move = (candle[4] / candle[3] - 1) * 100
      const outcome = await db.from('signal_outcomes').insert({ prediction_id: p.id, realized_move_pct: move, hit: (Number(p.probability) >= .5) === (move > 0), resolution_price: candle[4], resolved_at: iso(end), notes: JSON.stringify({ provider: snapshot.provider, source_url: snapshot.sourceUrl, snapshot_id: snapshotId, snapshot_hash: snapshotHash, candle }) })
      if (outcome.error && outcome.error.code !== '23505') throw new Error('Outcome storage failed: ' + outcome.error.message)
      const updated = await db.from('signal_predictions').update({ status: 'resolved' }).eq('id', p.id).eq('status', 'open')
      if (updated.error) throw new Error('Outcome status update failed')
      resolved++
    }
    const fitted = model.methodology.fitted as FittedModel
    if (await sha256(canonicalJson(fitted)) !== model.methodology.artifact_hash) throw new Error('Frozen model checksum mismatch')
    const forecast = nextForecast(snapshot.candles, fitted, Date.now() / 1000)
    const prediction = await db.from('signal_predictions').insert({ model_version_id: model.id, symbol: 'BTC-USD', asset_class: 'crypto', direction: forecast.probability >= .5 ? 'bullish' : 'bearish', horizon_hours: 24, probability: forecast.probability, opportunity_score: 0, expected_move_pct: null, invalidation_text: 'Unvalidated research: abstain from model-driven trading. Missing target source data leave outcome unresolved.', source_as_of: forecast.sourceAsOf, features: { protocol: 'btc24-v1', window_start: forecast.windowStart, window_end: forecast.windowEnd, snapshot_id: snapshotId, snapshot_hash: snapshotHash, artifact_hash: model.methodology.artifact_hash, x: forecast.features, probability_definition: forecast.probabilityDefinition, baseline_probability: fitted.prior, trade_action: forecast.tradeAction } }).select('id').single()
    if (prediction.error && prediction.error.code !== '23505') throw new Error('Forward freeze failed: ' + prediction.error.message)
    return json({ ok: true, modelId: model.id, backtestId: evidence.data.id, snapshotId, snapshotHash, observations: snapshot.candles.length, predictionsCreated: prediction.data ? 1 : 0, predictionId: prediction.data?.id ?? null, resolved, windowStart: forecast.windowStart, windowEnd: forecast.windowEnd, gate: model.methodology.gate, published: 0, emailsSent: 0 })
  } catch (error) { return json({ ok: false, error: error instanceof Error ? error.message : 'BTC research failed' }, 503) }
})
