import Link from 'next/link'
import type { OverviewIntelligence } from '../lib/data/intelligence'
import { formatIntelligenceValue } from '../lib/format-intelligence'
import { dataFreshness } from '../lib/data/freshness'

export function SignalBoard({overview}:{overview:OverviewIntelligence}) {
  const mapping = [
    ['Macro','US10Y','U.S. 10-year yield'],['Liquidity','FED_FUNDS','Effective federal funds rate'],
    ['Volatility','BTC_OPTIONS_IV','BTC options implied volatility'],['Africa','NGA_INFLATION','Nigeria annual inflation'],
  ]
  const cards = mapping.map(([category,code,label]) => {
    const series=overview.metrics[code], latest=series?.latest
    return {category,label,code,value:formatIntelligenceValue(latest?.value,series?.unit),asOf:latest?.observedAt,provider:latest?.provider,frequency:series?.frequency,source:series?.sourceUrl}
  })
  const btc=overview.crypto.BTC
  cards.splice(2,0,{category:'Crypto',label:'Bitcoin price',code:'BTC',value:formatIntelligenceValue(btc?.price,'USD'),asOf:btc?.capturedAt,provider:btc?.provider,frequency:'market',source:'https://www.coingecko.com/'})
  return <section className="shell controlRoom" id="markets"><div className="sectionTitle"><div><span className="eyebrow">THE CONTROL ROOM</span><h2>Global Signal Board</h2></div><p>Explore the observed inputs behind our research. Predictive models remain experimental; these figures are measured data, not forecast scores.</p></div>
    <div className="signalBoard">{cards.map(card=><article key={card.category} className="signalCell"><div><span>{card.category}</span><em>{dataFreshness(card.asOf,card.frequency??null).label}</em></div><h3>{card.label}</h3><div className="signalNumber">{card.value}</div><p><Link href={'/data/'+card.code.toLowerCase()}>Explore chart →</Link></p><small className="sourceStamp">{card.provider??'Source unavailable'}{card.asOf&&' · '+new Date(card.asOf).toUTCString()}{card.source&&<> · <a href={card.source} target="_blank" rel="noreferrer">Source ↗</a></>}</small></article>)}
      <article className="signalCell"><div><span>Geopolitics</span><em>Evidence desk</em></div><h3>Map the event and its exposures</h3><p>Review the source, affected assets and alternative explanations. No validated numeric prediction is available.</p><Link href="/events">Open event research →</Link><p><Link href="/methodology">Model methodology →</Link></p></article>
    </div>
  </section>
}
