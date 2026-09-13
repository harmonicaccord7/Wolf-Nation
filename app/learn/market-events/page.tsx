import Link from 'next/link'
import { Header } from '../../../components/Header'
import { Footer } from '../../../components/Footer'
import { MarketBackground, BackgroundNotes, BackgroundAttribution } from '../../../components/events/MarketBackground'
import { marketBackgrounds } from '../../../lib/events/background'

export const metadata = { title: 'CPI, interest rates & market news in plain English', description: 'Understand CPI, PCE, FOMC, jobs, PPI, GDP, gold, crypto and the possible effects on everyday costs.', alternates: { canonical: '/learn/market-events' } }

export default function MarketEventsGuide() {
  return <main><Header/><section className="shell plainGuide"><span className="eyebrow">MARKETS IN PLAIN ENGLISH</span><h1>What the news can mean for your money.</h1><p className="guideIntro">Start with the basics. Then compare what happened with what was expected, and consider what could change the story.</p><nav className="guideJumpLinks" aria-label="Choose an explanation">{marketBackgrounds.map(item => <a href={'#' + item.key} key={item.key}>{item.title.split(' — ')[0]}</a>)}</nav><BackgroundNotes/>{marketBackgrounds.map(item => <MarketBackground item={item} key={item.key}/>)}<BackgroundAttribution/><div className="guideNext"><Link href="/news">Read Daily News →</Link><Link href="/events">See the event calendar →</Link></div></section><Footer/></main>
}
