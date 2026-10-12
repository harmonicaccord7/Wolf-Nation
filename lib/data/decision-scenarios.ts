import { createClient } from '../supabase/server'
import { savedScenario,scenarioId,SCENARIO_LIMIT } from '../tools/decision-scenarios'
export const scenarioColumns='id,name,asset,inputs,reference,calculation_version,created_at'
export async function getSavedScenarios(requestedId?:string){
  const db=await createClient(),{data:{user}}=await db.auth.getUser()
  if(!user)return {authenticated:false as const,scenarios:[],error:null}
  if(requestedId&&!scenarioId(requestedId))return {authenticated:true as const,scenarios:[],error:'Saved scenario not available.'}
  let query=db.from('decision_scenarios').select(scenarioColumns).eq('profile_id',user.id).order('created_at',{ascending:false}).limit(SCENARIO_LIMIT)
  if(requestedId)query=query.eq('id',requestedId)
  const {data,error}=await query
  if(error)return {authenticated:true as const,scenarios:[],error:'Saved scenarios are temporarily unavailable.'}
  const parsed=(data??[]).map(savedScenario)
  if(parsed.some(row=>row===null))return {authenticated:true as const,scenarios:[],error:'A saved scenario could not be read safely. Your records are unchanged.'}
  if(requestedId&&!parsed.length)return {authenticated:true as const,scenarios:[],error:'Saved scenario not available.'}
  return {authenticated:true as const,scenarios:parsed.filter(row=>row!==null),error:null}
}
