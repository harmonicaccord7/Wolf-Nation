import { NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase/server'

export const dynamic = 'force-dynamic'

type ProviderRow={slug:string;enabled:boolean;last_success_at:string|null;last_error_at:string|null}
function ageMinutes(iso:string|null){return iso?Math.round((Date.now()-Date.parse(iso))/60000):null}

export async function GET(){
  const checkedAt=new Date().toISOString()
  try{
    const supabase=await createClient()
    const [{data:market,error:marketError},{data:providers,error:providerError},{data:runs,error:runError}]=await Promise.all([
      supabase.from('market_snapshots').select('captured_at').order('captured_at',{ascending:false}).limit(1).maybeSingle(),
      supabase.from('data_providers').select('slug,enabled,last_success_at,last_error_at').eq('enabled',true).order('slug'),
      supabase.from('ingestion_runs').select('job_type,status,rows_written,completed_at,started_at').order('started_at',{ascending:false}).limit(30)
    ])
    if(marketError)throw marketError
    if(providerError)throw providerError
    if(runError)throw runError

    const asOf=market?.captured_at??null,marketAge=ageMinutes(asOf),marketFeed=marketAge==null?'empty':marketAge<=20?'fresh':'stale'
    const latestByJob=new Map<string,any>()
    for(const r of runs??[])if(!latestByJob.has(r.job_type))latestByJob.set(r.job_type,r)
    const providerStatus=(providers as ProviderRow[]??[]).map(p=>{
      const age=ageMinutes(p.last_success_at),errored=Boolean(p.last_error_at&&(!p.last_success_at||Date.parse(p.last_error_at)>Date.parse(p.last_success_at)))
      return {provider:p.slug,status:errored?'error':age==null?'pending':age>24*60?'stale':'ok',lastSuccessAt:p.last_success_at,lastErrorAt:p.last_error_at,ageMinutes:age}
    })
    const coreJobs=['live_intelligence_fast','live_intelligence_full','history_backfill']
    const jobs=coreJobs.map(job=>{const r=latestByJob.get(job);return {job,status:r?.status??'missing',rowsWritten:r?.rows_written??0,completedAt:r?.completed_at??null}})
    const criticalProviderErrors=providerStatus.filter(p=>p.status==='error'&&p.provider!=='bitbo').length
    const coreJobFailure=jobs.some(j=>j.status==='failed')
    const status=marketFeed==='fresh'&&!criticalProviderErrors&&!coreJobFailure?'ok':'degraded'

    return NextResponse.json({status,application:'kaporal-intelligence',database:'connected',marketFeed,marketAsOf:asOf,marketAgeMinutes:marketAge,providers:providerStatus,jobs,knownExternalDependencies:{bitcoinEtfFlow:providerStatus.find(p=>p.provider==='bitbo')?.status==='error'?'credential-required':'available'},checkedAt},{status:status==='ok'?200:503,headers:{'Cache-Control':'no-store'}})
  }catch{
    return NextResponse.json({status:'degraded',application:'kaporal-intelligence',database:'unavailable',marketFeed:'unknown',checkedAt},{status:503,headers:{'Cache-Control':'no-store'}})
  }
}
