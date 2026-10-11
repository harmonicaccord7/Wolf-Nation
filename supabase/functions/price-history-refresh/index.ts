import {createClient} from 'npm:@supabase/supabase-js@2.112.3'
import {PRICE_DAY,priceProducts,dailyPricePoints,fetchDailyPrices} from '../../../lib/data/price-history.ts'
import {canonicalJson} from '../../../lib/models/modules.ts'
import {sha256} from '../../../lib/models/btc24-history.ts'
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store'}})
Deno.serve(async request=>{
  if(request.method!=='POST')return json({error:'POST required'},405)
  const key=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')??'{}').default??Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const db=createClient(Deno.env.get('SUPABASE_URL')!,key,{auth:{persistSession:false}})
  const authorization=await db.rpc('authorize_workspace_refresh',{token_input:request.headers.get('x-kaporal-job-token')??''})
  if(authorization.error||!authorization.data)return json({error:'Unauthorized'},401)
  const started_at=new Date().toISOString(),end=Math.floor(Date.now()/1000/PRICE_DAY)*PRICE_DAY
  const run=await db.from('ingestion_runs').insert({job_type:'price_history',status:'running',started_at}).select('id').single()
  if(run.error)return json({error:'Audit run unavailable'},503)
  const results:{product:string;rows:number;status:string;error?:string}[]=[]
  async function storeRows(id:string,points:ReturnType<typeof dailyPricePoints>){
    for(let i=0;i<points.length;i+=500){const r=await db.from('data_points').upsert(points.slice(i,i+500).map(p=>({...p,series_id:id})),{onConflict:'series_id,observed_at',ignoreDuplicates:true});if(r.error)throw new Error('Price persistence failed')}
  }
  for(const product of priceProducts){
    try{
      const series=await db.from('data_series').select('id').eq('code',product.slice(0,-4)+'_DAILY').eq('is_public',true).maybeSingle()
      if(series.error||!series.data)throw new Error('Public daily series unavailable')
      let projected=0
      if(product==='BTC-USD'){
        const snapshot=await db.from('model_runs').select('input_snapshot').eq('module_code','btc24-history').order('as_of',{ascending:false}).limit(1).maybeSingle()
        if(snapshot.error)throw new Error('Stored history lookup failed')
        const input=snapshot.data?.input_snapshot
        if(input){
          if(input.provider!=='Coinbase Exchange'||input.product!==product||await sha256(canonicalJson(input.candles))!==input.hash)throw new Error('Stored market-history checksum failed')
          const points=dailyPricePoints(input.candles,product,end,{fetched_at:input.fetchedAt,market_history_sha256:input.hash})
          await storeRows(series.data.id,points);projected=points.length
        }
      }
      const first=await db.from('data_points').select('observed_at').eq('series_id',series.data.id).order('observed_at').limit(1).maybeSingle()
      const last=await db.from('data_points').select('observed_at').eq('series_id',series.data.id).order('observed_at',{ascending:false}).limit(1).maybeSingle()
      if(first.error||last.error)throw new Error('Price coverage lookup failed')
      const beginning=Date.parse(product==='SOL-USD'?'2020-01-01T00:00:00Z':'2016-01-01T00:00:00Z')/1000
      const firstStart=first.data?Date.parse(first.data.observed_at)/1000-PRICE_DAY:null
      const points=[]
      // Backfill once; the immutable market projection avoids downloading BTC again.
      if(firstStart!==null&&firstStart>beginning){
        const checked=await db.from('data_series').select('metadata').eq('id',series.data.id).single()
        if(checked.error)throw new Error('Coverage metadata unavailable')
        if(checked.data.metadata?.history_requested_from!==new Date(beginning*1000).toISOString())points.push(...await fetchDailyPrices(product,beginning,firstStart))
      }
      const from=last.data?Date.parse(last.data.observed_at)/1000:beginning
      if(from<end)points.push(...await fetchDailyPrices(product,from,end))
      await storeRows(series.data.id,points)
      const meta=await db.from('data_series').select('metadata').eq('id',series.data.id).single()
      if(meta.error)throw new Error('Coverage metadata unavailable')
      const saved=await db.from('data_series').update({metadata:{...meta.data.metadata,history_requested_from:new Date(beginning*1000).toISOString(),history_checked_at:new Date().toISOString()}}).eq('id',series.data.id)
      if(saved.error)throw new Error('Coverage metadata persistence failed')
      results.push({product,rows:projected+points.length,status:'success'})
    }catch(error){results.push({product,rows:0,status:'failed',error:error instanceof Error?error.message:'Price history failed'})}
  }
  const ok=results.every(r=>r.status==='success'),completed_at=new Date().toISOString()
  const audit=await db.from('ingestion_runs').update({status:ok?'success':'failed',completed_at,rows_written:results.reduce((sum,r)=>sum+r.rows,0),message:JSON.stringify(results)}).eq('id',run.data.id)
  return json({ok:ok&&!audit.error,results,predictionsPublished:0,emailsSent:0},ok&&!audit.error?200:503)
})
