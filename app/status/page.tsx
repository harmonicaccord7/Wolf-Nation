import { Header } from '../../components/Header'
import { Footer } from '../../components/Footer'
import { createClient } from '../../lib/supabase/server'

export const dynamic='force-dynamic'
export const metadata={title:'System Status',description:'Operational status, data freshness and provider health for KAPORAL INTELLIGENCE.'}

type Provider={slug:string;name:string;enabled:boolean;last_success_at:string|null;last_error_at:string|null}
type Run={job_type:string;status:string;rows_written:number|null;started_at:string|null;completed_at:string|null;message:string|null}

function ageMinutes(iso:string|null){return iso?Math.max(0,Math.round((Date.now()-Date.parse(iso))/60000)):null}
function fmt(iso:string|null){return iso?new Intl.DateTimeFormat('en',{dateStyle:'medium',timeStyle:'short',timeZone:'UTC'}).format(new Date(iso))+' UTC':'Never'}
function providerState(p:Provider){const age=ageMinutes(p.last_success_at),latestError=Boolean(p.last_error_at&&(!p.last_success_at||Date.parse(p.last_error_at)>Date.parse(p.last_success_at)));if(latestError)return 'Degraded';if(age==null)return 'Pending';if(age>24*60)return 'Stale';return 'Operational'}

export default async function StatusPage(){
 const supabase=await createClient()
 const [{data:market},{data:providers},{data:runs},{count:points}]=await Promise.all([
  supabase.from('market_snapshots').select('captured_at').order('captured_at',{ascending:false}).limit(1).maybeSingle(),
  supabase.from('data_providers').select('slug,name,enabled,last_success_at,last_error_at').eq('enabled',true).order('name'),
  supabase.from('ingestion_runs').select('job_type,status,rows_written,started_at,completed_at,message').order('started_at',{ascending:false}).limit(40),
  supabase.from('data_points').select('id',{count:'exact',head:true})
 ])
 const marketAge=ageMinutes(market?.captured_at??null)
 const marketState=marketAge==null?'Pending':marketAge<=20?'Operational':'Stale'
 const latestByJob=new Map<string,Run>()
 for(const r of runs??[])if(!latestByJob.has(r.job_type))latestByJob.set(r.job_type,r as Run)
 const jobs=['live_intelligence_fast','live_intelligence_full','history_backfill'].map(name=>({name,run:latestByJob.get(name)}))
 const states=(providers as Provider[]??[]).map(p=>providerState(p))
 const degraded=marketState!=='Operational'||states.some(s=>s==='Degraded')||jobs.some(j=>j.run?.status==='failed')
 return <main className="intelligencePage"><Header/>
  <section className="deskHero"><div className="shell deskHeroGrid"><div><span className="eyebrow">OPERATIONAL TRANSPARENCY</span><h1>KAPORAL System Status</h1><p>Live health for the application data layer, scheduled ingestion and external providers. Provider outages are shown rather than replaced with synthetic values.</p></div><aside><small>CURRENT STATE</small><strong>{degraded?'DEGRADED':'OPERATIONAL'}</strong><span>Checked {fmt(new Date().toISOString())}</span></aside></div></section>
  <section className="shell liveSection">
   <div className="accountabilityStats"><article><small>MARKET FEED</small><strong>{marketState}</strong><span>{marketAge==null?'No observation yet':`${marketAge} min since latest snapshot`}</span></article><article><small>HISTORICAL POINTS</small><strong>{points??0}</strong><span>source-labelled observations stored</span></article><article><small>PROVIDERS</small><strong>{providers?.length??0}</strong><span>enabled external sources</span></article><article><small>LAST MARKET UPDATE</small><strong>{market?.captured_at?fmt(market.captured_at):'—'}</strong><span>UTC observation timestamp</span></article></div>
   <div className="liveSectionHead"><div><span className="eyebrow">PROVIDER HEALTH</span><h2>External data sources</h2></div></div>
   <div className="trackTable" role="table" aria-label="External provider status">{(providers as Provider[]??[]).map(p=><article className="trackRow" key={p.slug}><div><small>STATUS</small><b>{providerState(p)}</b></div><div className="trackStatement"><strong>{p.name}</strong><p>{p.slug}</p><small>Last successful ingestion: {fmt(p.last_success_at)}</small></div><div><small>LAST ERROR</small><b>{p.last_error_at?fmt(p.last_error_at):'None recorded'}</b></div></article>)}</div>
   <div className="liveSectionHead"><div><span className="eyebrow">AUTOMATION</span><h2>Scheduled ingestion jobs</h2></div></div>
   <div className="trackTable" role="table" aria-label="Ingestion job status">{jobs.map(({name,run})=><article className="trackRow" key={name}><div><small>STATUS</small><b>{run?.status??'Missing'}</b></div><div className="trackStatement"><strong>{name.replaceAll('_',' ')}</strong><p>{run?`${run.rows_written??0} rows written in latest run`:'No run recorded yet.'}</p><small>Completed: {fmt(run?.completed_at??null)}</small></div><div><small>DETAIL</small><b>{run?.status==='failed'?'Needs attention':'Tracked'}</b></div></article>)}</div>
   <div className="emptyResearch"><strong>Known external dependencies</strong><p>Bitcoin ETF flow enrichment requires an authorized provider credential. Newsletter email delivery requires a configured transactional email provider and verified sending domain. The target custom domain is <b>www.kaporalintelligence.com</b> and must be purchased and attached before it can become the canonical live hostname.</p></div>
  </section><Footer/></main>
}
