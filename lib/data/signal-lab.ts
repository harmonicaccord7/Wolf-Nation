import { createClient } from '../supabase/server'
import { readCompleteLedger } from './complete-ledger'
import { evaluateBtc24Forward } from '../models/btc24-forward'

export async function getSignalLab(requestedModelId?: string){
  const supabase=await createClient()
  const {data:claimsData}=await supabase.auth.getClaims()
  const userId=claimsData?.claims?.sub
  if(!userId) return {authorized:false as const}
  const {data:profile}=await supabase.from('profiles').select('id,role,display_name').eq('id',userId).maybeSingle()
  if(!profile||!['researcher','editor','admin'].includes(profile.role)) return {authorized:false as const}

  const asOf = new Date().toISOString()
  const modelsLedger = await readCompleteLedger((from, to) => supabase.from('signal_model_versions')
    .select('id,code,version,asset_class,status,methodology,feature_weights,notes,created_at', { count: 'exact' })
    .lte('created_at', asOf).order('created_at', { ascending: false }).order('id', { ascending: false }).range(from, to))
  const models = modelsLedger.rows
  const model = requestedModelId ? models.find(m => m.id === requestedModelId)
    : models.find(m => m.code === 'K-BTC-24H') ?? models.find(m => m.code === 'K-EDGE') ?? models[0]
  const errors: string[] = []
  if (modelsLedger.error) errors.push(modelsLedger.error)
  if (requestedModelId && !model) errors.push('The requested model version is unavailable. No substitute version has been evaluated.')
  const [predictionsLedger, backtestResult] = await Promise.all([
    model ? readCompleteLedger((from, to) => supabase.from('signal_predictions')
    .select('id,model_version_id,symbol,asset_class,direction,horizon_hours,probability,opportunity_score,expected_move_pct,invalidation_text,features,source_as_of,status,created_at,outcomes:signal_outcomes(id,prediction_id,realized_move_pct,hit,resolution_price,resolved_at,notes,created_at)', { count: 'exact' })
    .eq('model_version_id', model.id).lte('created_at', asOf)
    .order('created_at', { ascending: true }).order('id', { ascending: true }).range(from, to))
      : { rows: [], expected: null, complete: false, error: null },
    // Historical simulations remain separate from the prospective ledger.
    model ? supabase.from('backtest_runs')
    .select('id,model_version_id,universe,period_start,period_end,train_end,observations,hit_rate,precision_score,brier_score,avg_return_pct,max_drawdown_pct,assumptions,evaluation:results->test->model,benchmark:results->test->baseline,uncertainty:results->test->brierDifference,active_days:results->test->strategies->0->model->activeDays,created_at')
    .eq('model_version_id', model.id).lte('created_at', asOf).order('created_at', { ascending: false }).order('id', { ascending: false }).limit(30)
      : { data: [], error: null },
  ])
  if (predictionsLedger.error) errors.push(predictionsLedger.error)
  const complete = modelsLedger.complete && predictionsLedger.complete
  const forward = model?.code === 'K-BTC-24H' ? await evaluateBtc24Forward(model, predictionsLedger.rows, asOf, complete) : null
  if (backtestResult.error) errors.push('Historical simulations could not be read. No empty-history claim is made.')
  return { authorized: true as const, profile, models, model, asOf, errors, complete, forward,
    forecastCount: predictionsLedger.rows.length, expectedCount: predictionsLedger.expected,
    // Only the table preview is limited. Every fetched row contributes to the audit.
    predictions: predictionsLedger.rows.slice(-50).reverse(), backtests: backtestResult.data ?? [] }
}
