import Link from 'next/link'
import { getDailyNews } from '../../lib/news/data'
import { NewsCard } from './NewsCard'
import { NewsFreshness } from './NewsFreshness'

export async function NewsPreview() {
  const data = await getDailyNews()
  // Keep a mix visible; do not let one busy publisher hide geopolitical coverage.
  const chosen = [...new Set(data.headlines.map(item => item.category))].map(category => data.headlines.find(item => item.category === category)!).slice(0, 4)
  return <section className="shell newsPreview" aria-labelledby="daily-news-heading"><div className="newsSectionHeading"><div><span className="eyebrow">DAILY NEWS · YOUR POCKET</span><h2 id="daily-news-heading">What is changing around you?</h2><p>Finance, business, energy and global events, with the original sources.</p></div><Link href="/news">Read all Daily News →</Link></div><NewsFreshness feeds={data.feeds} unavailable={data.unavailable} now={Date.parse(data.viewedAt)}/>{chosen.length ? <div className="newsGrid">{chosen.map(item => <NewsCard key={item.id} item={item} publisher={data.feeds.find(feed => feed.slug === item.feed_slug)?.name ?? item.feed_slug} compact/>)}</div> : <div className="newsEmpty"><p>Source headlines are temporarily unavailable. Open Daily News for source checks and the latest available updates.</p></div>}<Link className="newsGuideLink" href="/learn/market-events">What can CPI, interest rates and global events mean for crypto, gold and your bills? →</Link></section>
}
