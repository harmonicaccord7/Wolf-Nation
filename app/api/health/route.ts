import { NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase/server'

export const dynamic='force-dynamic'
function freshness(value:string|null,maxAgeMs:number){if(!value)return'empty';const age=Date.now()-Date.parse(value);return age<=maxAgeMs?'fresh':'stale'}

export async function GET(){
 const checkedAt=new Date().toISOString()
 try{
  const supabase=await createClient()
  const [marketResult,ingestionResult,providerResult,articleResult]=await Promise.all([
   supabase.from('market_snapshots').select('captured_at,provider').order('captured_at',{ascending:false}).limit(1).maybeSingle(),
   supabase.from('ingestion_runs').select('job_type,status,rows_written,completed_at').eq('status','success').order('completed_at',{ascending:false}).limit(1).maybeSingle(),
   supabase.from('data_providers').select('slug,enabled,last_success_at,last_error_at').eq('enabled',true),
   supabase.from('articles').select('id',{count:'exact',head:true}).eq('status','published').lte('published_at',checkedAt)
  ])
  if(marketResult.error)throw marketResult.error
  const marketAsOf=marketResult.data?.captured_at??null;const ingestionAsOf=ingestionResult.data?.completed_at??null
  return NextResponse.json({status:'ok',application:'kaporal-intelligence',canonicalHost:'www.kaporalintelligence.com',database:'connected',marketFeed:freshness(marketAsOf,20*60*1000),marketAsOf,marketProvider:marketResult.data?.provider??null,intelligenceIngestion:freshness(ingestionAsOf,8*60*60*1000),intelligenceIngestionAsOf:ingestionAsOf,lastIngestionJob:ingestionResult.data?.job_type??null,lastRowsWritten:ingestionResult.data?.rows_written??null,enabledProviders:providerResult.data?.length??0,publishedResearch:articleResult.count??0,checkedAt},{headers:{'Cache-Control':'no-store'}})
 }catch{
  return NextResponse.json({status:'degraded',application:'kaporal-intelligence',database:'unavailable',marketFeed:'unknown',intelligenceIngestion:'unknown',checkedAt},{status:503,headers:{'Cache-Control':'no-store'}})
 }
}
