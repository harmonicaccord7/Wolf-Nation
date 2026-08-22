import Link from 'next/link'
import { Header } from '../../components/Header'
import { Footer } from '../../components/Footer'
import { getPublicImpactMaps } from '../../lib/data/accountability'

export const metadata={title:'Impact Map',description:'Evidence-linked causal consequence maps for published KAPORAL INTELLIGENCE research.'}

export default async function ImpactMapPage(){
  const maps=await getPublicImpactMaps()
  return <main className="intelligencePage"><Header/>
    <section className="deskHero"><div className="shell deskHeroGrid"><div><span className="eyebrow">CONSEQUENCE ENGINE</span><h1>KAPORAL Impact Map</h1><p>Published maps separate events, mechanisms and downstream consequences across time horizons. Only maps attached to human-approved research are visible here.</p></div><aside><small>CAUSAL DISCIPLINE</small><strong>Event → mechanism → consequence</strong><span>Probability, direction, severity and lag are shown when the evidence supports them.</span></aside></div></section>
    <section className="shell liveSection"><div className="liveSectionHead"><div><span className="eyebrow">PUBLIC MAPS</span><h2>Published consequence chains</h2></div><Link href="/methodology">Methodology →</Link></div>
      {maps.length?<div className="impactMapList">{maps.map((m:any)=><article className="impactMapCard" key={m.id}><header><div><small>VERSION {m.version}</small><h3>{m.title}</h3><p>{m.summary}</p></div><Link href={`/article/${m.article.slug}`}>Read investigation →</Link></header><div className="impactNodes">{m.nodes.map((n:any)=><div className="impactNode" key={n.id}><small>{n.node_type} · {n.horizon||'horizon n/a'}</small><strong>{n.label}</strong><span>{n.probability==null?'Probability n/a':`${Math.round(Number(n.probability))}% probability`} · {n.direction||'neutral'} · severity {n.severity??'—'}</span></div>)}</div>{m.edges.length?<div className="impactEdges"><small>MECHANISMS</small>{m.edges.map((e:any)=><p key={e.id}>{e.mechanism}{e.lag_label?` · ${e.lag_label}`:''}</p>)}</div>:null}</article>)}</div>:<div className="emptyResearch"><strong>No public Impact Maps yet.</strong><p>Maps remain private until their parent investigation passes source, contrarian, quant, standards and editor-in-chief review.</p></div>}
    </section><Footer/></main>
}
