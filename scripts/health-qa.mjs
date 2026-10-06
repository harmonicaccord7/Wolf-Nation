import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildPublicHealth, buildUnavailablePublicHealth, publicSourceStatus } from '../lib/health.ts'

const checkedAt = '2026-10-06T07:00:00.000Z'
const configuredSources = [
  { slug: 'ecb', name: 'European Central Bank', url: 'https://www.ecb.europa.eu/rss/press.html', category: 'finance' },
  { slug: 'wto', name: 'WTO news', url: 'https://www.wto.org/library/rss/latest_news_e.xml', category: 'business' },
]
const feed = (slug, overrides = {}) => ({
  slug,
  name: slug.toUpperCase(),
  source_url: `https://example.com/${slug}`,
  category: slug === 'ecb' ? 'finance' : 'business',
  last_checked_at: '2026-10-06T06:05:00.000Z',
  last_success_at: '2026-10-06T06:05:00.000Z',
  latest_published_at: '2026-09-20T00:00:00.000Z',
  status: 'healthy',
  ...overrides,
})

const healthy = buildPublicHealth({
  checkedAt,
  marketCapturedAt: '2026-10-06T06:45:00.000Z',
  configuredSources,
  feedStates: [feed('ecb'), feed('wto')],
})
assert.equal(healthy.status, 'ok')
assert.equal(healthy.marketFeed, 'fresh')
assert.equal(healthy.dailyNews.status, 'current')
assert.equal(healthy.dailyNews.currentSources, 2)
assert.equal(healthy.dailyNews.configuredSources, 2)
assert.equal(healthy.dailyNews.sources[0].status, 'current')
assert.equal(healthy.dailyNews.sources[0].latestPublisherItemAt, '2026-09-20T00:00:00.000Z')
assert.equal(healthy.ingestionDiagnostics.visibility, 'editor-only')
assert.equal(healthy.ingestionDiagnostics.exposed, false)
assert.equal('providers' in healthy, false)
assert.equal('jobs' in healthy, false)

const degraded = buildPublicHealth({
  checkedAt,
  marketCapturedAt: '2026-10-06T06:45:00.000Z',
  configuredSources,
  feedStates: [feed('ecb', { status: 'error' })],
})
assert.equal(degraded.status, 'degraded')
assert.equal(degraded.dailyNews.currentSources, 0)
assert.deepEqual(degraded.dailyNews.sources.map(source => source.status), ['error', 'missing'])

assert.equal(publicSourceStatus(feed('ecb', { last_success_at: '2026-10-05T04:59:59.000Z' }), Date.parse(checkedAt)), 'stale')
assert.equal(publicSourceStatus(feed('ecb', { last_success_at: '2026-10-06T07:05:00.000Z' }), Date.parse(checkedAt)), 'pending')

const staleMarket = buildPublicHealth({
  checkedAt,
  marketCapturedAt: '2026-10-06T06:30:00.000Z',
  configuredSources,
  feedStates: [feed('ecb'), feed('wto')],
})
assert.equal(staleMarket.marketFeed, 'stale')
assert.equal(staleMarket.status, 'degraded')

const unavailable = buildUnavailablePublicHealth(checkedAt, configuredSources)
assert.equal(unavailable.database, 'unavailable')
assert.equal(unavailable.dailyNews.status, 'unknown')
assert.deepEqual(unavailable.dailyNews.sources.map(source => source.status), ['unknown', 'unknown'])

const noConfiguredSources = buildPublicHealth({ checkedAt, marketCapturedAt: '2026-10-06T06:45:00.000Z', configuredSources: [], feedStates: [] })
assert.equal(noConfiguredSources.status, 'degraded')
assert.equal(noConfiguredSources.dailyNews.status, 'degraded')

const route = readFileSync(new URL('../app/api/health/route.ts', import.meta.url), 'utf8')
assert.match(route, /from\('news_feeds'\)/)
assert.doesNotMatch(route, /from\('data_providers'\)/)
assert.doesNotMatch(route, /from\('ingestion_runs'\)/)
assert.match(route, /Cache-Control': 'no-store'/)

console.log('Health API QA passed: public source checks are accurate and private diagnostics remain restricted.')
