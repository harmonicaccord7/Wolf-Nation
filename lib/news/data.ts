import { createClient } from '../supabase/server'
import { newsFeeds, type FeedState, type NewsItem } from './feeds'

export async function getDailyNews() {
  const db = await createClient(), now = new Date().toISOString()
  const activeSlugs = newsFeeds.map(feed => feed.slug)
  const [headlines, feeds] = await Promise.all([
    db.from('daily_news').select('id,feed_slug,title,url,category,published_at,first_seen_at,last_seen_at').in('feed_slug', activeSlugs).lte('published_at', now).gte('published_at', new Date(Date.now() - 30 * 86400_000).toISOString()).order('published_at', { ascending: false }).limit(200),
    db.from('news_feeds').select('slug,name,source_url,category,last_checked_at,last_success_at,latest_published_at,status').in('slug', activeSlugs).order('name'),
  ])
  return { headlines: (headlines.data ?? []) as NewsItem[], feeds: (feeds.data ?? []) as FeedState[], unavailable: Boolean(headlines.error || feeds.error), viewedAt: now }
}
