import { createClient } from '../../../../lib/supabase/server'
import { reply } from '../../../../lib/studio-access'
import { scenarioColumns } from '../../../../lib/data/decision-scenarios'
import { parseScenarioDraft,savedScenario,scenarioId,SCENARIO_LIMIT } from '../../../../lib/tools/decision-scenarios'
export const dynamic='force-dynamic'
export const revalidate=0
const sameOrigin=(r:Request)=>!r.headers.get('origin')||r.headers.get('origin')===new URL(r.url).origin
async function body(r:Request):Promise<unknown>{
  if(Number(r.headers.get('content-length'))>4096)return null
  const text=await r.text().catch(()=>'')
  if(text.length>4096)return null
  try{return JSON.parse(text)}catch{return null}
}
export async function GET(){
  const db=await createClient(),{data:{user}}=await db.auth.getUser()
  if(!user)return reply({error:'Authentication required'},401)
  const {data,error}=await db.from('decision_scenarios').select(scenarioColumns).eq('profile_id',user.id).order('created_at',{ascending:false}).limit(SCENARIO_LIMIT)
  if(error)return reply({error:'Saved scenarios are temporarily unavailable.'},503)
  const parsed=(data??[]).map(savedScenario)
  if(parsed.some(row=>row===null))return reply({error:'A saved scenario could not be read safely. Your records are unchanged.'},503)
  return reply({scenarios:parsed})
}
export async function POST(request:Request){
  const db=await createClient(),{data:{user}}=await db.auth.getUser()
  if(!user)return reply({error:'Authentication required'},401)
  if(!sameOrigin(request))return reply({error:'Use this website to save a scenario.'},403)
  const draft=parseScenarioDraft(await body(request))
  if(!draft)return reply({error:'Provide a name and valid scenario assumptions.'},400)
  const inserted=await db.from('decision_scenarios').insert({profile_id:user.id,save_key:draft.saveKey,name:draft.name,asset:draft.asset,inputs:draft.inputs,reference_at:draft.referenceAt,reference_price:draft.referencePrice,reference_provider:draft.referenceProvider}).select(scenarioColumns).single()
  if(inserted.error?.code==='23505'){
    const existing=await db.from('decision_scenarios').select(scenarioColumns+',reference_at').eq('profile_id',user.id).eq('save_key',draft.saveKey).maybeSingle()
    const row=existing.data,parsed=savedScenario(row)
    const same=row&&parsed&&parsed.name===draft.name&&parsed.asset===draft.asset&&Object.keys(draft.inputs).every(k=>parsed.inputs[k as keyof typeof draft.inputs]===draft.inputs[k as keyof typeof draft.inputs])&&(parsed.reference?.price??null)===draft.referencePrice&&(parsed.reference?.provider??null)===draft.referenceProvider&&(row.reference_at===null?draft.referenceAt===null:draft.referenceAt!==null&&Date.parse(row.reference_at)===Date.parse(draft.referenceAt))
    return same?reply({scenario:parsed}):reply({error:'This save request changed. Save a new copy.'},409)
  }
  if(inserted.error?.message?.includes('scenario_limit'))return reply({error:'You can keep '+SCENARIO_LIMIT+' saved scenarios. Delete one before saving another.'},409)
  if(inserted.error?.message?.includes('reference_unavailable'))return reply({error:'The original reference cannot be verified. Load the latest stored reference, or choose a custom asset to save manual assumptions.'},409)
  const parsed=savedScenario(inserted.data)
  return inserted.error||!parsed?reply({error:'The scenario could not be saved.'},503):reply({scenario:parsed},201)
}
export async function DELETE(request:Request){
  const db=await createClient(),{data:{user}}=await db.auth.getUser()
  if(!user)return reply({error:'Authentication required'},401)
  if(!sameOrigin(request))return reply({error:'Use this website to remove a scenario.'},403)
  const value=await body(request)
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==1||!scenarioId((value as Record<string,unknown>).id))return reply({error:'Valid scenario id required.'},400)
  const {data,error}=await db.from('decision_scenarios').delete().eq('id',(value as {id:string}).id).eq('profile_id',user.id).select('id')
  return error?reply({error:'Could not remove the saved scenario.'},503):data?.length?reply({ok:true}):reply({error:'Saved scenario not available.'},404)
}
