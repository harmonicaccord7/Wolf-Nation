import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import vm from 'node:vm'
import ts from 'typescript'
import {PGlite} from '@electric-sql/pglite'
import {PRICE_DAY,dailyPricePoints,fetchDailyPrices,fredHistoryRows} from '../lib/data/price-history.ts'
import * as chart from '../lib/data/chart.ts'
const require=createRequire(import.meta.url),start=Date.parse('2016-01-01T00:00:00Z')/1000
const candle=t=>[t,90,110,100,105,7]
const candles=Array.from({length:3700},(_,i)=>candle(start+i*PRICE_DAY))
const points=dailyPricePoints(candles,'BTC-USD',start+3699*PRICE_DAY,{fetched_at:'2026-10-11T00:00:00Z'})
assert.equal(points.length,3699);assert.equal(points[0].observed_at,'2016-01-02T00:00:00.000Z')
assert.equal(points[0].metadata.candle_start,'2016-01-01T00:00:00.000Z')
assert.equal(points[0].value,105);assert.equal(points[0].metadata.observation_kind,'daily_close')
assert.equal(dailyPricePoints([candle(start),candle(start)],'BTC-USD',start+PRICE_DAY).length,1)
assert.throws(()=>dailyPricePoints([candle(start),[start,90,110,100,106,7]],'BTC-USD',start+PRICE_DAY),/Conflicting/)
for(const bad of [[start,90,110,100,120,7],[start+1,90,110,100,105,7],[start,-1,110,100,105,7],[start,90,110,100,105,-1],[start,90,110,100,NaN,7]])assert.throws(()=>dailyPricePoints([bad],'BTC-USD',start+PRICE_DAY),/Invalid/)
assert.throws(()=>dailyPricePoints([], 'UNKNOWN',start),/Invalid/)
const requests=[]
const fetched=await fetchDailyPrices('ETH-USD',start,start+501*PRICE_DAY,async url=>{
  const from=Date.parse(url.searchParams.get('start'))/1000,to=Date.parse(url.searchParams.get('end'))/1000
  requests.push(url);assert.ok(to-from<=250*PRICE_DAY)
  return new Response(JSON.stringify([candle(from-PRICE_DAY),...Array.from({length:(to-from)/PRICE_DAY},(_,i)=>candle(from+i*PRICE_DAY)),candle(to)]))
})
assert.equal(requests.length,3);assert.equal(fetched.length,501)
assert.ok(fetched.every(p=>p.provider==='Coinbase Exchange'&&/^[a-f0-9]{64}$/.test(p.metadata.response_sha256)))
assert.deepEqual(await fetchDailyPrices('SOL-USD',start,start+PRICE_DAY,async()=>new Response('[]')),[],'An unlisted interval remains missing')
await assert.rejects(fetchDailyPrices('BTC-USD',start,start+PRICE_DAY,async()=>new Response('[]',{status:503})),/503/)
await assert.rejects(fetchDailyPrices('BTC-USD',start,start+PRICE_DAY,async()=>new Response(JSON.stringify(Array(302).fill(candle(start))))),/Invalid/)
const csv='DATE,VALUE\n'+Array.from({length:3650},(_,i)=>new Date((start+i*PRICE_DAY)*1000).toISOString().slice(0,10)+','+i).join('\n')+'\n2026-01-01,.\n2026-01-02,\n'
assert.equal(fredHistoryRows(csv,'2016-01-01').length,3650,'No 700-row truncation')
assert.equal(fredHistoryRows(csv,'2016-01-01')[0].value,0,'True zero retained')
assert.ok(fredHistoryRows(csv,'2020-01-01').every(p=>p.date>='2020-01-01'))
assert.ok(chart.isChartRange('4Y')&&chart.isChartRange('10Y'))
assert.equal(chart.rangeStart('MAX',Date.now()),null)
assert.equal(chart.rangeStart('4Y',Date.parse('2026-10-11T00:00:00Z')),'2022-10-11T00:00:00.000Z')

function unitModule(path,imports={}){
 const source=readFileSync(new URL(path,import.meta.url),'utf8'),module={exports:{}}
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:module.exports,module,Date,console,Request,Response,Deno:imports.Deno,require:name=>imports[name]??require(name)})
 return module.exports
}
const queries=[]
const db={from(table){const q={table,filters:[]};const chain={select(){return chain},eq(key,value){q.filters.push({key,value});return chain},lte(){return chain},gte(){return chain},order(){return chain},range(from,to){q.from=from;q.to=to;return chain},async maybeSingle(){queries.push(q);assert.ok(q.filters.some(f=>f.key==='is_public'&&f.value));return {data:{id:'daily-series',code:'BTC_DAILY',frequency:'daily',source_url:'https://api.exchange.coinbase.com/products/BTC-USD/candles'},error:null}},then(resolve,reject){queries.push(q);return Promise.resolve({data:points.slice().reverse().slice(q.from,q.to+1).map(p=>({...p,metadata:p.metadata})),error:null}).then(resolve,reject)}};return chain}}
const {getChartSeries}=unitModule('../lib/data/chart-series.ts',{react:{cache:f=>f},'../supabase/server':{createClient:async()=>db},'./chart':chart,'./freshness':{instrumentLabel:(c,l)=>l,sourceFrequency:(c,f)=>f}})
const history=await getChartSeries('BTC','MAX')
assert.equal(history.code,'BTC');assert.equal(history.historyBasis,'daily-close');assert.equal(history.frequency,'daily')
assert.equal(history.history.length,3699);assert.equal(history.history[0].observedAt,points[0].observed_at)
assert.equal(history.truncated,false);assert.equal(queries.filter(q=>q.table==='data_points').length,4)
assert.equal(queries.some(q=>['model_runs','signal_predictions','market_snapshots'].includes(q.table)),false,'Public loader never reads private research or recent quote snapshots')
let serve,authOnly=0
unitModule('../supabase/functions/price-history-refresh/index.ts',{
 Deno:{env:{get:k=>k==='SUPABASE_URL'?'https://example.test':k==='SUPABASE_SECRET_KEYS'?'{"default":"synthetic-test-key"}':undefined},serve:fn=>{serve=fn}},
 'npm:@supabase/supabase-js@2.112.3':{createClient:()=>({rpc:async()=>{authOnly++;return {data:false,error:null}},from:()=>{throw Error('Unauthorized access')}})},
 '../../../lib/data/price-history.ts':{},'../../../lib/models/modules.ts':{},'../../../lib/models/btc24-history.ts':{},
})
assert.equal((await serve(new Request('https://example.test',{method:'POST',headers:{apikey:'synthetic-publishable'}}))).status,401)
assert.equal(authOnly,1);assert.equal((await serve(new Request('https://example.test'))).status,405)
const sql=readFileSync(new URL('../supabase/migrations/20261011164444_add_public_crypto_daily_history.sql',import.meta.url),'utf8')
const pg=new PGlite()
await pg.exec("create table data_series(id uuid default gen_random_uuid(),code text unique,label text,desk_slug text,category text,region text,unit text,frequency text,source_url text,description text,is_public boolean,sort_order int,metadata jsonb); alter table data_series enable row level security;")
await pg.exec(sql);await pg.exec(sql)
assert.equal((await pg.query('select count(*)::int as count from data_series')).rows[0].count,3)
assert.equal((await pg.query("select relrowsecurity from pg_class where relname='data_series'")).rows[0].relrowsecurity,true)
await pg.close()
console.log('Price-history QA passed: 10-year data, closed UTC days, candle validation, bounded/source-checked fetches, genuine zero/gaps, public-only pagination, private-job authorization and idempotent RLS-preserving registration.')
