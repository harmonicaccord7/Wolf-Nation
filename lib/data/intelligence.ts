import { createClient } from '../supabase/server'
import { deskConfigs, type DeskSlug } from './desk-config'

export type DataPoint = { value:number|null; observedAt:string; provider:string; metadata:Record<string,unknown> }
export type MetricSeries = {
  id:string; code:string; label:string; deskSlug:string|null; category:string; region:string|null; countryCode:string|null;
  unit:string|null; frequency:string|null; sourceUrl:string|null; description:string|null; sortOrder:number; metadata:Record<string,unknown>;
  latest:DataPoint|null; history:DataPoint[]
}
export type CryptoAsset = { symbol:string; price:number|null; change24h:number|null; volume:number|null; capturedAt:string; provider:string }
export type ArticlePreview = { id:string; slug:string; headline:string; dek:string|null; confidence:string|null; readerLevel:string; publishedAt:string|null; featured:boolean }
export type OverviewIntelligence = { metrics:Record<string,MetricSeries>; crypto:Record<string,CryptoAsset>; availableSeries:number; newestAt:string|null }

function num(v:unknown){ if(v===null||v===undefined||v==='') return null; const n=Number(v); return Number.isFinite(n)?n:null }
function maxIso(values:(string|null|undefined)[]){ const good=values.filter(Boolean) as string[]; return good.length?good.sort((a,b)=>Date.parse(b)-Date.parse(a))[0]:null }

async function loadPoints(supabase:any, series:any[]){
  if(!series.length) return new Map<string,DataPoint[]>()
  const ids=series.map(s=>s.id)
  const {data:rows}=await supabase.from('data_points').select('series_id,value,observed_at,provider,metadata').in('series_id',ids).order('observed_at',{ascending:false}).limit(1200)
  const map=new Map<string,DataPoint[]>()
  for(const r of rows??[]){
    const list=map.get(r.series_id)??[]
    if(list.length<40) list.push({value:num(r.value),observedAt:r.observed_at,provider:r.provider,metadata:r.metadata??{}})
    map.set(r.series_id,list)
  }
  return map
}

function normalizeSeries(series:any[], points:Map<string,DataPoint[]>):MetricSeries[]{
  return series.map(s=>{
    const history=(points.get(s.id)??[])
    return {id:s.id,code:s.code,label:s.label,deskSlug:s.desk_slug,category:s.category,region:s.region,countryCode:s.country_code,unit:s.unit,frequency:s.frequency,sourceUrl:s.source_url,description:s.description,sortOrder:s.sort_order??0,metadata:s.metadata??{},latest:history[0]??null,history:[...history].reverse()}
  }).sort((a,b)=>a.sortOrder-b.sortOrder||a.label.localeCompare(b.label))
}

async function loadCrypto(supabase:any, symbols:string[]):Promise<CryptoAsset[]>{
  if(!symbols.length) return []
  const {data:rows}=await supabase.from('market_snapshots').select('symbol,price,change_24h,volume,captured_at,provider').in('symbol',symbols).order('captured_at',{ascending:false}).limit(100)
  const map=new Map<string,CryptoAsset>()
  for(const r of rows??[]) if(!map.has(r.symbol)) map.set(r.symbol,{symbol:r.symbol,price:num(r.price),change24h:num(r.change_24h),volume:num(r.volume),capturedAt:r.captured_at,provider:r.provider})
  return symbols.flatMap(s=>map.has(s)?[map.get(s)!]:[])
}

export async function getPublishedArticles(limit=12):Promise<ArticlePreview[]>{
  const supabase=await createClient()
  const {data}=await supabase.from('articles').select('id,slug,headline,dek,confidence,reader_level,published_at,is_featured').eq('status','published').not('published_at','is',null).lte('published_at',new Date().toISOString()).order('published_at',{ascending:false}).limit(limit)
  return (data??[]).map((a:any)=>({id:a.id,slug:a.slug,headline:a.headline,dek:a.dek,confidence:a.confidence,readerLevel:a.reader_level,publishedAt:a.published_at,featured:a.is_featured}))
}

export async function getDeskIntelligence(slug:DeskSlug){
  const config=deskConfigs[slug]
  const supabase=await createClient()
  const {data:desk}=await supabase.from('desks').select('id,slug,name,description').eq('slug',slug).maybeSingle()
  let series:any[]=[]
  if(config.allDeskSeries){
    const {data}=await supabase.from('data_series').select('id,code,label,desk_slug,category,region,country_code,unit,frequency,source_url,description,sort_order,metadata').eq('desk_slug',slug).eq('is_public',true).order('sort_order')
    series=data??[]
  }else if(config.seriesCodes?.length){
    const {data}=await supabase.from('data_series').select('id,code,label,desk_slug,category,region,country_code,unit,frequency,source_url,description,sort_order,metadata').in('code',config.seriesCodes).eq('is_public',true).order('sort_order')
    series=data??[]
  }
  const [pointMap,crypto,allArticles]=await Promise.all([loadPoints(supabase,series),loadCrypto(supabase,config.cryptoSymbols??[]),getPublishedArticles(20)])
  let articles=allArticles
  if(desk?.id && allArticles.length){
    const {data:links}=await supabase.from('article_desks').select('article_id').eq('desk_id',desk.id)
    const ids=new Set((links??[]).map((x:any)=>x.article_id))
    if(ids.size) articles=allArticles.filter(a=>ids.has(a.id))
  }
  return { config, desk, metrics:normalizeSeries(series,pointMap), crypto, articles }
}

export async function getOverviewIntelligence():Promise<OverviewIntelligence>{
  const supabase=await createClient()
  const codes=['FED_FUNDS','US2Y','US10Y','BROAD_DOLLAR','SPX','NASDAQ','DXY','GOLD','WTI','BTC_ETF_FLOW','BTC_OPTIONS_OI','BTC_PUT_CALL_OI','BTC_OPTIONS_IV','BTC_OPTIONS_VOLUME','NGA_GDP_GROWTH','NGA_INFLATION','ZAF_GDP_GROWTH','ZAF_INFLATION','CMR_GDP_GROWTH','CMR_INFLATION']
  const {data:series}=await supabase.from('data_series').select('id,code,label,desk_slug,category,region,country_code,unit,frequency,source_url,description,sort_order,metadata').in('code',codes).eq('is_public',true)
  const [points,cryptoAssets]=await Promise.all([loadPoints(supabase,series??[]),loadCrypto(supabase,['BTC','ETH','SOL'])])
  const normalized=normalizeSeries(series??[],points)
  const metrics=Object.fromEntries(normalized.map(s=>[s.code,s]))
  const crypto=Object.fromEntries(cryptoAssets.map(a=>[a.symbol,a]))
  const newestAt=maxIso([...normalized.map(s=>s.latest?.observedAt),...cryptoAssets.map(a=>a.capturedAt)])
  return {metrics,crypto,availableSeries:normalized.filter(s=>s.latest?.value!==null&&s.latest).length+cryptoAssets.filter(a=>a.price!==null).length,newestAt}
}

export async function getSeriesHistory(code:string,limit=120){
  const supabase=await createClient()
  const {data:series}=await supabase.from('data_series').select('id,code,label,desk_slug,category,region,country_code,unit,frequency,source_url,description,sort_order,metadata').eq('code',code).eq('is_public',true).maybeSingle()
  if(!series) return null
  const {data:rows}=await supabase.from('data_points').select('value,observed_at,provider,metadata').eq('series_id',series.id).order('observed_at',{ascending:false}).limit(Math.min(Math.max(limit,1),500))
  const history=(rows??[]).map((r:any)=>({value:num(r.value),observedAt:r.observed_at,provider:r.provider,metadata:r.metadata??{}})).reverse()
  return {...series,history,latest:history.at(-1)??null}
}

export async function getPublicPage(slug:string){
  const supabase=await createClient()
  const {data}=await supabase.from('site_pages').select('slug,title,eyebrow,summary,body,seo_title,seo_description,published_at,updated_at').eq('slug',slug).eq('status','published').lte('published_at',new Date().toISOString()).maybeSingle()
  return data
}

export async function getResearchIndex(){
  const supabase=await createClient()
  const [articles,{data:predictions},{data:weekly}]=await Promise.all([
    getPublishedArticles(30),
    supabase.from('predictions').select('id,statement,probability,target_metric,target_condition,horizon_start,horizon_end,invalidation_condition,status,published_at').not('published_at','is',null).lte('published_at',new Date().toISOString()).order('published_at',{ascending:false}).limit(30),
    supabase.from('weekly_reviews').select('id,week_start,metrics,what_worked,what_failed,what_we_missed,next_experiments,published_at').not('published_at','is',null).lte('published_at',new Date().toISOString()).order('week_start',{ascending:false}).limit(12)
  ])
  return {articles,predictions:predictions??[],weekly:weekly??[]}
}

export async function searchPublishedResearch(query:string){
  const q=query.trim().replace(/[,%()]/g,' ').slice(0,100)
  if(q.length<2) return []
  const supabase=await createClient()
  const {data}=await supabase.from('articles').select('id,slug,headline,dek,confidence,reader_level,published_at,is_featured').eq('status','published').or(`headline.ilike.%${q}%,dek.ilike.%${q}%`).order('published_at',{ascending:false}).limit(30)
  return (data??[]).map((a:any)=>({id:a.id,slug:a.slug,headline:a.headline,dek:a.dek,confidence:a.confidence,readerLevel:a.reader_level,publishedAt:a.published_at,featured:a.is_featured}))
}
