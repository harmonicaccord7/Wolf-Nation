import Link from 'next/link'
import { Header } from '../Header'
import { Footer } from '../Footer'
import { getDeskIntelligence } from '../../lib/data/intelligence'
import type { DeskSlug } from '../../lib/data/desk-config'
import { formatCryptoPrice, formatIntelligenceValue, formatObservationDate } from '../../lib/format-intelligence'
import { MetricCard } from './MetricCard'
import { OptionsLab } from './OptionsLab'

export async function DeskPage({slug}:{slug:DeskSlug}){
  const data=await getDeskIntelligence(slug)
  const {config,metrics,crypto,articles}=data
  const africaGroups=new Map<string,typeof metrics>()
  if(slug==='africa') for(const m of metrics){ const key=m.countryCode??'Other'; africaGroups.set(key,[...(africaGroups.get(key)??[]),m]) }
  const latestTimes=[...metrics.map(m=>m.latest?.observedAt),...crypto.map(c=>c.capturedAt)].filter(Boolean) as string[]
  const freshest=latestTimes.sort((a,b)=>Date.parse(b)-Date.parse(a))[0]

  return <main className="intelligencePage">
    <Header/>
    <section className="deskHero"><div className="shell deskHeroGrid"><div><span className="eyebrow">{config.eyebrow}</span><h1>{config.title}</h1><p>{config.summary}</p><div className="deskHeroActions"><Link className="goldButton" href="/methodology">Research methodology</Link><Link className="glassButton" href="/disclosures">Risk & disclosures</Link></div></div><aside><small>THE QUESTION</small><strong>{config.question}</strong><span>{freshest?`Latest stored observation: ${formatObservationDate(freshest,'market')}`:'This desk is connected; no provider observation is available yet.'}</span></aside></div></section>

    {crypto.length>0&&<section className="shell liveSection"><div className="liveSectionHead"><div><span className="eyebrow">LIVE SPOT LAYER</span><h2>Digital-asset snapshot</h2></div><p>Stored server-side with provider and capture time.</p></div><div className="cryptoMetricGrid">{crypto.map(a=><article className="cryptoLiveCard" key={a.symbol}><small>{a.symbol} · {a.provider}</small><strong>{formatCryptoPrice(a.price)}</strong><span className={(a.change24h??0)>=0?'positive':'negative'}>{a.change24h==null?'24h change unavailable':`${a.change24h>=0?'+':''}${a.change24h.toFixed(2)}% / 24h`}</span><time>{formatObservationDate(a.capturedAt,'market')}</time></article>)}</div></section>}

    {slug==='africa'?<section className="shell liveSection"><div className="liveSectionHead"><div><span className="eyebrow">AFRICA MACRO MATRIX</span><h2>Country-by-country evidence</h2></div><p>Latest available official indicators are not all published at the same frequency or date. Every observation keeps its source date.</p></div><div className="africaCountryGrid">{[...africaGroups.entries()].map(([code,group])=><article className="africaCountryCard" key={code}><div className="countryCardHead"><strong>{group[0]?.label.split(' — ')[0]??code}</strong><span>{code}</span></div>{group.map(m=><div className="countryMetric" key={m.code}><span>{m.label.split(' — ')[1]??m.label}</span><b>{formatIntelligenceValue(m.latest?.value,m.unit)}</b><small>{m.latest?.provider??'Unavailable'} · {formatObservationDate(m.latest?.observedAt,m.frequency)}</small><Link href={`/data/${m.code.toLowerCase()}`}>History →</Link></div>)}</article>)}</div></section>:metrics.length>0?<section className="shell liveSection"><div className="liveSectionHead"><div><span className="eyebrow">LIVE INTELLIGENCE LAYER</span><h2>Verified data, not decorative numbers.</h2></div><p>{config.sourceNote}</p></div><div className="liveMetricGrid">{metrics.map(m=><MetricCard key={m.code} metric={m}/>)}</div></section>:null}

    {slug==='options'&&<OptionsLab metrics={metrics}/>}    

    <section className="deskCoverage"><div className="shell coverageGrid"><div><span className="eyebrow">WHAT THIS DESK COVERS</span><h2>One lens inside a connected intelligence system.</h2><p>{config.sourceNote}</p></div><div className="coverageCards">{config.coverage.map((item,i)=><div key={item}><small>{String(i+1).padStart(2,'0')}</small><b>{item}</b></div>)}</div></div></section>

    <section className="shell researchShelf"><div className="liveSectionHead"><div><span className="eyebrow">PUBLISHED RESEARCH</span><h2>Research only appears after approval.</h2></div><Link href="/research">Open research index →</Link></div>{articles.length?<div className="researchCardGrid">{articles.map(a=><Link href={`/article/${a.slug}`} className="researchCard" key={a.id}><small>{a.confidence?`${a.confidence} confidence`:a.readerLevel}</small><h3>{a.headline}</h3><p>{a.dek}</p><span>Read investigation →</span></Link>)}</div>:<div className="emptyResearch"><strong>No synthetic headlines.</strong><p>The public research shelf is currently empty because no flagship investigation has completed the full source, adversarial, standards and human-approval workflow yet. Live data above is operational; editorial publication is a separate gate.</p><Link href="/methodology">See why we separate data from conclusions →</Link></div>}</section>
    <Footer/>
  </main>
}
