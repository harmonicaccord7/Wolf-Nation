'use client'
import { useMemo,useState } from 'react'
import type { DataPoint } from '../../lib/data/intelligence'

type Range='30D'|'90D'|'1Y'|'MAX'
const days:Record<Exclude<Range,'MAX'>,number>={'30D':30,'90D':90,'1Y':365}
function fmt(v:number){return Math.abs(v)>=1_000_000?Intl.NumberFormat('en',{notation:'compact',maximumFractionDigits:2}).format(v):Intl.NumberFormat('en',{maximumFractionDigits:3}).format(v)}

export function HistoryChart({points,label,unit}:{points:DataPoint[];label:string;unit:string|null}){
  const [range,setRange]=useState<Range>('1Y')
  const data=useMemo(()=>{
    const valid=points.filter((p):p is DataPoint&{value:number}=>p.value!==null).sort((a,b)=>Date.parse(a.observedAt)-Date.parse(b.observedAt))
    if(range==='MAX'||valid.length<2)return valid
    const end=Date.parse(valid.at(-1)!.observedAt),start=end-days[range]*864e5
    const filtered=valid.filter(p=>Date.parse(p.observedAt)>=start)
    return filtered.length>=2?filtered:valid
  },[points,range])
  if(data.length<2)return <div className="historyEmpty">Historical observations are not yet sufficient for a chart.</div>
  const values=data.map(p=>p.value),min=Math.min(...values),max=Math.max(...values),spread=max-min||Math.max(Math.abs(max)*.01,1),lo=min-spread*.08,hi=max+spread*.08
  const coords=data.map((p,i)=>`${(i/(data.length-1))*100},${92-((p.value-lo)/(hi-lo))*84}`).join(' ')
  const first=data[0],last=data.at(-1)!,change=first.value===0?null:((last.value-first.value)/Math.abs(first.value))*100
  return <div className="historyChartBlock">
    <div className="historyControls" aria-label="Chart time range">{(['30D','90D','1Y','MAX'] as Range[]).map(r=><button type="button" key={r} className={range===r?'active':''} onClick={()=>setRange(r)}>{r}</button>)}</div>
    <div className="historySummary"><span>{data.length} observations</span><b>{fmt(last.value)} {unit??''}</b><em className={(change??0)>=0?'positive':'negative'}>{change==null?'change n/a':`${change>=0?'+':''}${change.toFixed(2)}%`}</em></div>
    <svg className="historyChart" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={`${label} historical chart from ${new Date(first.observedAt).toLocaleDateString()} to ${new Date(last.observedAt).toLocaleDateString()}`}><polyline points={coords}/></svg>
    <div className="historyAxis"><span>{new Date(first.observedAt).toLocaleDateString('en-GB',{year:'numeric',month:'short',day:'numeric'})}</span><span>{fmt(max)}</span><span>{fmt(min)}</span><span>{new Date(last.observedAt).toLocaleDateString('en-GB',{year:'numeric',month:'short',day:'numeric'})}</span></div>
    <details className="historyTable"><summary>Accessible recent observations</summary><table><thead><tr><th>Date</th><th>Value</th><th>Provider</th></tr></thead><tbody>{data.slice(-12).reverse().map((p,i)=><tr key={`${p.observedAt}-${i}`}><td>{new Date(p.observedAt).toLocaleDateString('en-GB')}</td><td>{fmt(p.value)} {unit??''}</td><td>{p.provider}</td></tr>)}</tbody></table></details>
  </div>
}
