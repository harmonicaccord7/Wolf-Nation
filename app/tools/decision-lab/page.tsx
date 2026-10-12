import Link from 'next/link'
import { Header } from '../../../components/Header'
import { Footer } from '../../../components/Footer'
import { DecisionLab, type DecisionQuote } from '../../../components/tools/DecisionLab'
import { getOverviewIntelligence } from '../../../lib/data/intelligence'
import { getSavedScenarios } from '../../../lib/data/decision-scenarios'
import styles from '../../../components/tools/DecisionLab.module.css'

export const dynamic = 'force-dynamic'
export async function generateMetadata({searchParams}:{searchParams:Promise<{scenario?:string}>}) { const {scenario}=await searchParams; return { title: 'Decision Lab — compare buy, wait, stage, call and put', description: 'A free interactive scenario tool. Compare costs, break-even prices and potential losses using your own assumptions and source-labelled reference prices.', alternates: { canonical: '/tools/decision-lab' }, ...(scenario ? {robots:{index:false,follow:false,noarchive:true,nosnippet:true}} : {}) } }

export default async function DecisionLabPage({searchParams}:{searchParams:Promise<{scenario?:string}>}) {
  const {scenario}=await searchParams
  const savedPromise=scenario?getSavedScenarios(scenario):null
  let quotes: DecisionQuote[] = []
  try {
    const overview = await getOverviewIntelligence()
    quotes = ['BTC', 'ETH', 'SOL'].flatMap(symbol => {
      const asset = overview.crypto[symbol]
      return asset?.price && asset.price > 0 ? [{ symbol, label: symbol === 'BTC' ? 'Bitcoin' : symbol === 'ETH' ? 'Ethereum' : 'Solana', price: asset.price, provider: asset.provider, asOf: asset.capturedAt, href: `/data/${symbol.toLowerCase()}` }] : []
    })
    const gold = overview.metrics.GOLD
    if (gold?.latest?.value && gold.latest.value > 0) quotes.push({ symbol: 'GOLD', label: 'Gold futures reference', price: gold.latest.value, provider: gold.latest.provider, asOf: gold.latest.observedAt, href: '/data/gold' })
  } catch { /* The manual calculator remains usable when a quote is unavailable. */ }
  const saved=savedPromise?await savedPromise:null
  return <main className="intelligencePage"><Header/>
    <section className="deskHero"><div className="shell deskHeroGrid"><div><span className="eyebrow">FREE DECISION TOOL</span><h1>Test the decision.<br/>See the cost.</h1><p>Compare buying now, waiting, buying in stages, or buying a call or put. Change the assumptions and see the result immediately. No account or payment is needed.</p></div><aside><small>YOUR ASSUMPTIONS, VISIBLE</small><strong>What happens if the market moves up, down or nowhere?</strong><span>This calculates possible outcomes. It does not predict which outcome will happen.</span></aside></div></section>
    <section className="shell liveSection"><DecisionLab initialQuotes={quotes} initialScenario={saved?.scenarios[0]} savedError={saved&&!saved.authenticated?'Sign in to open your private saved scenario.':saved?.error}/></section>
    <section className={`shell ${styles.explainer}`}><h2>From a news event to a decision</h2><ol><li>Read the event and compare the release with what the market expected.</li><li>Choose your own possible price changes. A CPI or FOMC release does not produce a fixed Bitcoin or gold return.</li><li>Compare the cost, cash left, break-even price and loss. Download the assumptions so you can check the decision later.</li></ol><div className="deskHeroActions"><Link className="goldButton" href="/events">Upcoming market events</Link><Link className="glassButton" href="/learn/market-events">Plain-English event guides</Link><Link className="glassButton" href="/track-record">Model evidence and limitations</Link></div><h3>What the calculation includes</h3><p>The same cash budget is used for each alternative. The percentage fee applies when buying exposure or an option premium and when selling exposure or receiving an option payoff. Staging assumes that both purchases happen at the prices you enter; it is not a forecast of the path. Cash interest, tax, inflation, spread and currency changes are excluded.</p><p>Options are hypothetical long positions valued at expiry in USD. Premium and strike are your inputs, not current option quotes. Whole contracts are used; unused cash stays in the result. The gold price is a futures reference, not a spot quote or a standard futures-contract specification. Actual settlement, contract size, margin and broker fees must be checked separately. No leverage, short options or automatic exercise is simulated.</p><p>A call or put can lose its entire premium even if your market view is partly right. Holding cash avoids this simulated market loss but can miss upside and lose purchasing power. Read the <a href="https://www.investor.gov/introduction-investing/investing-basics/glossary/options" target="_blank" rel="noreferrer">SEC Investor.gov options explanation ↗</a> and <Link href="/disclosures">KAPORAL disclosures</Link>.</p></section><Footer/>
  </main>
}
