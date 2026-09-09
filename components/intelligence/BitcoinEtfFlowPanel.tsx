import Link from 'next/link'
import type { MetricSeries } from '../../lib/data/intelligence'
import { formatIntelligenceValue, formatObservationDate } from '../../lib/format-intelligence'

function stringArray(value:unknown){return Array.isArray(value)?value.filter((v):v is string=>typeof v==='string'):[]}
function sourceHost(url:string){try{return new URL(url).hostname}catch{return 'Issuer source'}}

export function BitcoinEtfFlowPanel({metrics}:{metrics:MetricSeries[]}){
  const flow=metrics.find(m=>m.code==='BTC_ETF_FLOW')
  const coveredAum=metrics.find(m=>m.code==='BTC_ETF_COVERED_AUM')
  const funds=metrics.find(m=>m.code==='BTC_ETF_FUNDS_COVERED')
  const metadata=flow?.latest?.metadata??{}
  const tickers=stringArray(metadata.funds_covered)
  const sources=stringArray(metadata.source_urls)
  const hasFlow=flow?.latest?.value!==null&&flow?.latest?.value!==undefined

  return <section className="shell etfFlowSection">
    <div className="etfFlowPanel">
      <div className="etfFlowIntro">
        <span className="etfEstimateBadge">KAPORAL ESTIMATED · FREE PRIMARY-SOURCE ENGINE</span>
        <h2>U.S. spot Bitcoin ETF flow, reconstructed from issuer data.</h2>
        <p>This is a KAPORAL-derived estimate, not an official consolidated exchange feed. The engine observes changes in issuer-published shares outstanding and multiplies the change by the prior stored NAV. Only funds that pass source and freshness validation are included.</p>
        <div className="etfFlowLinks"><Link href="/methodology">Read the methodology →</Link><Link href="/data/btc_etf_flow">Open history →</Link></div>
      </div>
      <div className="etfFlowKpis">
        <article><small>ESTIMATED NET FLOW</small><strong className={(flow?.latest?.value??0)>=0?'positive':'negative'}>{hasFlow?formatIntelligenceValue(flow?.latest?.value,'USD millions'):'—'}</strong><span>{formatObservationDate(flow?.latest?.observedAt,'daily')}</span></article>
        <article><small>FUNDS COVERED</small><strong>{funds?.latest?.value==null?'—':Math.round(funds.latest.value)}</strong><span>{tickers.length?tickers.join(' · '):'Coverage metadata pending'}</span></article>
        <article><small>COVERED AUM</small><strong>{formatIntelligenceValue(coveredAum?.latest?.value,'USD billions')}</strong><span>Assets represented by successfully captured funds</span></article>
      </div>
      <div className="etfFlowDisclosure">
        <strong>Coverage is intentionally partial.</strong>
        <p>Missing or blocked issuer data remains missing. KAPORAL does not fill gaps with fabricated values. The latest observation stores the exact fund coverage, source URLs and calculation metadata used for that estimate.</p>
        {sources.length>0&&<details><summary>Primary source set ({sources.length})</summary><ul>{sources.map(url=><li key={url}><a href={url} target="_blank" rel="noreferrer">{sourceHost(url)}</a></li>)}</ul></details>}
      </div>
    </div>
  </section>
}
