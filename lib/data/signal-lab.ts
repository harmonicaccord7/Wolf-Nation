import { createClient } from '../supabase/server'

export async function getSignalLab(){
  const supabase=await createClient()
  const {data:claimsData}=await supabase.auth.getClaims()
  const userId=claimsData?.claims?.sub
  if(!userId) return {authorized:false as const}
  const {data:profile}=await supabase.from('profiles').select('id,role,display_name').eq('id',userId).maybeSingle()
  if(!profile||!['researcher','editor','admin'].includes(profile.role)) return {authorized:false as const}

  const [{data:models},{data:predictions},{data:outcomes},{data:backtests}]=await Promise.all([
    supabase.from('signal_model_versions').select('id,code,version,asset_class,status,methodology,feature_weights,notes,created_at').order('created_at',{ascending:false}).limit(20),
    supabase.from('signal_predictions').select('id,model_version_id,symbol,asset_class,direction,horizon_hours,probability,opportunity_score,expected_move_pct,invalidation_text,features,source_as_of,status,created_at').order('source_as_of',{ascending:false}).limit(50),
    supabase.from('signal_outcomes').select('id,prediction_id,realized_move_pct,hit,resolution_price,resolved_at,notes,created_at').order('resolved_at',{ascending:false}).limit(50),
    supabase.from('backtest_runs').select('id,model_version_id,universe,period_start,period_end,train_end,observations,hit_rate,precision_score,brier_score,avg_return_pct,max_drawdown_pct,assumptions,results,created_at').order('created_at',{ascending:false}).limit(30)
  ])
  return {authorized:true as const,profile,models:models??[],predictions:predictions??[],outcomes:outcomes??[],backtests:backtests??[]}
}
