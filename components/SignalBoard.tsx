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
  return <section className="shell controlRoom" id="markets"><div className="sectionTitle"><div><span className="eyebrow">THE CONTROL ROOM</span><h2>Global Signal Board</h2></div><p>Every score is source-labelled and timestamped. No invented indicators: if the model has not run, we say so.</p></div><div className="signalBoard">{shown.map((s)=><article key={s.code} className="signalCell"><div><span>{s.label}</span><em className={s.direction==='up'?'positive':s.direction==='down'?'negative':'neutral'}>{s.regime ?? 'Unscored'}</em></div><div className="signalNumber">{s.score==null?'—':Math.round(Number(s.score))}<small>{s.score==null?'': '/100'}</small></div><div className="miniBars" aria-hidden="true"><i style={{height:'22%'}}/><i style={{height:'35%'}}/><i style={{height:'44%'}}/><i style={{height:'52%'}}/><i style={{height:'61%'}}/><i style={{height:`${s.score==null?10:Number(s.score)}%`}}/></div><small className="sourceStamp">{s.provider ?? 'KAPORAL model pending'}</small></article>)}</div></section>
}
