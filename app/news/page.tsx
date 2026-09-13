import Link from 'next/link'
import { Header } from '../../components/Header'
import { Footer } from '../../components/Footer'
import { NewsExplorer } from '../../components/news/NewsExplorer'
import { getDailyNews } from '../../lib/news/data'
import { TradingViewNews } from '../../components/news/TradingViewNews'
import { TradingViewCard } from '../../components/news/TradingViewCard'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Daily News — finance, business & your pocket', description: 'Source-linked financial, business, energy and geopolitical headlines, with plain-English guides to everyday costs.', alternates: { canonical: '/news' } }
export default async function NewsPage() {
  const data = await getDailyNews()
  return <main><Header/><section className="shell dailyNews"><span className="eyebrow">DAILY NEWS</span><h1>World events.<br/>Everyday consequences.</h1><p className="newsIntro">Follow official financial, business, energy and geopolitical updates. Read the source, then explore how rates, trade and supply changes can affect your money.</p><Link className="newsGuideLink" href="/learn/market-events">Understand CPI, PCE, FOMC, jobs, PPI and GDP in plain English →</Link><TradingViewCard/><NewsExplorer {...data}/><TradingViewNews/><Link className="newsGuideLink" href="/events">Look ahead: upcoming economic releases →</Link><Link className="newsGuideLink" href="/newsletter#newsletter-signup">Subscribe to the Market Letter — email only →</Link></section><Footer/></main>
}
