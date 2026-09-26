import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import ts from 'typescript'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { feedIsFresh, newsFeeds, categoryLabels, pocketContexts } from '../lib/news/feeds.ts'

// Isolated unit fixtures only: no network, real editor session or database writes.
const require = createRequire(import.meta.url)
function unitModule(path, imports = {}) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8')
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const module = { exports: {} }
  vm.runInNewContext(compiled, { exports: module.exports, module, Date, console, require: name => imports[name] ?? require(name) }, { filename: path })
  return module.exports
}
const published = { issue_key: 'synthetic/edition', title: 'Synthetic <edition>', dek: 'Checked sources', issue_date: '2000-01-01', published_at: '2000-01-01T12:00:00Z', status: 'published', body_markdown: 'PRIVATE BODY MUST NOT LEAK' }
function fixture(rows = [], options = {}) {
  const queries = []
  const db = { from(table) {
    const query = { table, filters: [], orders: [] }
    const chain = {
      select(fields) { query.fields = fields; return chain },
      eq(key, value) { query.filters.push({ op: 'eq', key, value }); return chain },
      lte(key, value) { query.filters.push({ op: 'lte', key, value }); return chain },
      order(key, settings) { query.orders.push({ key, ...settings }); return chain },
      limit(limit) { query.limit = limit; return chain },
      then(resolve, reject) {
        queries.push(query)
        if (options.reject) return Promise.reject(new Error('Synthetic connection failure')).then(resolve, reject)
        // Intentionally ignore SQL filters to verify a staff-readable draft or
        // scheduled edition cannot leak through the public DTO either.
        return Promise.resolve({ data: rows, error: options.error ? { message: 'Synthetic query failure' } : null }).then(resolve, reject)
      },
    }
    return chain
  } }
  const load = unitModule('../lib/data/newsletter.ts', { '../supabase/server': { createClient: async () => db } }).getPublishedNewsletterIssues
  return { load, queries }
}
const mixed = fixture([
  published,
  { ...published, issue_key: 'draft', status: 'draft' },
  { ...published, issue_key: 'review', status: 'review' },
  { ...published, issue_key: 'approved', status: 'approved' },
  { ...published, issue_key: 'future', published_at: '9999-01-01T00:00:00Z' },
  { ...published, issue_key: 'missing', published_at: null },
  { ...published, issue_key: 'invalid', published_at: 'invalid' },
])
const data = await mixed.load(1)
assert.equal(data.unavailable, false)
assert.equal(data.issues.length, 1)
assert.equal(data.issues[0].issue_key, published.issue_key)
assert.equal(Object.hasOwn(data.issues[0], 'body_markdown'), false)
assert.equal(Object.hasOwn(data.issues[0], 'status'), false)
assert.deepEqual(Object.keys(data.issues[0]).sort(), ['dek', 'issue_date', 'issue_key', 'published_at', 'title'])
const query = mixed.queries[0]
assert.equal(query.table, 'newsletter_issues')
assert.equal(query.fields, 'issue_key,title,dek,issue_date,published_at,status')
assert.equal(query.limit, 1)
assert.deepEqual(query.filters, [{ op: 'eq', key: 'status', value: 'published' }, { op: 'lte', key: 'published_at', value: data.checkedAt }])
assert.deepEqual(query.orders, [{ key: 'published_at', ascending: false }, { key: 'issue_key', ascending: false }])
const bounded = fixture()
await bounded.load()
await bounded.load(500)
assert.ok(bounded.queries.every(q => q.limit === 12))
const empty = await fixture().load()
assert.equal(empty.unavailable, false)
assert.equal(empty.issues.length, 0)
for (const f of [fixture([], { error: true }), fixture([], { reject: true }), fixture(null), fixture([{ ...published, title: null }]), fixture([{ ...published, issue_date: 'invalid' }])]) {
  const failed = await f.load()
  assert.equal(failed.unavailable, true)
  assert.equal(failed.issues.length, 0)
}

const Link = { default: ({ children, ...props }) => React.createElement('a', props, children) }
const { newsDate } = unitModule('../components/news/NewsCard.tsx', { 'next/link': Link, '../../lib/news/feeds': { categoryLabels, pocketContexts } })
async function preview(result) {
  const { NewsletterPreview } = unitModule('../components/NewsletterPreview.tsx', {
    'next/link': Link,
    '../lib/data/newsletter': { getPublishedNewsletterIssues: async limit => { assert.equal(limit, 1); return result } },
    './news/NewsCard': { newsDate }, './NewsletterPreview.module.css': { default: {} },
  })
  return renderToStaticMarkup(await NewsletterPreview())
}
const publicHtml = await preview(data)
assert.match(publicHtml, /LATEST PUBLISHED EDITION/)
assert.match(publicHtml, /Synthetic &lt;edition&gt;/)
assert.match(publicHtml, /href="\/newsletter\/synthetic%2Fedition"/)
assert.doesNotMatch(publicHtml, /PRIVATE BODY MUST NOT LEAK/)
assert.match(publicHtml, /datetime="2000-01-01T12:00:00Z"/i)
assert.match(publicHtml, /href="\/newsletter#newsletter-signup"/)
assert.match(publicHtml, /No password or website account required/)
assert.match(await preview(empty), /No edition has been published yet/)
const failedHtml = await preview({ ...empty, unavailable: true })
assert.match(failedHtml, /Edition status is temporarily unavailable/)
assert.doesNotMatch(failedHtml, /No edition has been published yet/)
async function archive(result) {
  const page = unitModule('../app/newsletter/page.tsx', {
    'next/link': Link, '../../components/Header': { Header: () => null }, '../../components/Footer': { Footer: () => null },
    '../../components/NewsletterForm': { NewsletterForm: () => null },
    '../../lib/data/newsletter': { getPublishedNewsletterIssues: async () => result },
  })
  assert.equal(page.dynamic, 'force-dynamic')
  return renderToStaticMarkup(await page.default())
}
assert.match(await archive(data), /href="\/newsletter\/synthetic%2Fedition"/)
assert.match(await archive(empty), /No newsletter edition has been published yet/)
assert.match(await archive({ ...empty, unavailable: true }), /Published editions are temporarily unavailable/)
assert.doesNotMatch(await archive({ ...empty, unavailable: true }), /No newsletter edition has been published yet/)

const { NewsFreshness } = unitModule('../components/news/NewsFreshness.tsx', {
  '../../lib/news/feeds': { categoryLabels, feedIsFresh, newsFeeds }, './NewsCard': { newsDate },
})
const now = Date.parse('2026-09-22T06:30:00Z')
const currentFeed = { slug: 'fixture', name: 'Synthetic source', source_url: 'https://example.com/feed', category: 'finance', status: 'healthy', last_checked_at: '2026-09-22T06:00:00Z', last_success_at: '2026-09-22T06:00:00Z', latest_published_at: '2026-09-09T13:00:00Z' }
const currentFeeds = newsFeeds.map(source => ({ ...currentFeed, slug: source.slug, name: source.name, source_url: source.url, category: source.category }))
const freshness = (feeds, unavailable = false) => renderToStaticMarkup(React.createElement(NewsFreshness, { feeds, unavailable, now }))
const freshHtml = freshness(currentFeeds)
assert.match(freshHtml, /All source checks are current/)
assert.match(freshHtml, /4\/4 current/)
assert.match(freshHtml, /datetime="2026-09-22T06:00:00.000Z"/i)
assert.match(freshHtml, /latest source publication: 9 Sept 2026/)
assert.match(freshHtml, /not that a new story was published/)
assert.match(freshHtml, /Publisher activity by topic \(last 7 days\)/)
assert.match(freshHtml, /data-topic="finance">[\s\S]*No publisher item within the last 7 days is recorded/)
assert.match(freshHtml, /href="https:\/\/www.ecb.europa.eu\/rss\/press.html"/)
const activityFeeds = currentFeeds.map(feed => ({
  ...feed,
  latest_published_at: feed.category === 'finance' ? '2026-09-21T06:00:00Z' : feed.category === 'business' ? '2026-09-09T13:00:00Z' : feed.category === 'energy' ? null : '2026-09-23T00:00:00Z',
}))
const activityHtml = freshness(activityFeeds)
assert.match(activityHtml, /data-topic="finance">[\s\S]*within the last 7 days/)
assert.match(activityHtml, /data-topic="business">[\s\S]*No publisher item within the last 7 days is recorded/)
assert.match(activityHtml, /data-topic="energy">[\s\S]*Publisher date unavailable; topic recency cannot be assessed/)
assert.match(activityHtml, /data-topic="geopolitics">[\s\S]*Publisher date unavailable; topic recency cannot be assessed/, 'Future publication metadata is not treated as current')
const delayedGeopolitics = freshness(currentFeeds.map(feed => feed.category === 'geopolitics' ? { ...feed, last_success_at: '2026-09-21T04:30:00Z' } : feed))
assert.match(delayedGeopolitics, /data-topic="geopolitics">[\s\S]*Source check is delayed, so newer activity may be missing/)
const missingFeedHtml = freshness(currentFeeds.slice(1))
assert.match(missingFeedHtml, /3\/4 current/)
assert.doesNotMatch(missingFeedHtml, /All source checks are current/)
assert.match(freshness([...currentFeeds.slice(1), currentFeeds[1], currentFeed]), /3\/4 current/, 'Duplicate or unknown sources cannot cover a missing configured feed')
for (const feed of [
  { ...currentFeed, status: 'error' },
  { ...currentFeed, last_success_at: '2026-09-21T04:30:00Z' }, // exactly 26h is not current
  { ...currentFeed, last_success_at: '2026-09-22T07:00:00Z' }, // no future freshness
  { ...currentFeed, last_success_at: 'invalid' },
  { ...currentFeed, last_success_at: null },
]) {
  const html = freshness([{ ...feed, slug: newsFeeds[0].slug }])
  assert.doesNotMatch(html, /All source checks are current/)
  assert.match(html, /0\/4 current/)
  assert.match(html, /data-warning="true"/)
}
assert.match(freshness([]), /No successful check is assumed/)
assert.doesNotMatch(freshness([]), /All source checks are current/)
assert.match(freshness([currentFeed], true), /News is temporarily unavailable/)
console.log('Homepage briefing QA passed: public-only metadata, bounded query, future/draft exclusion, safe archive failures, encoded edition links, email-only entry and distinct source/publication freshness.')
