export type Freshness = { status: 'current'|'periodic'|'stale'|'missing'; label: string; ageMinutes: number|null; cadence: string }
export function sourceFrequency(code:string,frequency:string|null){return ['SPX','NASDAQ','WTI'].includes(code)?'daily':frequency??'unknown'}
export function dataFreshness(observedAt:string|null|undefined,frequency:string|null,now=Date.now()):Freshness{
 const time=observedAt?Date.parse(observedAt):NaN,ageMinutes=Number.isFinite(time)?Math.max(0,(now-time)/60000):null
 const cadence=frequency==='market'?'15-minute collection; provider delay may apply':`${frequency??'Unspecified'} observations`
 if(ageMinutes===null||time>now+300000)return {status:'missing',label:'Observation unavailable',ageMinutes:null,cadence}
 const limits:Record<string,number>={market:45,daily:10080,weekly:23040,monthly:108000,quarterly:273600,annual:1152000}
 if(ageMinutes>(limits[frequency??'']??1440))return {status:'stale',label:'Older observation — check source',ageMinutes,cadence}
 return {status:frequency==='market'?'current':'periodic',label:frequency==='market'?'Recent snapshot':'Latest stored release',ageMinutes,cadence}
}
export function instrumentLabel(code:string,label:string){return code==='GOLD'?'Gold futures (GC=F)':code==='DXY'?'U.S. Dollar Index (DX-Y.NYB)':code==='CPI_US'?'U.S. CPI index (seasonally adjusted)':label}
export function observationStamp(value:string|null|undefined){if(!value||!Number.isFinite(Date.parse(value)))return 'No observation date';return new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'UTC'}).format(new Date(value))+' UTC'}
