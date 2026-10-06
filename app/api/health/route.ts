import { NextResponse } from 'next/server'
import { buildPublicHealth, buildUnavailablePublicHealth } from '../../../lib/health'
import { newsFeeds, type FeedState } from '../../../lib/news/feeds'
import { createClient } from '../../../lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const checkedAt = new Date().toISOString()
  try {
    const supabase = await createClient()
    const [{ data: market, error: marketError }, { data: feeds, error: feedError }] = await Promise.all([
      supabase.from('market_snapshots').select('captured_at').order('captured_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('news_feeds').select('slug,name,source_url,category,last_checked_at,last_success_at,latest_published_at,status').order('name'),
    ])
    if (marketError) throw marketError
    if (feedError) throw feedError

    const payload = buildPublicHealth({
      checkedAt,
      marketCapturedAt: market?.captured_at ?? null,
      configuredSources: newsFeeds,
      feedStates: (feeds ?? []) as FeedState[],
    })
    return NextResponse.json(payload, { status: payload.status === 'ok' ? 200 : 503, headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json(buildUnavailablePublicHealth(checkedAt, newsFeeds), { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
