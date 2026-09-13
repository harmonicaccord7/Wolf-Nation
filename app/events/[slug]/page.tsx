import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Header } from '../../../components/Header'
import { Footer } from '../../../components/Footer'
import { SaveToWatchlist } from '../../../components/SaveToWatchlist'
import { EventTiming } from '../../../components/events/EventExplorer'
import { HistoryChart } from '../../../components/intelligence/HistoryChart'
import { getEventBySlug } from '../../../lib/events/calendar-data'
import { scenariosForEvent } from '../../../lib/events/scenarios'
import { getChartSeries } from '../../../lib/data/chart-series'
import { backgroundForEvent } from '../../../lib/events/background'
import { MarketBackground, BackgroundAttribution } from '../../../components/events/MarketBackground'
export async function generateMetadata({ params }: { params: Promise<{slug:string}> }) {
  const {slug} = await params, {event} = await getEventBySlug(slug)
  return {title:event ? event.title : 'Event not found',alternates:{canonical:'/events/'+slug}}
}
export default async function EventDetail({params}:{params:Promise<{slug:string}>}) {
  const {slug}=await params
  const [{event},btc]=await Promise.all([getEventBySlug(slug),getChartSeries('BTC','30D').catch(()=>null)])
  if(!event) notFound()
  const scenarios=scenariosForEvent(event), values=event.values
  const format=(value:number|null|undefined)=>value==null?'Not available':Number(value).toLocaleString('en-GB',{maximumFractionDigits:4})+' '+(values?.unit??'')
  const passed=Date.parse(event.scheduledAt)<Date.now()
  return <main className="eventDetail"><Header/><section className="eventDetailHero"><div className="shell">
    <Link href="/events" className="backLink">← Event desk</Link><span className="eyebrow">{event.kind.toUpperCase()} · {event.provider}</span><h1>{event.title}</h1>
    <EventTiming event={event}/>{event.databaseId&&<SaveToWatchlist eventId={event.databaseId}/>}
    <div className="eventFactGrid"><div><small>Prior</small><strong>{format(values?.prior)}</strong><span>Previous reference period, in the same units.</span></div>
      <div><small>Consensus</small><strong>{format(values?.consensus)}</strong><span>A timestamped expectations source is required to measure a surprise.</span></div>
      <div><small>Actual</small><strong>{values?.actual!=null?format(values.actual):passed?'Release value not yet attached':'Awaiting release'}</strong><span>{values?.referencePeriod??'Check the provider for the published figure.'}</span></div>
      <div><small>Revised prior</small><strong>{format(values?.revisedPrior)}</strong><span>Revision of the previous reference period, when supplied.</span></div></div>
    {values?.sources&&<ul>{Object.entries(values.sources).map(([name,url])=><li key={name}><a href={url} target="_blank" rel="noreferrer">{name} source ↗</a></li>)}</ul>}
  </div></section><section className="shell eventDetailBody">
    <MarketBackground item={backgroundForEvent(event.kind)}/>
    <div className="eventNotice"><strong>Compare with expectations</strong><span>A number can rise from last month and still be lower than investors expected. Check both comparisons. Without a reliable expectations source, we cannot call the result a surprise. Slower inflation usually means prices rise more slowly, not that prices fall.</span></div>
    <p><Link href="/learn/market-events">Read all the plain-English explanations, including oil and geopolitical events →</Link></p>
    <h2>Conditional paths to evaluate</h2><div className="scenarioGrid">{scenarios.map(s=><article className="scenarioCard" key={s.key}><h3>{s.title}</h3><p><b>What to observe:</b> {s.observation}</p><p><b>Possible mechanism:</b> {s.mechanism}</p><h4>Options and checks</h4><ul>{s.options.map(option=><li key={option}>{option}</li>)}</ul><p className="invalidation"><b>What would weaken this interpretation:</b> {s.invalidation}</p><div className="scenarioSources">{s.sources.map(source=><a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.label} ↗</a>)}</div></article>)}</div>
    <h2>Buying, waiting or staging exposure</h2><div className="decisionTable"><table><thead><tr><th>Choice</th><th>Potential benefit</th><th>Tradeoff</th></tr></thead><tbody>
      <tr><th>Buy before the release</th><td>Exposure if the intended move starts immediately.</td><td>An adverse surprise, price gap or reversal can cause a loss.</td></tr>
      <tr><th>Wait for the release</th><td>More information and less exposure to the first surprise.</td><td>A move may be missed or the later entry may be less attractive.</td></tr>
      <tr><th>Stage exposure</th><td>Spread the timing of the decision.</td><td>Partial exposure can still lose value; multiple trades add costs.</td></tr>
      <tr><th>Stay uninvested</th><td>Keep capital available for another opportunity.</td><td>Forego participation if the asset rises.</td></tr>
    </tbody></table></div><p>Decide how long you plan to invest, how much you can afford to lose, and what would make you change your mind. The final decision remains yours.</p><BackgroundAttribution/>
    <h2>Bitcoin price context</h2>{btc?<HistoryChart points={btc.history} label="Bitcoin" unit="USD" initialRange="30D" endpoint="/api/intelligence/series/BTC" asOf={btc.asOf} markers={event.precision==='minute'?[{at:event.scheduledAt,label:event.title}]:[]}/>:<p>Price history is temporarily unavailable. No substitute chart is generated.</p>}
    <p>A timeline can show co-occurring price changes; it cannot establish that the release caused them. A date-only meeting has no exact announcement marker.</p>
    <div className="eventChartLinks"><Link href="/data/gold">Gold futures chart →</Link><Link href="/data/us10y">U.S. Treasury yield chart →</Link><Link href="/data/dxy">Dollar index chart →</Link></div>
  </section><Footer/></main>
}
