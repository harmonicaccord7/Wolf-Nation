import type { SupabaseClient } from '@supabase/supabase-js'
import type { ModelSnapshot } from './modules.ts'
const codes = ['CPI_US','DXY','US10Y','NGA_INFLATION','CMR_INFLATION']
export async function loadModelSnapshot(db: SupabaseClient, cutoff: string) {
  const { data: definitions, error } = await db.from('data_series').select('id,code,unit,frequency,source_url').eq('is_public',true).in('code',codes)
  if (error) throw new Error('Source definitions unavailable')
  const snapshot: ModelSnapshot = {}
  await Promise.all((definitions??[]).map(async definition => {
    const {data,error}=await db.from('data_points').select('observed_at,value,provider,ingested_at').eq('series_id',definition.id).lte('observed_at',cutoff).lte('ingested_at',cutoff).order('observed_at',{ascending:false}).limit(120)
    if(error)throw new Error('Source query failed: '+definition.code)
    snapshot[definition.code]=(data??[]).filter(p=>p.value!==null).map(p=>({observedAt:p.observed_at,value:Number(p.value),provider:p.provider,ingestedAt:p.ingested_at})).reverse()
  }))
  const btc=[]
  let truncated=false
  for(let offset=0;offset<10000;offset+=1000){
    const {data,error}=await db.from('market_snapshots').select('price,captured_at,provider').eq('symbol','BTC').gte('captured_at',new Date(Date.parse(cutoff)-90*86400000).toISOString()).lte('captured_at',cutoff).order('captured_at',{ascending:false}).range(offset,offset+999)
    if(error)throw new Error('BTC source query failed')
    btc.push(...(data??[])); if((data??[]).length<1000)break;if(offset===9000)truncated=true
  }
  snapshot.BTC=btc.filter(p=>p.price!==null).map(p=>({observedAt:p.captured_at,value:Number(p.price),provider:p.provider})).reverse()
  return {series:Object.fromEntries(Object.entries(snapshot).sort(([a],[b])=>a.localeCompare(b))),definitions,truncated}
}
