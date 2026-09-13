import { studioAccess, reply } from '../../../../../lib/studio-access'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export async function POST(request: Request) {
  const { db, role, error } = await studioAccess(); if (error) return error
  if (!['editor', 'admin'].includes(role ?? '')) return reply({ error: 'Editor access required' }, 403)
  const body = await request.json().catch(() => null)
  if (typeof body?.issueId !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.issueId)) return reply({ error: 'Valid issue id required.' }, 400)
  const result = await db.rpc('queue_newsletter_issue', { target_issue: body.issueId })
  return result.error ? reply({ error: 'Queue rejected. Check publication approval and subscriber consent.' }, 409) : reply({ ok: true, queued: result.data, sent: 0 })
}
