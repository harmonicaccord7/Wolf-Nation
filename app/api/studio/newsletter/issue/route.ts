import { studioAccess, reply } from '../../../../../lib/studio-access'
import { getUpcomingEvents } from '../../../../../lib/events/calendar-data'
export const dynamic = 'force-dynamic'
export const revalidate = 0
const fields = 'id,issue_key,title,dek,body,source_snapshot,issue_kind,issue_date,status,review_notes,reviewed_at,approved_at,published_at,updated_at,newsletter_deliveries(id,status,attempts,provider_message_id,last_error,sent_at)'
export async function GET() {
  const { db, error } = await studioAccess(); if (error) return error
  const result = await db.from('newsletter_issues').select(fields).order('issue_date', { ascending: false }).limit(30)
  return result.error ? reply({ error: 'Newsletter workspace unavailable.' }, 503) : reply({ issues: result.data })
}
export async function POST(request: Request) {
  const { db, error } = await studioAccess(); if (error) return error
  const input = await request.json().catch(() => ({}))
  const kind = input.issueKind ?? 'weekly'
  if (!['weekly', 'weekday', 'material_event'].includes(kind)) return reply({ error: 'Invalid edition cadence.' }, 400)
  const calendar = await getUpcomingEvents(8)
  if (calendar.sourceState !== 'live' || !calendar.events.length) return reply({ error: 'A complete official calendar check is required to generate this draft.' }, 503)
  const date = new Date().toISOString().slice(0, 10), issueKey = 'market-letter-' + kind + '-' + date
  const body = { blocks: [
    { type: 'heading', text: 'The next market catalysts' },
    { type: 'paragraph', text: 'Review the releases below against your own time horizon and risk budget. An event can create both an opportunity and a loss; acting early also exposes you to a release surprise.' },
    { type: 'bullet_list', items: calendar.events.map(event => event.title + ' — ' + new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeStyle: event.precision === 'minute' ? 'short' : undefined, timeZone: event.timezone }).format(new Date(event.scheduledAt)) + ' (' + event.timezone + (event.precision === 'date' ? '; time not specified' : '') + ')') },
    { type: 'heading', text: 'A decision before a release' },
    { type: 'paragraph', text: 'Buying before the announcement increases exposure to both the intended move and an adverse surprise. Waiting avoids that initial exposure but can mean a less attractive entry or missing a move. Staging divides the exposure across time but adds costs and still leaves downside risk. Remaining uninvested can preserve capital while carrying an opportunity cost. The final choice belongs to the reader.' },
    { type: 'paragraph', text: 'Compare the published release with a properly sourced expectation, its components and revisions. Do not equate an increase from last month with an upside surprise. No consensus value, forecast probability or guaranteed asset response is asserted in this edition.' },
  ] }
  const result = await db.from('newsletter_issues').insert({ issue_key: issueKey, issue_kind: kind, title: 'KAPORAL Market Letter — ' + date, dek: 'Official catalysts and a framework for considering exposure, waiting and risk.', body, issue_date: date, source_snapshot: calendar }).select(fields).single()
  if (result.error?.code === '23505') return reply({ error: 'This cadence already has an edition today. Open and review it; generating again never overwrites an issue.' }, 409)
  return result.error ? reply({ error: 'Could not create draft.' }, 503) : reply({ ok: true, issue: result.data }, 201)
}
export async function PATCH(request: Request) {
  const { db, role, error } = await studioAccess(); if (error) return error
  const input = await request.json().catch(() => null)
  if (!input || typeof input.id !== 'string' || typeof input.updatedAt !== 'string') return reply({ error: 'Issue id and current revision required.' }, 400)
  const patch: Record<string, unknown> = {}
  if (input.status !== undefined) {
    if (!['draft', 'review', 'approved', 'published', 'archived'].includes(input.status)) return reply({ error: 'Invalid status.' }, 400)
    if (['approved', 'published', 'archived'].includes(input.status) && !['editor', 'admin'].includes(role ?? '')) return reply({ error: 'Editor required.' }, 403)
    patch.status = input.status
  }
  if (input.bodyText !== undefined) {
    if (typeof input.bodyText !== 'string' || input.bodyText.trim().length < 50 || input.bodyText.length > 40000) return reply({ error: 'Issue text must contain 50–40,000 characters.' }, 400)
    patch.body = { blocks: input.bodyText.trim().split(/\n\s*\n/).map((text: string) => ({ type: 'paragraph', text })) }
    patch.status = 'draft'
  }
  if (input.reviewNotes !== undefined) {
    if (typeof input.reviewNotes !== 'string' || input.reviewNotes.length > 4000) return reply({ error: 'Invalid review notes.' }, 400)
    patch.review_notes = input.reviewNotes
  }
  if (!Object.keys(patch).length) return reply({ error: 'No change supplied.' }, 400)
  const result = await db.from('newsletter_issues').update(patch).eq('id', input.id).eq('updated_at', input.updatedAt).select(fields).maybeSingle()
  if (result.error) return reply({ error: 'Publication gate rejected the change. Review the full text and sources, record review notes, then approve before publishing.' }, 409)
  if (!result.data) return reply({ error: 'This edition changed in another session. Reload before editing.' }, 409)
  return reply({ ok: true, issue: result.data })
}
