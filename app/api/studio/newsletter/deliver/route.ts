import { studioAccess, reply } from '../../../../../lib/studio-access'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export async function POST(request: Request) {
  const { db, role, error } = await studioAccess(); if (error) return error
  if (!['editor', 'admin'].includes(role ?? '')) return reply({ error: 'Editor required' }, 403)
  const input = await request.json().catch(() => null)
  if (typeof input?.issueId !== 'string' || input.confirmDelivery !== true) return reply({ error: 'Confirm delivery of a specific published edition.' }, 400)
  const { data: { session } } = await db.auth.getSession()
  if (!session) return reply({ error: 'Session expired' }, 401)
  try {
    const response = await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL + '/functions/v1/newsletter-delivery', { method: 'POST', headers: { 'content-type': 'application/json', Authorization: 'Bearer ' + session.access_token }, cache: 'no-store', body: JSON.stringify({ action: 'deliver', issueId: input.issueId, confirmDelivery: true }), signal: AbortSignal.timeout(55_000) })
    return reply(await response.json(), response.status)
  } catch { return reply({ error: 'Delivery result is uncertain. Refresh the ledger before retrying.' }, 503) }
}
