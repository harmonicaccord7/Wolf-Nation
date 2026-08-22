import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Header } from '../../../components/Header'
import { Footer } from '../../../components/Footer'
import { HistoryChart } from '../../../components/intelligence/HistoryChart'
import { getSeriesHistory } from '../../../lib/data/intelligence'
import { formatIntelligenceValue,formatObservationDate } from '../../../lib/format-intelligence'

export async function generateMetadata({params}:{params:Promise<{code:string}>}){const {code}=await params;const s=await getSeriesHistory(code,2);return s?{title:`${s.label} Data`,description:`Historical ${s.label} observations with provider and source provenance.`}:{title:'Data Series'}}

export default async function DataSeriesPage({params}:{params:Promise<{code:string}>}){
 const {code}=await params; const series=await getSeriesHistory(code.toUpperCase(),500); if(!series)notFound()
 const latest=series.latest
 return <main className="intelligencePage"><Header/>
  <section className="deskHero"><div className="shell deskHeroGrid"><div><span className="eyebrow">DATA EXPLORER · {series.code}</span><h1>{series.label}</h1><p>{series.description||'Verified observations stored by KAPORAL INTELLIGENCE with source provenance.'}</p></div><aside><small>LATEST OBSERVATION</small><strong>{formatIntelligenceValue(latest?.value,series.unit)}</strong><span>{latest?.provider??'Provider unavailable'} · {formatObservationDate(latest?.observedAt,series.frequency)}</span></aside></div></section>
  <section className="shell liveSection"><div className="liveSectionHead"><div><span className="eyebrow">HISTORY</span><h2>Observation timeline</h2></div><p>{series.frequency??'Series'} · {series.history.length} stored points</p></div><HistoryChart points={series.history} label={series.label} unit={series.unit}/>{series.source_url&&<p className="seriesSource">Primary source: <a href={series.source_url} target="_blank" rel="noreferrer">open provider source ↗</a></p>}</section>
  <section className="deskCoverage"><div className="shell coverageGrid"><div><span className="eyebrow">PROVENANCE</span><h2>What this chart does — and does not — claim.</h2><p>Values are provider observations stored with their original observation dates. Missing dates are not interpolated. A plotted line connects available observations for visual orientation; it is not a claim that unobserved intermediate values are known.</p></div><div className="coverageCards"><div><small>01</small><b>No fabricated points</b></div><div><small>02</small><b>Provider retained per observation</b></div><div><small>03</small><b>Observation date preserved</b></div><div><small>04</small><b>Missing data remains missing</b></div></div></div></section>
  <section className="shell researchOSCallout"><span className="eyebrow">EXPLORE</span><h2>Return to the connected intelligence desks.</h2><p>Historical series support context; published conclusions remain behind the separate evidence and human-review workflow.</p><div className="deskHeroActions"><Link className="goldButton" href="/markets">Markets</Link><Link className="glassButton" href="/macro">Macro</Link><Link className="glassButton" href="/africa">Africa</Link></div></section><Footer/></main>
}
