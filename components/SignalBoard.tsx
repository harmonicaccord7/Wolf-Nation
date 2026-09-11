type Signal = { code:string; label:string; value:number|null; unit:string|null; regime:string|null; score:number|null; direction:string|null; region:string|null; as_of:string; provider:string|null }

const fallback: Signal[] = [
  {code:'macro',label:'Macro',value:null,unit:null,regime:'Awaiting model',score:null,direction:'flat',region:'Global',as_of:'',provider:null},
  {code:'liquidity',label:'Liquidity',value:null,unit:null,regime:'Awaiting model',score:null,direction:'flat',region:'Global',as_of:'',provider:null},
  {code:'crypto',label:'Crypto',value:null,unit:null,regime:'Awaiting model',score:null,direction:'flat',region:'Global',as_of:'',provider:null},
  {code:'volatility',label:'Volatility',value:null,unit:null,regime:'Awaiting model',score:null,direction:'flat',region:'Global',as_of:'',provider:null},
  {code:'africa',label:'Africa',value:null,unit:null,regime:'Awaiting model',score:null,direction:'flat',region:'Africa',as_of:'',provider:null},
  {code:'geopolitics',label:'Geopolitics',value:null,unit:null,regime:'Awaiting model',score:null,direction:'flat',region:'Global',as_of:'',provider:null}
]

export function SignalBoard({signals=[]}:{signals?:Signal[]}){
  const shown = signals.length ? signals.slice(0,6) : fallback
  return <section className="shell controlRoom" id="markets"><div className="sectionTitle"><div><span className="eyebrow">THE CONTROL ROOM</span><h2>Global Signal Board</h2></div><p>Every score is source-labelled and timestamped. A blank card means the corresponding model has not produced a validated, reviewable run.</p></div><div className="signalBoard">{shown.map((s)=><article key={s.code} className="signalCell"><div><span>{s.label}</span><em className={s.direction==='up'?'positive':s.direction==='down'?'negative':'neutral'}>{s.regime ?? 'Unscored'}</em></div><div className="signalNumber">{s.score==null?'—':Math.round(Number(s.score))}<small>{s.score==null?'':' descriptive score'}</small></div>{s.score==null?<p className="signalEmpty">No validated run yet. No invented trend line is shown.</p>:<div className="signalMeter" aria-label={`Descriptive score ${Math.round(Number(s.score))}`}><i style={{width:`${Math.max(0,Math.min(100,Math.abs(Number(s.score))))}%`}}/></div>}<small className="sourceStamp">{s.provider ?? 'Model run pending'}{s.as_of&&` · ${new Date(s.as_of).toUTCString()}`}</small></article>)}</div></section>
}
