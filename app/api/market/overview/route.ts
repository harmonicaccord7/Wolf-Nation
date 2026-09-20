import {NextResponse} from 'next/server'
import {getOverviewIntelligence} from '../../../../lib/data/intelligence'
import {dataFreshness,instrumentLabel,sourceFrequency} from '../../../../lib/data/freshness'
export const dynamic='force-dynamic'
export async function GET(){try{
 const o=await getOverviewIntelligence(),checkedAt=new Date().toISOString()
 const crypto=['BTC','ETH','SOL'].flatMap(symbol=>{const a=o.crypto[symbol];return a?[{symbol,name:symbol==='BTC'?'Bitcoin':symbol==='ETH'?'Ethereum':'Solana',value:a.price,unit:'USD',change24h:a.change24h,provider:a.provider,asOf:a.capturedAt,href:`/data/${symbol.toLowerCase()}`,freshness:dataFreshness(a.capturedAt,'market')}]:[]})
 const series=[['SPX','S&P 500'],['NASDAQ','Nasdaq'],['DXY','DXY'],['GOLD','Gold'],['WTI','WTI'],['US10Y','US 10Y']].flatMap(([code,name])=>{const s=o.metrics[code];return s?[{symbol:code,name:instrumentLabel(code,name),value:s.latest?.value??null,unit:s.unit,change24h:null,provider:s.latest?.provider??null,asOf:s.latest?.observedAt??null,href:`/data/${code.toLowerCase()}`,freshness:dataFreshness(s.latest?.observedAt,sourceFrequency(code,s.frequency))}]:[]})
 const assets=[...crypto,...series],available=assets.filter(a=>a.value!==null),statuses=new Set(available.map(a=>a.freshness.status))
 return NextResponse.json({status:!available.length?'degraded':statuses.size>1?'mixed':[...statuses][0],provider:'KAPORAL multi-provider observations',asOf:o.newestAt,checkedAt,assets})
}catch{return NextResponse.json({status:'degraded',assets:[],message:'Market observations temporarily unavailable.'},{status:503})}}
