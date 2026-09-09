import Link from 'next/link'
import { getSignalLab } from '../../../lib/data/signal-lab'

function pct(value:unknown){const n=Number(value);return Number.isFinite(n)?`${(n*100).toFixed(1)}%`:'—'}
function number(value:unknown,digits=1){const n=Number(value);return Number.isFinite(n)?n.toFixed(digits):'—'}

export const metadata={title:'Signal Lab | KAPORAL Research OS',robots:{index:false,follow:false}}

export default async function SignalLabPage(){
  const data=await getSignalLab()
  if(!data.authorized) return <main className="studio-shell"><section className="studio-lock"><p className="eyebrow">KAPORAL SIGNAL LAB</p><h1>Private quantitative research workspace</h1><p>This surface is restricted to approved researchers, editors and administrators.</p><div className="lockActions"><Link href="/auth">Sign in</Link><Link href="/">Return to public intelligence</Link></div></section></main>

  const model=data.models.find((m:any)=>m.code==='K-EDGE')??data.models[0]
  const open=data.predictions.filter((p:any)=>p.status==='open')
  const resolved=data.predictions.filter((p:any)=>p.status==='resolved').length
  const resolvedOutcomes=data.outcomes.filter((o:any)=>o.hit!==null&&o.hit!==undefined)
  const hitRate=resolvedOutcomes.length?resolvedOutcomes.filter((o:any)=>o.hit).length/resolvedOutcomes.length:null
  const weights=Object.entries((model?.feature_weights??{}) as Record<string,unknown>).sort((a,b)=>Number(b[1])-Number(a[1]))

  return <main className="studio-shell signalLabShell">
    <section className="studio-head"><div><p className="eyebrow">KAPORAL SIGNAL LAB · EXPERIMENTAL</p><h1>K-EDGE short-horizon research engine</h1><p>{data.profile.display_name??'Researcher'} · {data.profile.role}</p></div><div className="workspaceActions"><Link href="/studio">Research OS</Link><Link href="/options">Public options desk ↗</Link></div></section>

    <section className="studio-kpis"><div><small>MODEL</small><b>{model?`${model.code} ${model.version}`:'—'}</b></div><div><small>OPEN FORWARD CALLS</small><b>{open.length}</b></div><div><small>RESOLVED CALLS</small><b>{resolved}</b></div><div><small>REALIZED HIT RATE</small><b>{hitRate==null?'—':pct(hitRate)}</b></div></section>

    <section className="signalLabWarning"><strong>Research ranking, not a profit promise.</strong><p>K-EDGE is private and experimental. A high opportunity score means the model found a stronger combination of evidence under its current rules; it does not mean a trade will be profitable. Validation requires forward predictions and walk-forward out-of-sample testing with transaction costs, slippage and no look-ahead.</p></section>

    <section className="signalLabGrid">
      <article className="studio-panel"><p className="eyebrow">MODEL WEIGHTS</p><h2>Current K-EDGE score</h2>{weights.length?<div className="weightList">{weights.map(([name,value])=><div key={name}><span>{name.replaceAll('_',' ')}</span><b>{number(value,0)}</b><i style={{width:`${Math.max(0,Math.min(100,Number(value)))}%`}}/></div>)}</div>:<p>No model weights stored.</p>}</article>
      <article className="studio-panel"><p className="eyebrow">VALIDATION STATUS</p><h2>{model?.status??'No model'}</h2><p>{model?.notes??'No model notes stored.'}</p><dl className="signalMethod"><div><dt>Universe</dt><dd>Crypto → stocks → listed options</dd></div><div><dt>Horizons</dt><dd>24h / 72h / 1 week research windows</dd></div><div><dt>Required output</dt><dd>Direction, probability, score, horizon, invalidation</dd></div></dl></article>
    </section>

    <section className="studio-panel signalTablePanel"><div className="signalTableHead"><div><p className="eyebrow">FORWARD LEDGER</p><h2>Predictions made before the outcome</h2></div><span>{data.predictions.length} stored</span></div>{data.predictions.length?<div className="signalTableScroll"><table className="signalTable"><thead><tr><th>As of</th><th>Asset</th><th>Direction</th><th>Horizon</th><th>Probability</th><th>K-EDGE</th><th>Expected move</th><th>Status</th><th>Invalidation</th></tr></thead><tbody>{data.predictions.map((p:any)=><tr key={p.id}><td>{new Date(p.source_as_of).toLocaleString('en-GB',{timeZone:'UTC',dateStyle:'medium',timeStyle:'short'})}</td><td><strong>{p.symbol}</strong><small>{p.asset_class}</small></td><td>{p.direction}</td><td>{p.horizon_hours}h</td><td>{pct(p.probability)}</td><td>{number(p.opportunity_score,0)}/100</td><td>{p.expected_move_pct==null?'—':`${Number(p.expected_move_pct).toFixed(2)}%`}</td><td>{p.status}</td><td>{p.invalidation_text}</td></tr>)}</tbody></table></div>:<div className="emptyResearch"><strong>No forward predictions yet.</strong><p>That is acceptable. The ledger should begin only when a reproducible model run creates a timestamped prediction from information available at that moment.</p></div>}</section>

    <section className="studio-panel signalTablePanel"><div className="signalTableHead"><div><p className="eyebrow">BACKTEST AUDIT</p><h2>Walk-forward evidence</h2></div><span>{data.backtests.length} runs</span></div>{data.backtests.length?<div className="signalTableScroll"><table className="signalTable"><thead><tr><th>Universe</th><th>Period</th><th>Observations</th><th>Hit rate</th><th>Brier</th><th>Avg return</th><th>Max drawdown</th></tr></thead><tbody>{data.backtests.map((b:any)=><tr key={b.id}><td>{b.universe}</td><td>{b.period_start} → {b.period_end}</td><td>{b.observations}</td><td>{b.hit_rate==null?'—':`${Number(b.hit_rate).toFixed(1)}%`}</td><td>{number(b.brier_score,3)}</td><td>{b.avg_return_pct==null?'—':`${Number(b.avg_return_pct).toFixed(2)}%`}</td><td>{b.max_drawdown_pct==null?'—':`${Number(b.max_drawdown_pct).toFixed(2)}%`}</td></tr>)}</tbody></table></div>:<div className="emptyResearch"><strong>No backtest has earned a result yet.</strong><p>The database is ready for walk-forward experiments, but a statistic will not be shown until an actual run with documented assumptions is stored.</p></div>}</section>
  </main>
}
