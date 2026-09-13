import { createClient } from 'npm:@supabase/supabase-js@2.112.3'
import { newsFeeds } from '../../../lib/news/feeds.ts'
import { parseNewsFeed, fetchNewsFeed } from '../../../lib/news/parse-feed.ts'

const headers = { 'content-type': 'application/json', 'cache-control': 'no-store' }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers })
Deno.serve(async request => {
  if (request.method !== 'POST') return json({ error: 'POST required' }, 405)
  const key = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}').default ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const db = createClient(Deno.env.get('SUPABASE_URL')!, key, { auth: { persistSession: false } })
  const { data: authorized, error } = await db.rpc('authorize_workspace_refresh', { token_input: request.headers.get('x-kaporal-job-token') ?? '' })
  if (error || !authorized) return json({ error: 'Unauthorized' }, 401)
  const checks = await Promise.allSettled(newsFeeds.map(async feed => {
    const started = new Date().toISOString()
    const run = await db.from('ingestion_runs').insert({ job_type: 'daily-news:' + feed.slug, status: 'running', started_at: started }).select('id').single()
    try {
      const { rows, rejected } = parseNewsFeed(await fetchNewsFeed(feed), feed)
      const written = await db.from('daily_news').upsert(rows, { onConflict: 'url' })
      if (written.error) throw new Error('Headline storage failed')
      const completed = new Date().toISOString()
      const state = await db.from('news_feeds').update({ status: 'healthy', last_checked_at: completed, last_success_at: completed, latest_published_at: rows[0].published_at }).eq('slug', feed.slug)
      if (state.error) throw new Error('Feed status storage failed')
      if (run.data) await db.from('ingestion_runs').update({ status: 'completed', rows_written: rows.length, message: rejected + ' invalid, future or older entries omitted', completed_at: completed }).eq('id', run.data.id)
      return { source: feed.slug, ok: true, headlines: rows.length, rejected, latestPublishedAt: rows[0].published_at }
    } catch (error) {
      const completed = new Date().toISOString(), message = error instanceof Error ? error.message : 'Feed check failed'
      await db.from('news_feeds').update({ status: 'error', last_checked_at: completed }).eq('slug', feed.slug)
      if (run.data) await db.from('ingestion_runs').update({ status: 'failed', message: message.slice(0, 300), completed_at: completed }).eq('id', run.data.id)
      return { source: feed.slug, ok: false, error: message }
    }
  }))
  const sources = checks.map((check, index) => check.status === 'fulfilled' ? check.value : { source: newsFeeds[index].slug, ok: false, error: 'Source check failed' })
  const ok = sources.every(source => source.ok)
  return json({ ok, sources, financialConclusionsPublished: 0, emailsSent: 0 }, ok ? 200 : 503)
})
