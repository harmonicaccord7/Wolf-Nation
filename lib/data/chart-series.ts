import {cache} from 'react'
import {createClient} from '../supabase/server'
import {type ChartRange,rangeStart,defaultChartRange} from './chart'
import {instrumentLabel,sourceFrequency} from './freshness'
import type {DataPoint} from './intelligence'
export const getChartSeries=cache(async function getChartSeries(code:string,requestedRange?:ChartRange){
 const db=await createClient(),asOf=new Date().toISOString(),crypto=['BTC','ETH','SOL'].includes(code)
 let definition:any,cryptoDaily=false
 if(crypto){
  const {data,error}=await db.from('data_series').select('id,code,label,unit,frequency,source_url,description').eq('code',`${code}_DAILY`).eq('is_public',true).maybeSingle()
  if(error)throw new Error('Daily price history lookup failed')
  cryptoDaily=Boolean(data)
  definition=data?{...data,code,label:`${code} price`}:{code,label:`${code} price`,unit:'USD',frequency:'market',source_url:'https://www.coingecko.com/',description:'Daily price history is not yet available. Only provider snapshots collected since this site started are shown.'}
 }
 else{const {data,error}=await db.from('data_series').select('id,code,label,unit,frequency,source_url,description').eq('code',code).eq('is_public',true).maybeSingle();if(error)throw new Error('Series lookup failed');if(!data)return null;definition={...data,label:instrumentLabel(code,data.label),frequency:sourceFrequency(code,data.frequency)}}
 const range=requestedRange??defaultChartRange(definition.frequency),start=rangeStart(range,Date.parse(asOf))
 const history:DataPoint[]=[];let truncated=false
 for(let offset=0;offset<20000;offset+=1000){
  const snapshots=crypto&&!cryptoDaily,timeColumn=snapshots?'captured_at':'observed_at'
  let query=snapshots?db.from('market_snapshots').select('price,captured_at,provider').eq('symbol',code):db.from('data_points').select('value,observed_at,provider,metadata').eq('series_id',definition.id)
  query=query.lte(timeColumn,asOf).order(timeColumn,{ascending:false}).range(offset,offset+999);if(start)query=query.gte(timeColumn,start)
  const {data,error}=await query;if(error)throw new Error('Historical observations could not be loaded')
  for(const row of (data??[]) as any[]){const value=row[snapshots?'price':'value'];history.push({value:value==null?null:Number(value),observedAt:row[timeColumn],provider:row.provider,metadata:row.metadata??{}})}
  if((data??[]).length<1000)break;if(offset===19000)truncated=true
 }
 history.reverse();return {...definition,history,asOf,range,truncated,storedPoints:history.length,historyBasis:cryptoDaily?'daily-close':crypto?'collected-snapshots':'provider-observations'}
})
