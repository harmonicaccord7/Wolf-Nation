export type ChartRange='30D'|'90D'|'1Y'|'MAX'
export type ChartPoint={value:number|null;observedAt:string;provider:string;metadata?:Record<string,unknown>}
export const chartRanges:ChartRange[]=['30D','90D','1Y','MAX']
export function isChartRange(v:unknown):v is ChartRange{return chartRanges.includes(v as ChartRange)}
export function rangeStart(range:ChartRange,asOf:number){return range==='MAX'?null:new Date(asOf-({'30D':30,'90D':90,'1Y':365}[range])*86400000).toISOString()}
export function selectChartPoints(points:ChartPoint[],range:ChartRange,asOf:number){
 const start=rangeStart(range,asOf),unique=new Map<number,ChartPoint&{value:number}>()
 for(const p of points){const t=Date.parse(p.observedAt);if(p.value!==null&&Number.isFinite(p.value)&&Number.isFinite(t)&&t<=asOf&&(!start||t>=Date.parse(start)))unique.set(t,p as ChartPoint&{value:number})}
 return [...unique.entries()].sort((a,b)=>a[0]-b[0]).map(([,p])=>p)
}
export function chartGeometry(points:(ChartPoint&{value:number})[]){
 if(!points.length)return []
 const start=Date.parse(points[0].observedAt),end=Date.parse(points.at(-1)!.observedAt),min=Math.min(...points.map(p=>p.value)),max=Math.max(...points.map(p=>p.value)),span=max-min||Math.max(Math.abs(max)*.01,1)
 return points.map(p=>({...p,x:end===start?50:(Date.parse(p.observedAt)-start)/(end-start)*100,y:90-(p.value-min+span*.1)/(span*1.2)*80}))
}
