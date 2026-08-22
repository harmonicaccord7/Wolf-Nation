import Link from 'next/link'
import { Header } from '../../components/Header'
import { Footer } from '../../components/Footer'
import { getPublicTrackRecord } from '../../lib/data/accountability'

export const metadata={title:'Track Record',description:'Auditable public prediction ledger and resolution history for KAPORAL INTELLIGENCE.'}

function pct(v:any){const n=Number(v);return Number.isFinite(n)?`${Math.round(n)}%`:'—'}
function score(v:any){const n=Number(v);return Number.isFinite(n)?n.toFixed(2):'—'}

export default async function TrackRecordPage(){
  const data=await getPublicTrackRecord()
  return <main className="intelligencePage"><Header/>
    <section className="deskHero"><div className="shell deskHeroGrid"><div><span className="eyebrow">PUBLIC ACCOUNTABILITY</span><h1>Prediction Ledger & Track Record</h1><p>Every published forecast is timestamped, probability-weighted and resolved against evidence. We do not backfill predictions after the fact.</p></div><aside><small>SCORING DISCIPLINE</small><strong>{data.total} public predictions · {data.resolved} resolved</strong><span>{data.meanScore==null?'Scoring begins once predictions resolve.':`Mean published resolution score: ${data.meanScore.toFixed(2)}`}</span></aside></div></section>
    <section className="shell liveSection"><div className="accountabilityStats"><article><small>TOTAL</small><strong>{data.total}</strong><span>published forecasts</span></article><article><small>OPEN</small><strong>{data.open}</strong><span>awaiting horizon or evidence</span></article><article><small>RESOLVED</small><strong>{data.resolved}</strong><span>with public outcome records</span></article><article><small>MEAN SCORE</small><strong>{data.meanScore==null?'—':data.meanScore.toFixed(2)}</strong><span>where a numeric score exists</span></article></div>
      <div className="liveSectionHead"><div><span className="eyebrow">LEDGER</span><h2>Published forecasts</h2></div><Link href="/methodology">Scoring methodology →</Link></div>
      {data.rows.length?<div className="trackTable" role="table" aria-label="Prediction track record">{data.rows.map((p:any)=><article className="trackRow" key={p.id}><div><small>PROBABILITY</small><b>{pct(p.probability)}</b></div><div className="trackStatement"><strong>{p.statement}</strong><p>{p.target_condition||p.target_metric||'Published directional forecast.'}</p><small>Horizon: {p.horizon_start||'—'} → {p.horizon_end||'—'} · Invalidated if: {p.invalidation_condition||'not specified'}</small></div><div><small>STATUS</small><b>{p.resolution?.outcome??p.status}</b><span>{p.resolution?`Score ${score(p.resolution.score)}`:'Open'}</span></div></article>)}</div>:<div className="emptyResearch"><strong>No public predictions yet.</strong><p>The ledger starts with the first human-approved publication. Nothing will be added retroactively to manufacture a track record.</p></div>}
    </section><Footer/></main>
}
