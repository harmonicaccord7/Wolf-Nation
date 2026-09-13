import { studioAccess, reply } from '../../../../../lib/studio-access'
import { getOfficialCalendar } from '../../../../../lib/events/calendar-data'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export async function POST() {
  const { db, error } = await studioAccess(); if (error) return error
  const calendar = await getOfficialCalendar()
  const events = calendar.events.filter(e => Date.parse(e.scheduledAt) >= Date.now() - 90 * 86400000)
  if (!events.length) return reply({ error: 'No official calendar events returned.' }, 503)
  const { data, error: saveError } = await db.rpc('sync_economic_events', { events_json: events.map(e => ({ slug: e.slug, kind: e.kind, title: e.title, scheduled_at: e.scheduledAt, date_precision: e.precision, timezone: e.timezone, provider: e.provider, source_url: e.sourceUrl, checked_at: e.checkedAt, provider_sequence: e.sequence, status: e.status, metadata: { source_id: e.id } })) })
  return saveError ? reply({ error: 'Calendar data could not be stored.' }, 503) : reply({ ok: true, count: data, sourceState: calendar.sourceState, checkedAt: calendar.checkedAt })
}
