import { createClient } from '../supabase/server'
import type { FeedState, NewsItem } from './feeds'

export async function getDailyNews() {
  const db = await createClient(), now = new Date().toISOString()
  const [headlines, feeds] = await Promise.all([
    db.from('daily_news').select('id,feed_slug,title,url,category,published_at,first_seen_at,last_seen_at').lte('published_at', now).gte('published_at', new Date(Date.now() - 30 * 86400_000).toISOString()).order('published_at', { ascending: false }).limit(200),
    db.from('news_feeds').select('slug,name,source_url,category,last_checked_at,last_success_at,latest_published_at,status').order('name'),
  ])
  return { headlines: (headlines.data ?? []) as NewsItem[], feeds: (feeds.data ?? []) as FeedState[], unavailable: Boolean(headlines.error || feeds.error), viewedAt: now }
}
