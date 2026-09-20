'use client'
import {useMemo,useState} from 'react'
import {chartGeometry,chartRanges,selectChartPoints,type ChartPoint,type ChartRange} from '../../lib/data/chart'
const fmt=(v:number)=>Intl.NumberFormat('en',{maximumFractionDigits:3}).format(v)
const date=(v:string)=>new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeZone:'UTC'}).format(new Date(v))
export function HistoryChart({points,label,unit,endpoint,asOf,initialRange='1Y',truncated=false,markers=[]}:{points:ChartPoint[];label:string;unit:string|null;endpoint?:string;asOf?:string;initialRange?:ChartRange;truncated?:boolean;markers?:{at:string;label:string}[]}){
 const [range,setRange]=useState<ChartRange>(initialRange),[loaded,setLoaded]=useState(points),[cutoff,setCutoff]=useState(asOf??new Date().toISOString()),[limited,setLimited]=useState(truncated)
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[selected,setSelected]=useState<number|null>(null)
 const data=useMemo(()=>selectChartPoints(loaded,range,Date.parse(cutoff)),[loaded,range,cutoff]),coords=useMemo(()=>chartGeometry(data),[data])
 async function changeRange(next:ChartRange){
  if(busy||range===next)return
  if(!endpoint){setRange(next);setSelected(null);return}
  setBusy(true);setError('')
  try{const res=await fetch(`${endpoint}?range=${next}`,{cache:'no-store'});const body=await res.json();if(!res.ok||!Array.isArray(body.history))throw new Error('History unavailable');setLoaded(body.history);setCutoff(body.asOf);setLimited(Boolean(body.truncated));setRange(next);setSelected(null)}catch{setError('History could not be loaded. The previous range is still displayed.')}finally{setBusy(false)}
 }
 const first=data[0],last=data.at(-1),point=selected===null?last:data[selected]
 const change=first&&last?(unit==='%'?last.value-first.value:first.value===0?null:(last.value-first.value)/Math.abs(first.value)*100):null
 const start=first?Date.parse(first.observedAt):0,end=last?Date.parse(last.observedAt):0
 function inspect(x:number){if(!coords.length)return;let best=0;for(let i=1;i<coords.length;i++)if(Math.abs(coords[i].x-x)<Math.abs(coords[best].x-x))best=i;setSelected(best)}
 return <div className="historyChartBlock" aria-busy={busy}>
  <div className="historyControls" aria-label="Chart time range">{chartRanges.map(r=><button type="button" key={r} aria-pressed={range===r} disabled={busy} className={range===r?'active':''} onClick={()=>changeRange(r)}>{r}</button>)}</div>
  {error&&<p role="alert">{error}</p>}
  <div className="historySummary"><span>{data.length} observations · {range==='MAX'?'available stored history':`last ${range}`}</span><b>{last?`${fmt(last.value)} ${unit??''}`:'No value in this range'}</b><em>{change==null?'Change unavailable':`${change>=0?'+':''}${change.toFixed(2)}${unit==='%'?' percentage points':'%'} over displayed observations`}</em></div>
  {data.length===0?<div className="historyEmpty">No observations in the selected period. Choose a longer range to explore earlier data.</div>:<>
   <svg className="historyChart interactiveHistory" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={`${label} history; ${data.length} observations`} onPointerMove={e=>{const box=e.currentTarget.getBoundingClientRect();inspect((e.clientX-box.left)/box.width*100)}} onPointerDown={e=>{const box=e.currentTarget.getBoundingClientRect();inspect((e.clientX-box.left)/box.width*100)}}>
    <polyline points={coords.map(p=>`${p.x},${p.y}`).join(' ')}/>
    {coords.length===1&&<circle cx={50} cy={coords[0].y} r="1.5"/>}
    {markers.filter(m=>Date.parse(m.at)>=start&&Date.parse(m.at)<=end&&end>start).map(m=><g key={m.at+m.label}><title>{m.label}</title><line className="eventMarker" x1={(Date.parse(m.at)-start)/(end-start)*100} x2={(Date.parse(m.at)-start)/(end-start)*100} y1="0" y2="100"/></g>)}
    {selected!==null&&coords[selected]&&<line className="chartCursor" x1={coords[selected].x} x2={coords[selected].x} y1="0" y2="100"/>}
   </svg>
   <label className="chartScrubber">Inspect observation<input aria-label={`Inspect ${label} observation`} type="range" min="0" max={Math.max(0,data.length-1)} value={selected??data.length-1} onChange={e=>setSelected(Number(e.target.value))}/></label>
   <div className="chartReadout" role="status">{point&&<>{date(point.observedAt)} {new Date(point.observedAt).toISOString().slice(11,16)} UTC · <b>{fmt(point.value)} {unit??''}</b> · {point.provider}</>}</div>
   <div className="historyAxis"><span>{date(first.observedAt)}</span><span>{date(last!.observedAt)}</span></div>
  </>}
  <p className="chartCoverage">Observation dates are spaced by elapsed time. Lines connect available observations; intermediate values are unknown.{limited?' Display is limited to the most recent 20,000 observations. Choose a shorter range.':''}</p>
  {data.length>0&&<details className="historyTable"><summary>Accessible recent observations</summary><table><thead><tr><th>Date (UTC)</th><th>Value</th><th>Provider</th></tr></thead><tbody>{data.slice(-20).reverse().map((p,i)=><tr key={p.observedAt+i}><td>{date(p.observedAt)} {p.observedAt.slice(11,16)}</td><td>{fmt(p.value)} {unit??''}</td><td>{p.provider}</td></tr>)}</tbody></table></details>}
 </div>
}
