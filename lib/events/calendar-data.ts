import {EconomicEvent, calendarSources, parseFedCalendar, parseICS} from './calendar'

const headers = { 'user-agent': 'KAPORALCalendar/1.0' }
async function source(url: string) {
  const response = await fetch(url, { headers, next: { revalidate: 3600 } })
  if (!response.ok) throw new Error(`Calendar source returned ${response.status}`)
  return response.text()
}

export async function getUpcomingEvents(limit = 12, now = Date.now()): Promise<{events: EconomicEvent[]; checkedAt: string; sourceState: 'live'|'partial'|'unavailable'}> {
  const checkedAt = new Date().toISOString()
  const results = await Promise.allSettled([source(calendarSources.bls), source(calendarSources.bea), source(calendarSources.fed)])
  const events: EconomicEvent[] = []
  if (results[0].status === 'fulfilled') events.push(...parseICS(results[0].value, 'BLS', checkedAt))
  if (results[1].status === 'fulfilled') events.push(...parseICS(results[1].value, 'BEA', checkedAt))
  if (results[2].status === 'fulfilled') events.push(...parseFedCalendar(results[2].value, checkedAt))
  const upcoming = [...new Map(events.map(event => [event.id, event])).values()]
    .filter(event => event.status === 'scheduled' && Date.parse(event.scheduledAt) >= now - 24 * 60 * 60_000)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
  return { events: upcoming.slice(0, limit), checkedAt, sourceState: results.every(result => result.status === 'fulfilled') ? 'live' : events.length ? 'partial' : 'unavailable' }
}

export async function getEventBySlug(slug: string) {
  const {events, checkedAt, sourceState} = await getUpcomingEvents(60)
  return {event: events.find(item => item.slug === slug) ?? null, checkedAt, sourceState}
}
