import Link from 'next/link'
import {EconomicEvent} from '../../lib/events/calendar'
export function EventCard({event}:{event:EconomicEvent}){
  const date = new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:event.precision==='minute'?'short':undefined,timeZone:event.timezone}).format(new Date(event.scheduledAt))
  return <Link href={`/events/${event.slug}`} className="eventCard"><div className="eventCardTop"><span>{event.kind.toUpperCase()}</span><small>{event.precision==='date'?'Date only':'Scheduled time'}</small></div><h3>{event.title}</h3><strong>{date}</strong><p>{event.provider} · {event.timezone}</p><small className="eventSource">Official source ↗</small></Link>
}
