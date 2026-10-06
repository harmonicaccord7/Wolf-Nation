import type { FeedState, NewsFeed } from './news/feeds'

export type PublicSourceStatus = 'current' | 'error' | 'stale' | 'pending' | 'missing' | 'unknown'

type HealthSource = Pick<NewsFeed, 'slug' | 'name' | 'url' | 'publicUrl' | 'category'>

type BuildHealthInput = {
  checkedAt: string
  marketCapturedAt: string | null
  configuredSources: HealthSource[]
  feedStates: FeedState[]
}

function timestampAtOrBefore(value: string | null, now: number) {
  if (!value) return null
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) && timestamp <= now ? timestamp : null
}

function ageMinutes(value: string | null, now: number) {
  const timestamp = timestampAtOrBefore(value, now)
  return timestamp == null ? null : Math.max(0, Math.round((now - timestamp) / 60_000))
}

export function publicSourceStatus(feed: FeedState | undefined, now: number): PublicSourceStatus {
  if (!feed) return 'missing'
  if (feed.status === 'error') return 'error'

  const lastSuccess = timestampAtOrBefore(feed.last_success_at, now)
  if (feed.status === 'healthy' && lastSuccess != null && now - lastSuccess < 26 * 3_600_000) return 'current'
  if (lastSuccess != null) return 'stale'
  return 'pending'
}

function sourceRows(configuredSources: HealthSource[], feedStates: FeedState[], now: number, unavailable = false) {
  return configuredSources.map(source => {
    const feed = feedStates.find(row => row.slug === source.slug)
    return {
      slug: source.slug,
      name: source.name,
      category: source.category,
      sourceUrl: source.publicUrl ?? source.url,
      status: unavailable ? 'unknown' as const : publicSourceStatus(feed, now),
      lastSuccessfulCheckAt: feed?.last_success_at ?? null,
      latestPublisherItemAt: feed?.latest_published_at ?? null,
    }
  })
}

export function buildPublicHealth({ checkedAt, marketCapturedAt, configuredSources, feedStates }: BuildHealthInput) {
  const now = Date.parse(checkedAt)
  if (!Number.isFinite(now)) throw new Error('Invalid health-check timestamp')

  const marketAgeMinutes = ageMinutes(marketCapturedAt, now)
  const marketFeed = marketAgeMinutes == null ? 'empty' : marketAgeMinutes <= 20 ? 'fresh' : 'stale'
  const sources = sourceRows(configuredSources, feedStates, now)
  const currentSources = sources.filter(source => source.status === 'current').length
  const successfulChecks = sources
    .map(source => timestampAtOrBefore(source.lastSuccessfulCheckAt, now))
    .filter((timestamp): timestamp is number => timestamp != null)
  const latestSuccessfulCheckAt = successfulChecks.length
    ? new Date(Math.max(...successfulChecks)).toISOString()
    : null
  const dailyNewsStatus = configuredSources.length > 0 && currentSources === configuredSources.length ? 'current' : 'degraded'
  const status = marketFeed === 'fresh' && dailyNewsStatus === 'current' ? 'ok' : 'degraded'

  return {
    schemaVersion: 2,
    status,
    application: 'kaporal-intelligence',
    database: 'connected',
    marketFeed,
    marketAsOf: marketCapturedAt,
    marketAgeMinutes,
    dailyNews: {
      status: dailyNewsStatus,
      currentSources,
      configuredSources: configuredSources.length,
      latestSuccessfulCheckAt,
      sources,
    },
    ingestionDiagnostics: {
      visibility: 'editor-only',
      exposed: false,
    },
    checkedAt,
  }
}

export function buildUnavailablePublicHealth(checkedAt: string, configuredSources: HealthSource[]) {
  const now = Date.parse(checkedAt)
  return {
    schemaVersion: 2,
    status: 'degraded',
    application: 'kaporal-intelligence',
    database: 'unavailable',
    marketFeed: 'unknown',
    marketAsOf: null,
    marketAgeMinutes: null,
    dailyNews: {
      status: 'unknown',
      currentSources: 0,
      configuredSources: configuredSources.length,
      latestSuccessfulCheckAt: null,
      sources: sourceRows(configuredSources, [], Number.isFinite(now) ? now : Date.now(), true),
    },
    ingestionDiagnostics: {
      visibility: 'editor-only',
      exposed: false,
    },
    checkedAt,
  }
}
