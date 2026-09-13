import Link from 'next/link'
import {getUpcomingEvents} from '../../lib/events/calendar-data'
import {EventCard} from './EventCard'
export async function EventPreview(){
  const data = await getUpcomingEvents(3)
  return <section className="shell eventPreview"><div className="sectionTitle"><div><span className="eyebrow">UPCOMING CATALYSTS</span><h2>Decision workspace</h2></div><p>Official release calendars, conditional scenarios and the evidence that would invalidate each interpretation. This is research education, not a personal recommendation.</p></div>{data.events.length?<div className="eventGrid">{data.events.map(event=><EventCard key={event.id} event={event}/>)}</div>:<div className="eventUnavailable"><strong>Official calendars are temporarily unavailable.</strong><p>Open the calendar hub to retry the source check. No release date is invented when the provider cannot be reached.</p></div>}<div className="eventPreviewFoot"><span>Calendar check: {data.checkedAt?new Date(data.checkedAt).toUTCString():'No successful fetch'} · {data.sourceState}</span><Link className="outlineButton" href="/events">Open full event desk</Link></div></section>
}
