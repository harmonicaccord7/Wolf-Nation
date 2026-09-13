import { BTC24_SOURCE, BTC24_DOCS, DAY, cleanCandles, iso } from './btc24.ts'
import type { Candle } from './btc24.ts'
export type HistorySnapshot = { provider: string; product: string; sourceUrl: string; sourceDocs: string; fetchedAt: string; vintage: string; candles: Candle[]; quality: ReturnType<typeof cleanCandles>['quality']; requests: { url: string; fetchedAt: string; responseHash: string; rows: number }[] }
export async function sha256(value: string) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), v => v.toString(16).padStart(2, '0')).join('') }

export async function fetchBtcHistory(cutoff: number, previous?: HistorySnapshot): Promise<HistorySnapshot> {
  const end = Math.floor(cutoff / DAY) * DAY, beginning = Date.parse('2017-01-01T00:00:00Z') / 1000
  if (previous && (previous.provider !== 'Coinbase Exchange' || previous.product !== 'BTC-USD')) throw new Error('Wrong historical provider')
  const validPrevious = previous ? cleanCandles(previous.candles, cutoff).candles : []
  // Reuse immutable closed history; refetch last three days to detect revisions.
  const start = validPrevious.length ? Math.max(beginning, validPrevious.at(-1)![0] - 2 * DAY) : beginning
  const fetched: unknown[] = [], requests: HistorySnapshot['requests'] = []
  for (let from = start; from < end; from += 250 * DAY) {
    const to = Math.min(from + 250 * DAY, end)
    const url = new URL(BTC24_SOURCE); url.searchParams.set('granularity', String(DAY)); url.searchParams.set('start', iso(from)); url.searchParams.set('end', iso(to))
    const response = await fetch(url, { headers: { 'user-agent': 'KAPORALResearch/0.1 (private daily BTC research)' }, signal: AbortSignal.timeout(15000) })
    if (!response.ok) throw new Error('Coinbase candles HTTP ' + response.status)
    const raw = await response.text(), body: unknown = JSON.parse(raw)
    if (!Array.isArray(body) || !body.length || body.length > 301) throw new Error('Invalid historical candle response')
    // Coinbase can include buckets preceding start; do not let them replace history.
    const range = body.filter(row => Array.isArray(row) && row[0] >= from && row[0] < to)
    fetched.push(...range); requests.push({ url: url.toString(), fetchedAt: new Date().toISOString(), responseHash: await sha256(raw), rows: range.length })
  }
  const { candles, quality } = cleanCandles([...validPrevious, ...fetched], cutoff)
  if (!candles.length || candles[0][0] !== beginning || candles.at(-1)![0] + DAY !== end) throw new Error('Historical coverage or fresh completed daily candle unavailable')
  return { provider: 'Coinbase Exchange', product: 'BTC-USD', sourceUrl: BTC24_SOURCE, sourceDocs: BTC24_DOCS, fetchedAt: new Date().toISOString(), vintage: 'Present-day vendor history; original historical publication times and revisions are unavailable.', candles, quality, requests: [...(previous?.requests ?? []), ...requests] }
}
