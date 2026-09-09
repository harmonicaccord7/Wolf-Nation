import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";

const H={"Content-Type":"application/json","Cache-Control":"no-store"};
const UA="KaporalIntelligence/1.0 ETF-Flow-Research (+https://www.kaporalintelligence.com)";
const PARSER_VERSION="issuer-primary-v2";

type Candidate={ticker:string;issuer:string;asOf:string;nav:number;shares:number;aum:number;sourceUrl:string;metadata:Record<string,unknown>};
type Adapter={ticker:string;run:()=>Promise<Candidate>};
type Result={ticker:string;ok:boolean;asOf?:string;flowForDate?:string;flowUsd?:number|null;error?:string};

function envJson(name:string){try{return JSON.parse(Deno.env.get(name)??"{}")}catch{return{}}}
function authorized(req:Request){const key=req.headers.get("apikey");if(!key)return false;return [...Object.values(envJson("SUPABASE_PUBLISHABLE_KEYS")),...Object.values(envJson("SUPABASE_SECRET_KEYS"))].includes(key)}
function num(v:string|number|undefined|null){if(v==null)return null;const x=Number(String(v).replace(/[$,%\s,]/g,""));return Number.isFinite(x)?x:null}
function clean(html:string){return html.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/&nbsp;|&#160;/gi," ").replace(/&amp;/gi,"&").replace(/&#39;|&apos;/gi,"'").replace(/&quot;/gi,'"').replace(/\s+/g," ").trim()}
function isoDate(s:string){const m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);if(m)return `${m[3]}-${m[1].padStart(2,"0")}-${m[2].padStart(2,"0")}`;const d=new Date(`${s} 12:00:00 UTC`);return Number.isNaN(d.getTime())?null:d.toISOString().slice(0,10)}
function recentEnough(date:string){return Date.now()-Date.parse(`${date}T12:00:00Z`) < 14*864e5}
async function fetchText(url:string,accept="text/plain,text/csv,text/html,*/*"){const c=new AbortController(),t=setTimeout(()=>c.abort(),18000);try{const r=await fetch(url,{headers:{accept,'user-agent':UA},signal:c.signal,redirect:'follow'});if(!r.ok)throw Error(`HTTP ${r.status}`);return await r.text()}finally{clearTimeout(t)}}
function requireCandidate(c:Candidate){if(!c.asOf||!recentEnough(c.asOf))throw Error(`stale or invalid source date ${c.asOf}`);if(!(c.nav>0)||!(c.shares>0)||!(c.aum>0))throw Error('missing NAV, shares or AUM');return c}
function csvRow(line:string){const out:string[]=[];let cur='',q=false;for(let i=0;i<line.length;i++){const ch=line[i];if(ch==='"'){if(q&&line[i+1]==='"'){cur+='"';i++}else q=!q}else if(ch===','&&!q){out.push(cur);cur=''}else cur+=ch}out.push(cur);return out.map(x=>x.trim())}

async function ibit():Promise<Candidate>{
  const url='https://www.blackrock.com/us/individual/products/333011/ishares-bitcoin-trust-etf/latest-holdings.csv';
  const raw=await fetchText(url,'text/csv,text/plain,*/*'),lines=raw.split(/\r?\n/).filter(Boolean);
  const dateLine=lines.find(x=>/^Fund Holdings as of,/i.test(x)),sharesLine=lines.find(x=>/^Shares Outstanding,/i.test(x));
  if(!dateLine||!sharesLine)throw Error('IBIT CSV header fields not found');
  const dateText=csvRow(dateLine)[1],shares=num(csvRow(sharesLine)[1]);
  const headerIndex=lines.findIndex(x=>/^Ticker,Name,Sector,Asset Class,Market Value/i.test(x));
  if(headerIndex<0||!shares)throw Error('IBIT CSV holdings header not found');
  const header=csvRow(lines[headerIndex]),mvIndex=header.findIndex(x=>x.toLowerCase()==='market value');
  let aum=0;for(const line of lines.slice(headerIndex+1)){const row=csvRow(line);if(row.length<=mvIndex)continue;const mv=num(row[mvIndex]);if(mv!=null)aum+=mv}
  const asOf=isoDate(dateText);if(!asOf||aum<=0)throw Error('IBIT CSV values invalid');
  return requireCandidate({ticker:'IBIT',issuer:'BlackRock / iShares',asOf,nav:aum/shares,shares,aum,sourceUrl:url,metadata:{shares_exact:true,nav_derived_from_holdings_market_value:true,format:'official_csv'}})
}

async function bitb():Promise<Candidate>{
  const url='https://bitbetf.com/',t=clean(await fetchText(url,'text/html,*/*'));
  const dm=t.match(/Data as of\s+(\d{1,2}\/\d{1,2}\/\d{4})/i),sm=t.match(/Shares Outstanding\s+([\d,]+)/i),am=t.match(/Net Assets \(AUM\)\s+\$([\d,]+)/i),nm=t.match(/NAV:\s*\$([\d,.]+)/i);
  if(!dm||!sm||!nm)throw Error('BITB fields not found');const shares=num(sm[1])!,nav=num(nm[1])!,aum=am?num(am[1])!:shares*nav;
  return requireCandidate({ticker:'BITB',issuer:'Bitwise',asOf:isoDate(dm[1])!,nav,shares,aum,sourceUrl:url,metadata:{shares_exact:true,format:'issuer_public_page'}})
}

async function arkb():Promise<Candidate>{
  const url='https://www.21shares.com/en-us/products-us/arkb',t=clean(await fetchText(url,'text/html,*/*'));
  const dates=[...t.matchAll(/(?:Value as of|As of)\s+([A-Za-z]{3,9}\s+\d{1,2},\s+\d{4})/gi)],sm=t.match(/SHARES OUTSTANDING\s+([\d,]+)/i),nm=t.match(/Nav per unit\s+\$\s*([\d,.]+)/i),am=t.match(/Aum\s+\$\s*([\d,.]+)/i);
  if(!dates.length||!sm||!nm||!am)throw Error('ARKB fields not found');const shares=num(sm[1])!,nav=num(nm[1])!,aum=num(am[1])!,asOf=isoDate(dates[0][1])!;
  return requireCandidate({ticker:'ARKB',issuer:'21Shares / ARK',asOf,nav,shares,aum,sourceUrl:url,metadata:{shares_exact:true,format:'issuer_public_page'}})
}

const adapters:Adapter[]=[{ticker:'IBIT',run:ibit},{ticker:'BITB',run:bitb},{ticker:'ARKB',run:arkb}];

Deno.serve(async(req:Request)=>{
  if(req.method!=="POST")return new Response(JSON.stringify({error:'POST required'}),{status:405,headers:H});
  if(!authorized(req))return new Response(JSON.stringify({error:'Unauthorized'}),{status:401,headers:H});
  const url=Deno.env.get('SUPABASE_URL')!,secret=envJson('SUPABASE_SECRET_KEYS').default??Deno.env.get('SUPABASE_SECRET_KEY')??Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!secret)return new Response(JSON.stringify({error:'Service credential unavailable'}),{status:500,headers:H});
  const db=createClient(url,secret,{auth:{persistSession:false}}),started=new Date().toISOString();
  const {data:provider}=await db.from('data_providers').select('id').eq('slug','kaporal-etf-primary').single();
  const {data:run}=await db.from('ingestion_runs').insert({provider_id:provider?.id??null,job_type:'kaporal_etf_flow',status:'running',started_at:started}).select('id').single();
  const results:Result[]=[],flowDates=new Set<string>();
  try{
    for(const adapter of adapters){
      try{
        const c=await adapter.run();
        const {data:prev}=await db.from('etf_fund_snapshots').select('as_of,nav_usd,shares_outstanding,aum_usd').eq('ticker',c.ticker).lt('as_of',c.asOf).order('as_of',{ascending:false}).limit(1).maybeSingle();
        let flowUsd:number|null=null,flowForDate:string|null=null,suspectedSplit=false;
        if(prev?.shares_outstanding&&prev?.nav_usd){const delta=c.shares-Number(prev.shares_outstanding),ratio=Math.abs(delta)/Number(prev.shares_outstanding);suspectedSplit=ratio>0.25;if(!suspectedSplit){flowUsd=delta*Number(prev.nav_usd);flowForDate=String(prev.as_of);flowDates.add(flowForDate)}}
        const row={ticker:c.ticker,issuer:c.issuer,as_of:c.asOf,nav_usd:c.nav,shares_outstanding:c.shares,aum_usd:c.aum,flow_usd:flowUsd,flow_for_date:flowForDate,source_url:c.sourceUrl,source_date_text:c.asOf,source_method:'issuer_primary_public_data',parser_version:PARSER_VERSION,metadata:{...c.metadata,previous_snapshot:prev??null,suspected_split:suspectedSplit,formula:'delta shares x prior snapshot NAV',settlement_lag:'T+1 attribution'}};
        const {error}=await db.from('etf_fund_snapshots').upsert(row,{onConflict:'ticker,as_of'});if(error)throw Error(error.message);
        results.push({ticker:c.ticker,ok:true,asOf:c.asOf,flowForDate:flowForDate??undefined,flowUsd});
      }catch(e){results.push({ticker:adapter.ticker,ok:false,error:e instanceof Error?e.message:String(e)})}
    }
    const {data:series}=await db.from('data_series').select('id,code').in('code',['BTC_ETF_FLOW','BTC_ETF_COVERED_AUM','BTC_ETF_FUNDS_COVERED']);
    const ids=new Map((series??[]).map((s:any)=>[s.code,s.id]));
    for(const d of flowDates){
      const {data:rows}=await db.from('etf_fund_snapshots').select('ticker,issuer,flow_usd,source_url,metadata').eq('flow_for_date',d).not('flow_usd','is',null);
      const valid=(rows??[]).filter((r:any)=>r.metadata?.suspected_split!==true),hasIbit=valid.some((r:any)=>r.ticker==='IBIT');
      if(valid.length<2||!hasIbit)continue;
      const total=valid.reduce((a:number,r:any)=>a+Number(r.flow_usd??0),0),coveredAum=valid.reduce((a:number,r:any)=>a+Number(r.metadata?.previous_snapshot?.aum_usd??0),0),tickers=valid.map((r:any)=>r.ticker);
      const points:any[]=[];
      if(ids.get('BTC_ETF_FLOW'))points.push({series_id:ids.get('BTC_ETF_FLOW'),observed_at:`${d}T00:00:00Z`,value:total/1e6,raw_value:String(total),provider:'KAPORAL Derived ETF Flow',metadata:{estimated:true,partial_coverage:true,method:'delta shares outstanding x prior business-day NAV',settlement_alignment:'T+1',funds_covered:tickers,fund_count:tickers.length,covered_aum_usd:coveredAum,source_urls:valid.map((r:any)=>r.source_url),validation_reference:'Farside manual QA only; not ingested'}});
      if(ids.get('BTC_ETF_COVERED_AUM'))points.push({series_id:ids.get('BTC_ETF_COVERED_AUM'),observed_at:`${d}T00:00:00Z`,value:coveredAum/1e9,raw_value:String(coveredAum),provider:'KAPORAL Derived ETF Flow',metadata:{funds_covered:tickers}});
      if(ids.get('BTC_ETF_FUNDS_COVERED'))points.push({series_id:ids.get('BTC_ETF_FUNDS_COVERED'),observed_at:`${d}T00:00:00Z`,value:tickers.length,raw_value:String(tickers.length),provider:'KAPORAL Derived ETF Flow',metadata:{funds_covered:tickers}});
      if(points.length){const {error}=await db.from('data_points').upsert(points,{onConflict:'series_id,observed_at'});if(error)throw Error(error.message)}
    }
    const done=new Date().toISOString(),ok=results.filter(r=>r.ok).length;if(run?.id)await db.from('ingestion_runs').update({status:'success',rows_written:ok,message:JSON.stringify(results),completed_at:done}).eq('id',run.id);if(provider?.id)await db.from('data_providers').update({last_success_at:done}).eq('id',provider.id);
    return new Response(JSON.stringify({ok:true,bootstrap:flowDates.size===0,sources_ok:ok,sources_total:adapters.length,flow_dates:[...flowDates],results,completedAt:done}),{headers:H});
  }catch(e){const message=e instanceof Error?e.message:String(e),done=new Date().toISOString();if(run?.id)await db.from('ingestion_runs').update({status:'failed',message,completed_at:done}).eq('id',run.id);if(provider?.id)await db.from('data_providers').update({last_error_at:done}).eq('id',provider.id);return new Response(JSON.stringify({ok:false,error:message,results}),{status:502,headers:H})}
});
