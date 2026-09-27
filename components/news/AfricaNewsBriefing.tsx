import Link from 'next/link'
import { feedIsFresh, newsFeeds, type FeedState, type NewsItem } from '../../lib/news/feeds'
import { NewsCard, newsDate } from './NewsCard'

const sourceSlug = 'world-bank-africa'
const sevenDays = 7 * 24 * 60 * 60 * 1000

export function AfricaNewsBriefing({ headlines, feeds, unavailable, viewedAt }: { headlines: NewsItem[]; feeds: FeedState[]; unavailable: boolean; viewedAt: string }) {
  const items = headlines.filter(item => item.category === 'africa').slice(0, 6)
  const feed = feeds.find(item => item.slug === sourceSlug)
  const source = newsFeeds.find(item => item.slug === sourceSlug)!
  const now = Date.parse(viewedAt)
  const published = Date.parse(feed?.latest_published_at ?? '')
  const hasPublished = Number.isFinite(published) && published <= now
  const recent = hasPublished && now - published <= sevenDays
  const current = feed ? feedIsFresh(feed, now) : false
  const status = unavailable
    ? 'Africa source status is temporarily unavailable.'
    : !feed
      ? 'The official Africa source has not completed its first recorded check yet.'
      : !current
        ? 'The latest source check is delayed or unsuccessful; newer items may be missing.'
        : !hasPublished
          ? 'The source check is current, but no valid publisher date is recorded.'
          : recent
            ? `Latest recorded publisher item: ${newsDate(new Date(published).toISOString())}; within the last 7 days.`
            : `No publisher item within the last 7 days is recorded. Latest recorded item: ${newsDate(new Date(published).toISOString())}.`

  return <section className="shell liveSection africaNewsBriefing" aria-labelledby="africa-news-heading">
    <div className="liveSectionHead"><div><span className="eyebrow">OFFICIAL AFRICA UPDATES</span><h2 id="africa-news-heading">What is changing across the region?</h2></div><p>Dated publisher headlines stay separate from KAPORAL analysis. Read the original release before drawing a conclusion.</p></div>
    <div className="africaNewsStatus" data-warning={unavailable || !current}>
      <p><strong>{status}</strong></p>
      <p>Coverage currently includes World Bank Sub-Saharan Africa press releases. It is not a complete Africa newswire and does not yet cover North Africa or every national central bank.</p>
      <a href={feed?.source_url ?? source.publicUrl ?? source.url} target="_blank" rel="noreferrer">Open the official source ↗</a>
    </div>
    {items.length ? <div className="newsGrid">{items.map(item => <NewsCard key={item.id} item={item} publisher={feed?.name ?? source.name}/>)}</div> : <div className="newsEmpty"><p>No valid Africa headline is recorded in the last 30 days. Missing coverage is not filled with synthetic news.</p></div>}
    <Link className="newsGuideLink" href="/news">Browse all dated Daily News sources →</Link>
  </section>
}
