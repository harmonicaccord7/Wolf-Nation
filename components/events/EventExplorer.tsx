'use client'
import { useEffect, useState } from 'react'
import { EventCard } from './EventCard'
import type { EconomicEvent } from '../../lib/events/calendar'
export function EventExplorer({ events }: { events: EconomicEvent[] }) {
  const [query, setQuery] = useState(''), [kind, setKind] = useState('all')
  const filtered = events.filter(e => (kind === 'all' || e.kind === kind) && (e.title + ' ' + e.kind).toLowerCase().includes(query.toLowerCase()))
  return <><div className="eventFilters"><label>Find a market event<input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="CPI, PCE, FOMC…" /></label><label>Release type<select value={kind} onChange={e => setKind(e.target.value)}><option value="all">All releases</option>{['cpi','pce','fomc','payrolls','ppi','gdp'].map(k => <option value={k} key={k}>{k.toUpperCase()}</option>)}</select></label></div>
    <p role="status">{filtered.length} matching events</p><div className="eventGrid eventGridLarge">{filtered.map(event => <EventCard key={event.id} event={event} />)}</div></>
}
export function EventTiming({ event }: { event: EconomicEvent }) {
  const [zone, setZone] = useState(event.timezone), [local, setLocal] = useState('UTC'), [now, setNow] = useState<number | null>(null)
  useEffect(() => { setLocal(Intl.DateTimeFormat().resolvedOptions().timeZone); setNow(Date.now()); const timer = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(timer) }, [])
  const zones = [...new Set([event.timezone, 'UTC', local])]
  const minute = event.precision === 'minute', date = new Intl.DateTimeFormat('en-GB', { dateStyle: 'full', timeStyle: minute ? 'short' : undefined, timeZone: minute ? zone : event.timezone }).format(new Date(event.scheduledAt))
  const remaining = now === null ? null : Date.parse(event.scheduledAt) - now
  return <div className="eventTiming"><p><time dateTime={event.scheduledAt}>{date}</time> · {minute ? zone : event.timezone}</p>
    {minute ? <><label>Display timezone<select value={zone} onChange={e => setZone(e.target.value)}>{zones.map(z => <option key={z}>{z}</option>)}</select></label><p>{event.status === 'cancelled' ? 'Cancelled by the provider' : remaining === null ? 'Scheduled release' : remaining > 0 ? 'Due in ' + Math.floor(remaining / 86400000) + 'd ' + Math.floor(remaining % 86400000 / 3600000) + 'h ' + Math.floor(remaining % 3600000 / 60000) + 'm' : 'Scheduled time has passed; check the official release.'}</p></> : <p>Final meeting day. The calendar does not specify an announcement time; no countdown is inferred.</p>}
    <a href={event.sourceUrl} target="_blank" rel="noreferrer">Open official calendar ↗</a>
  </div>
}
