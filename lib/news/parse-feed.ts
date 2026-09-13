import { XMLParser, XMLValidator } from 'fast-xml-parser'
import type { NewsFeed } from './feeds.ts'

export const MAX_FEED_BYTES = 1_500_000
export async function fetchNewsFeed(feed: NewsFeed, fetcher: typeof fetch = fetch) {
  let url = feed.url
  for (let hop = 0; hop < 4; hop++) {
    const response = await fetcher(url, { redirect: 'manual', headers: { 'user-agent': 'KAPORAL-News/1.0 (+https://www.kaporalintelligence.com)', accept: 'application/rss+xml,application/atom+xml,application/xml,text/xml' }, signal: AbortSignal.timeout(20_000) })
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location'); await response.body?.cancel()
      if (!location) throw new Error('Missing feed redirect')
      const next = new URL(location, url)
      if (next.protocol !== 'https:' || next.hostname !== new URL(feed.url).hostname || next.username || next.password || next.port) throw new Error('Unapproved feed redirect')
      url = next.href; continue
    }
    if (!response.ok) throw new Error('Publisher returned HTTP ' + response.status)
    return readFeedBody(response)
  }
  throw new Error('Too many feed redirects')
}
const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: false, trimValues: true, processEntities: true, htmlEntities: false, ignoreDeclaration: true })
const list = (value: unknown): any[] => value == null ? [] : Array.isArray(value) ? value : [value]
const text = (value: any): string => typeof value === 'string' ? value : typeof value?.['#text'] === 'string' ? value['#text'] : ''

export function articleUrl(value: string, feed: NewsFeed): string | null {
  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port || !feed.articleHosts.includes(url.hostname)) return null
    url.protocol = 'https:'; url.hash = ''
    for (const key of [...url.searchParams.keys()]) if (key.startsWith('utm_')) url.searchParams.delete(key)
    return url.href.length <= 2048 ? url.href : null
  } catch { return null }
}

export function parseNewsFeed(xml: string, feed: NewsFeed, now = Date.now()) {
  if (new TextEncoder().encode(xml).byteLength > MAX_FEED_BYTES || /<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('Unsupported feed document')
  if (XMLValidator.validate(xml) !== true) throw new Error('Invalid XML feed')
  const parsed = parser.parse(xml)
  const entries = parsed.rss?.channel?.item ?? parsed.feed?.entry ?? parsed['rdf:RDF']?.item
  if (!entries) throw new Error('Feed contains no entries')
  const rows = new Map<string, { feed_slug: string; title: string; url: string; category: NewsFeed['category']; published_at: string; last_seen_at: string }>()
  let rejected = 0
  for (const item of list(entries).slice(0, 200)) {
    const title = text(item.title).replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
    const link = list(item.link).find(link => typeof link === 'string' || !link?.['@_rel'] || link['@_rel'] === 'alternate')
    const url = articleUrl(text(link) || link?.['@_href'] || '', feed)
    // A revised/update date is not invented as the publication date.
    // UN Geneva explicitly supplies CEST/CET; JS Date.parse does not recognize them.
    const published = Date.parse(text(item.pubDate ?? item.published ?? item['dc:date']).replace(/\sCEST$/i, ' +0200').replace(/\sCET$/i, ' +0100'))
    if (!title || title.length > 400 || !url || !Number.isFinite(published) || published > now || published < now - 90 * 86400_000) { rejected++; continue }
    rows.set(url, { feed_slug: feed.slug, title, url, category: feed.category, published_at: new Date(published).toISOString(), last_seen_at: new Date(now).toISOString() })
  }
  if (!rows.size) throw new Error('No recent dated headlines passed validation')
  return { rows: [...rows.values()].sort((a, b) => b.published_at.localeCompare(a.published_at)), rejected }
}

export async function readFeedBody(response: Response) {
  if (!response.body) throw new Error('Empty feed response')
  const reader = response.body.getReader(), chunks: Uint8Array[] = []
  let size = 0
  try {
    for (;;) {
      const { value, done } = await reader.read(); if (done) break
      size += value.byteLength
      if (size > MAX_FEED_BYTES) throw new Error('Feed exceeds size limit')
      chunks.push(value)
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock() }
  const data = new Uint8Array(size); let offset = 0
  for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.byteLength }
  const prefix = new TextDecoder().decode(data.subarray(0, 200))
  const encoding = /encoding\s*=\s*["'](iso-8859-1|windows-1252)["']/i.test(prefix) ? 'windows-1252' : 'utf-8'
  return new TextDecoder(encoding).decode(data)
}
