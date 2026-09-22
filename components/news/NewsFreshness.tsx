import { feedIsFresh, newsFeeds, type FeedState } from '../../lib/news/feeds'
import { newsDate } from './NewsCard'

const safeDate = (value: string | null) => value && Number.isFinite(Date.parse(value)) ? newsDate(value) : 'not yet available'

export function NewsFreshness({ feeds, unavailable, now }: { feeds: FeedState[]; unavailable: boolean; now: number }) {
  const configured = newsFeeds.map(source => ({ source, feed: feeds.find(feed => feed.slug === source.slug) }))
  const healthy = configured.filter(({ feed }) => feed && feedIsFresh(feed, now)).length
  const successful = configured.map(({ feed }) => Date.parse(feed?.last_success_at ?? '')).filter(time => Number.isFinite(time) && time <= now)
  const latestCheck = successful.length ? new Date(Math.max(...successful)).toISOString() : null
  return <section className="newsFreshness" aria-label="News feed status" data-warning={unavailable || healthy !== configured.length || !configured.length}>
    <p><strong>{unavailable ? 'News is temporarily unavailable.' : healthy === configured.length && configured.length ? 'All source checks are current.' : 'Some source checks are missing, delayed or unsuccessful.'}</strong></p>
    <p>Latest successful source check: {latestCheck ? <time dateTime={latestCheck}>{newsDate(latestCheck)}</time> : 'not yet available'}. Feeds are checked hourly. A current check means success within 26 hours, not that a new story was published.</p>
    <p>Headline dates belong to the original publishers. Older stories are not relabelled as today’s news.</p>
    <details id="news-source-checks"><summary>Source checks and coverage ({healthy}/{configured.length} current)</summary>
      <p>Official finance, trade, energy and UN briefings. This selection does not cover every company or every breaking story. The pocket guides explain possible channels; they do not claim a particular headline has already changed prices.</p>
      {!feeds.length && <p>Source metadata is unavailable. No successful check is assumed.</p>}
      <ul>{configured.map(({ source, feed }) => <li key={source.slug}><a href={source.url} target="_blank" rel="noreferrer">{source.name} ↗</a> — last successful check: {safeDate(feed?.last_success_at ?? null)}; latest source publication: {safeDate(feed?.latest_published_at ?? null)}. {feed && feedIsFresh(feed, now) ? 'Check current.' : 'Check delayed or unavailable.'}</li>)}</ul>
    </details>
  </section>
}
