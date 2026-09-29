import Link from 'next/link'
import { Header } from '../../components/Header'
import { Footer } from '../../components/Footer'
import { categoryLabels, feedIsFresh, newsFeeds, type FeedState } from '../../lib/news/feeds'
import { createClient } from '../../lib/supabase/server'
import './status.css'

export const dynamic = 'force-dynamic'
export const metadata = { alternates: { canonical: '/status' }, title: 'System Status', description: 'Operational status, data freshness and public source health for KAPORAL INTELLIGENCE.' }

type FeedHealth = 'Operational' | 'Degraded' | 'Pending' | 'Stale'

function ageMinutes(iso: string | null, now: number) {
  if (!iso) return null
  const timestamp = Date.parse(iso)
  return Number.isFinite(timestamp) && timestamp <= now ? Math.max(0, Math.round((now - timestamp) / 60_000)) : null
}

function fmt(iso: string | null) {
  if (!iso || !Number.isFinite(Date.parse(iso))) return 'Never'
  return `${new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(iso))} UTC`
}

function feedHealth(feed: FeedState | undefined, now: number): FeedHealth {
  if (!feed) return 'Pending'
  if (feed.status === 'error') return 'Degraded'
  if (feedIsFresh(feed, now)) return 'Operational'
  const lastSuccess = Date.parse(feed.last_success_at ?? '')
  return Number.isFinite(lastSuccess) && lastSuccess <= now ? 'Stale' : 'Pending'
}

export default async function StatusPage() {
  const supabase = await createClient()
  const now = Date.now()
  const checkedAt = new Date(now).toISOString()
  const [{ data: market }, { data: feeds, error: feedError }, { count: points, error: pointsError }] = await Promise.all([
    supabase.from('market_snapshots').select('captured_at').order('captured_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('news_feeds').select('slug,name,source_url,category,last_checked_at,last_success_at,latest_published_at,status').order('name'),
    supabase.from('data_points').select('id', { count: 'exact', head: true }),
  ])
  const marketAge = ageMinutes(market?.captured_at ?? null, now)
  const marketState = marketAge == null ? 'Pending' : marketAge <= 20 ? 'Operational' : 'Stale'
  const publicFeeds = (feeds ?? []) as FeedState[]
  const configuredFeeds = newsFeeds.map(source => ({ source, feed: publicFeeds.find(feed => feed.slug === source.slug) }))
  const currentNewsChecks = configuredFeeds.filter(({ feed }) => feed && feedIsFresh(feed, now)).length
  const successfulNewsChecks = configuredFeeds
    .map(({ feed }) => Date.parse(feed?.last_success_at ?? ''))
    .filter(timestamp => Number.isFinite(timestamp) && timestamp <= now)
  const latestNewsCheck = successfulNewsChecks.length ? new Date(Math.max(...successfulNewsChecks)).toISOString() : null
  const newsDegraded = Boolean(feedError) || configuredFeeds.some(({ feed }) => feedHealth(feed, now) !== 'Operational')
  const degraded = marketState !== 'Operational' || newsDegraded

  return <main className="intelligencePage"><Header />
    <section className="deskHero"><div className="shell deskHeroGrid"><div><span className="eyebrow">OPERATIONAL TRANSPARENCY</span><h1>KAPORAL System Status</h1><p>Live health for the public market feed and official Daily News sources. A delayed or failed source is shown rather than replaced with synthetic values.</p></div><aside><small>CURRENT STATE</small><strong>{degraded ? 'DEGRADED' : 'OPERATIONAL'}</strong><span>Checked {fmt(checkedAt)}</span></aside></div></section>
    <section className="shell liveSection">
      <div className="accountabilityStats"><article><small>MARKET FEED</small><strong>{marketState}</strong><span>{marketAge == null ? 'No observation yet' : `${marketAge} min since latest snapshot`}</span></article><article><small>HISTORICAL POINTS</small><strong>{pointsError ? '—' : points ?? 0}</strong><span>{pointsError ? 'Count temporarily unavailable' : 'source-labelled observations stored'}</span></article><article><small>DAILY NEWS CHECKS</small><strong>{currentNewsChecks}/{configuredFeeds.length}</strong><span>official source checks current</span></article><article><small>LAST NEWS CHECK</small><strong>{latestNewsCheck ? fmt(latestNewsCheck) : '—'}</strong><span>successful source check, not publication time</span></article></div>
      <div className="liveSectionHead"><div><span className="eyebrow">PUBLIC SOURCE HEALTH</span><h2>Daily News sources</h2></div><p>Feeds are checked hourly. “Operational” means a successful source check within 26 hours; it does not claim that a publisher released a new story.</p></div>
      <div className="trackTable" role="table" aria-label="Daily News source status">{configuredFeeds.map(({ source, feed }) => <article className="trackRow" key={source.slug}><div><small>STATUS</small><b>{feedHealth(feed, now)}</b></div><div className="trackStatement"><strong><a href={source.publicUrl ?? source.url} target="_blank" rel="noreferrer">{source.name} ↗</a></strong><p>{categoryLabels[source.category]}</p><small>Last successful source check: {fmt(feed?.last_success_at ?? null)}</small></div><div><small>LATEST PUBLISHER ITEM</small><b>{fmt(feed?.latest_published_at ?? null)}</b></div></article>)}</div>
      <div className="statusNotes"><div className="emptyResearch"><strong>What this page does—and does not—show</strong><p>Public status uses safe, source-level metadata. Detailed ingestion logs remain restricted to authorised editors under row-level security. Publisher dates are preserved: an older latest item is not relabelled as today’s news.</p><p><Link className="sourceLink" href="/news">Open Daily News and source details →</Link></p></div>
      <div className="emptyResearch"><strong>Known external dependencies</strong><p>KAPORAL estimates Bitcoin ETF flows from issuer-published observations, with partial fund coverage and the observation date shown on the Bitcoin desk. Newsletter delivery uses a verified sending domain and requires deliberate double opt-in. The canonical live site is <b>www.kaporalintelligence.com</b>.</p></div></div>
    </section><Footer /></main>
}
