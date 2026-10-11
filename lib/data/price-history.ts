export const PRICE_DAY = 86400
export const priceProducts = ['BTC-USD','ETH-USD','SOL-USD'] as const
export type PriceProduct = typeof priceProducts[number]
export type DailyPrice = { observed_at:string; value:number; raw_value:string; provider:string; metadata:Record<string,unknown> }
export const priceSource = (product:PriceProduct) => `https://api.exchange.coinbase.com/products/${product}/candles`

/** Project only closed public market observations. Never return model inputs or fits. */
export function dailyPricePoints(rows:unknown,product:PriceProduct,cutoff:number,provenance:Record<string,unknown>={}) {
  if(!priceProducts.includes(product)||!Array.isArray(rows))throw new Error('Invalid price history')
  const points=new Map<number,DailyPrice>()
  for(const row of rows){
    if(!Array.isArray(row)||row.length!==6||!row.every(v=>typeof v==='number'&&Number.isFinite(v)))throw new Error('Invalid daily candle')
    const [start,low,high,open,close,volume]=row
    if(!Number.isInteger(start)||start%PRICE_DAY!==0||low<=0||high<low||open<low||open>high||close<low||close>high||volume<0)throw new Error('Invalid daily candle values')
    if(start+PRICE_DAY>cutoff)continue
    const old=points.get(start)
    if(old&&old.value!==close)throw new Error('Conflicting daily close')
    points.set(start,{observed_at:new Date((start+PRICE_DAY)*1000).toISOString(),value:close,raw_value:String(close),provider:'Coinbase Exchange',metadata:{...provenance,source_url:priceSource(product),product,observation_kind:'daily_close',candle_start:new Date(start*1000).toISOString(),vintage:'Present-day vendor history; original historical release times and revisions are unavailable.'}})
  }
  return [...points.values()].sort((a,b)=>a.observed_at.localeCompare(b.observed_at))
}

export async function fetchDailyPrices(product:PriceProduct,start:number,end:number,request:typeof fetch=fetch) {
  if(!priceProducts.includes(product)||!Number.isInteger(start)||!Number.isInteger(end)||start%PRICE_DAY||end%PRICE_DAY||end<=start)throw new Error('Invalid price request')
  const points:DailyPrice[]=[]
  for(let from=start;from<end;from+=250*PRICE_DAY){
    const to=Math.min(end,from+250*PRICE_DAY),url=new URL(priceSource(product))
    url.searchParams.set('granularity',String(PRICE_DAY));url.searchParams.set('start',new Date(from*1000).toISOString());url.searchParams.set('end',new Date(to*1000).toISOString())
    const response=await request(url,{signal:AbortSignal.timeout(15000)})
    if(!response.ok)throw new Error(`Price source HTTP ${response.status}`)
    const raw=await response.text(),body:unknown=JSON.parse(raw)
    if(!Array.isArray(body)||body.length>301)throw new Error('Invalid price source response')
    // Some buckets can precede the requested start. Validate before range selection.
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw))),b=>b.toString(16).padStart(2,'0')).join('')
    points.push(...dailyPricePoints(body,product,end,{response_sha256:hash,fetched_at:new Date().toISOString()}).filter(p=>Date.parse(String(p.metadata.candle_start))/1000>=from&&Date.parse(String(p.metadata.candle_start))/1000<to))
  }
  return points
}

/** Keep every valid observation in the requested ten-year source window. */
export function fredHistoryRows(csv:string,startDate:string) {
  const result:{date:string;raw:string;value:number}[]=[]
  for(const line of csv.trim().split(/\r?\n/).slice(1)){
    const [date,raw]=line.split(',')
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date??'')||date<startDate||!raw?.trim()||raw.trim()==='.')continue
    const value=Number(raw);if(Number.isFinite(value))result.push({date,raw,value})
  }
  return result
}
