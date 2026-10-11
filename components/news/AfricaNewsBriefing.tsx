import Link from 'next/link'
import { feedIsFresh, newsFeeds, type FeedState, type NewsItem } from '../../lib/news/feeds'
import { NewsCard, newsDate } from './NewsCard'

const sources = newsFeeds.filter(source => source.category === 'africa')
const sevenDays = 7 * 24 * 60 * 60 * 1000

function sourceStatus(feed: FeedState | undefined, unavailable: boolean, now: number) {
  const published = Date.parse(feed?.latest_published_at ?? '')
  const hasPublished = Number.isFinite(published) && published <= now
  const recent = hasPublished && now - published <= sevenDays
  const current = feed ? feedIsFresh(feed, now) : false
  const status = unavailable
    ? 'Africa source status is temporarily unavailable.'
    : !feed
      ? 'This source has not completed its first recorded check yet.'
      : !current
        ? 'The latest source check is delayed or unsuccessful; newer items may be missing.'
        : !hasPublished
          ? 'The source check is current, but no valid publisher date is recorded.'
          : recent
            ? `Latest recorded publisher item: ${newsDate(new Date(published).toISOString())}; within the last 7 days.`
            : `No publisher item within the last 7 days is recorded. Latest recorded item: ${newsDate(new Date(published).toISOString())}.`
  return { status, current }
}

export function AfricaNewsBriefing({ headlines, feeds, unavailable, viewedAt }: { headlines: NewsItem[]; feeds: FeedState[]; unavailable: boolean; viewedAt: string }) {
  // Reserve room for both coverage feeds; a busy feed must not hide the other.
  const items = sources.flatMap(source => headlines
    .filter(item => item.category === 'africa' && item.feed_slug === source.slug)
    .sort((a, b) => b.published_at.localeCompare(a.published_at))
    .slice(0, 3))
    .sort((a, b) => b.published_at.localeCompare(a.published_at))
  const now = Date.parse(viewedAt)

  return <section className="shell liveSection africaNewsBriefing" aria-labelledby="africa-news-heading">
    <div className="liveSectionHead"><div><span className="eyebrow">OFFICIAL AFRICA UPDATES</span><h2 id="africa-news-heading">What is changing across the region?</h2></div><p>Dated publisher headlines stay separate from KAPORAL analysis. Read the original release before drawing a conclusion.</p></div>
    <p>Coverage includes World Bank Sub-Saharan Africa press releases and North Africa releases tagged Algeria, Egypt, Libya, Morocco or Tunisia. This is not a complete Africa newswire; local central banks and regional markets remain coverage gaps.</p>
    <p>African Development Bank updates are currently unavailable here. Each source's last publisher date is shown below; a successful check does not mean a new story was published today.</p>
    {sources.map(source => {
      const feed = feeds.find(item => item.slug === source.slug)
      const { status, current } = sourceStatus(feed, unavailable, now)
      return <div key={source.slug} className="africaNewsStatus" data-source={source.slug} data-warning={unavailable || !current}>
        <p><strong>{source.name}</strong></p>
        <p>{status}</p>
        <a href={source.publicUrl ?? source.url} target="_blank" rel="noreferrer">Open {source.name} ↗</a>
      </div>
    })}
    {items.length ? <div className="newsGrid">{items.map(item => <NewsCard key={item.id} item={item} publisher={sources.find(source => source.slug === item.feed_slug)!.name}/>)}</div> : <div className="newsEmpty"><p>No valid Africa headline is recorded in the last 30 days. Missing coverage is not filled with synthetic news.</p></div>}
    <Link className="newsGuideLink" href="/news">Browse all dated Daily News sources →</Link>
  </section>
}
