import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { createClient } from '../supabase/server'
import { type EconomicEvent, calendarSources, parseFedCalendar, parseICS, eventHasPassed } from './calendar'

// Cache the successful fetch timestamp WITH its content; rendering a cached page
// must never make an old provider response look newly checked.
export const getOfficialCalendar = unstable_cache(async () => {
  const results = await Promise.allSettled(Object.entries(calendarSources).map(async ([name, url]) => {
    const response = await fetch(url, { headers: { 'user-agent': 'KAPORALCalendar/1.1' }, cache: 'no-store', signal: AbortSignal.timeout(12_000) })
    if (!response.ok) throw new Error(`${name} HTTP ${response.status}`)
    const body = await response.text(), checkedAt = new Date().toISOString()
    const events = name === 'fed' ? parseFedCalendar(body, checkedAt) : parseICS(body, name === 'bls' ? 'BLS' : 'BEA', checkedAt)
    if (!events.length) throw new Error(`${name}: no recognized events`)
    return { name, checkedAt, events }
  }))
  const sources = results.map((r, i): { name: string; checkedAt: string | null; available: boolean } => r.status === 'fulfilled' ? { name: r.value.name, checkedAt: r.value.checkedAt, available: true } : { name: Object.keys(calendarSources)[i], checkedAt: null, available: false })
  const events = results.flatMap(r => r.status === 'fulfilled' ? r.value.events : [])
  return { events, sources, checkedAt: sources.flatMap(s => s.checkedAt ? [s.checkedAt] : []).sort()[0] ?? '', sourceState: (results.every(r => r.status === 'fulfilled') ? 'live' : events.length ? 'partial' : 'unavailable') as 'live' | 'partial' | 'unavailable' }
}, ['kaporal-official-calendars-v2'], { revalidate: 3600 })

function mapStored(row: Record<string, any>): EconomicEvent {
  return { id: row.metadata?.source_id ?? row.id, databaseId: row.id, slug: row.slug, kind: row.kind, title: row.title,
    scheduledAt: row.scheduled_at, precision: row.date_precision, timezone: row.timezone, provider: row.provider, sourceUrl: row.source_url,
    checkedAt: row.checked_at, sequence: row.provider_sequence, status: row.status,
    values: row.source_claim_status === 'reviewed' ? { prior: row.prior_value, consensus: row.consensus_value, actual: row.actual_value, revisedPrior: row.revised_prior_value, unit: row.unit, referencePeriod: row.reference_period, sources: row.metadata?.value_sources ?? {} } : undefined }
}

export async function getUpcomingEvents(limit = 12, now = Date.now()) {
  const stored = await getStoredCalendar()
  const data = stored ?? await getOfficialCalendar()
  const fresh = data.checkedAt && now - Date.parse(data.checkedAt) <= (stored ? 8 : 2) * 3600_000
  return { ...data, sourceState: fresh ? data.sourceState : 'partial' as const,
    events: [...new Map(data.events.map(event => [event.id, event])).values()].filter(event => !eventHasPassed(event, now)).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)).slice(0, limit) }
}

const getStoredCalendar = cache(async () => {
  const db = await createClient()
  const { data, error } = await db.from('economic_events').select('*').in('status', ['scheduled', 'cancelled']).gte('scheduled_at', new Date(Date.now()-90*86400000).toISOString()).order('scheduled_at').limit(1000)
  if (error || !data?.length) return null
  const events = data.map(mapStored)
  const providers = new Set(events.map(e=>e.provider))
  const checkedAt = events.map(e=>e.checkedAt).sort()[0]
  return { events, checkedAt, sourceState: (providers.has('BLS') && providers.has('BEA') && providers.has('Federal Reserve') ? 'live' : 'partial') as 'live' | 'partial' | 'unavailable' }
})

export const getEventBySlug = cache(async (slug: string) => {
  const db = await createClient()
  const stored = await db.from('economic_events').select('*').eq('slug', slug).in('status', ['scheduled', 'cancelled']).maybeSingle()
  const saved = stored.data ? mapStored(stored.data) : null
  if (saved && Date.now()-Date.parse(saved.checkedAt)<=8*3600_000) return { event: saved, checkedAt: saved.checkedAt, sourceState: 'live' as const }
  const calendar = await getOfficialCalendar()
  const official = calendar.events.find(event => event.slug === slug)
  // Archived releases remain addressable even after a provider removes them from
  // its current calendar. More recent cancellations override stored schedules.
  const event = official ? { ...saved, ...official, databaseId: saved?.databaseId, values: saved?.values } : saved
  return { event, checkedAt: event?.checkedAt ?? calendar.checkedAt, sourceState: calendar.sourceState }
})
