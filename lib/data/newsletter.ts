import { createClient } from '../supabase/server'

export type PublicNewsletterIssue = { issue_key: string; title: string; dek: string | null; issue_date: string; published_at: string }

/** Public metadata only. Explicit filters also protect homepage/archive visits
 * by signed-in staff whose RLS permissions include unpublished drafts. */
export async function getPublishedNewsletterIssues(limit = 12) {
  const checkedAt = new Date().toISOString(), now = Date.parse(checkedAt)
  const unavailable = { issues: [] as PublicNewsletterIssue[], unavailable: true, checkedAt }
  try {
    const db = await createClient()
    const result = await db.from('newsletter_issues')
      .select('issue_key,title,dek,issue_date,published_at,status')
      .eq('status', 'published').lte('published_at', checkedAt)
      .order('published_at', { ascending: false }).order('issue_key', { ascending: false })
      .limit(Math.max(1, Math.min(12, Math.trunc(limit) || 12)))
    if (result.error || !Array.isArray(result.data)) return unavailable
    const issues: PublicNewsletterIssue[] = []
    for (const row of result.data) {
      if (row.status !== 'published' || typeof row.published_at !== 'string' || !Number.isFinite(Date.parse(row.published_at)) || Date.parse(row.published_at) > now) continue
      if (typeof row.issue_key !== 'string' || !row.issue_key || typeof row.title !== 'string' || !row.title || typeof row.issue_date !== 'string' || !Number.isFinite(Date.parse(row.issue_date))) return unavailable
      issues.push({ issue_key: row.issue_key, title: row.title, dek: typeof row.dek === 'string' ? row.dek : null, issue_date: row.issue_date, published_at: row.published_at })
    }
    return { issues, unavailable: false, checkedAt }
  } catch {
    return unavailable
  }
}
