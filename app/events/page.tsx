import { Header } from '../../components/Header'
import { Footer } from '../../components/Footer'
import { EventExplorer } from '../../components/events/EventExplorer'
import { getUpcomingEvents } from '../../lib/events/calendar-data'
import Link from 'next/link'
export const metadata={title:'Economic Events & Decision Workspace',description:'Official CPI, PCE, FOMC and other release dates with conditional educational scenarios.',alternates:{canonical:'/events'}}
export default async function EventsPage() {
  const data=await getUpcomingEvents(60)
  return <main className="eventDesk"><Header/><section className="eventHero"><div className="shell"><span className="eyebrow">THE EVENT DESK</span><h1>Know the catalyst.<br/><em>Define the decision.</em></h1><p>Check the official schedule, compare conditional scenarios and define what would change your view.</p><div className="eventHeroMeta"><span>{data.events.length} upcoming release windows</span><span>{data.checkedAt?'Sources fetched '+new Date(data.checkedAt).toUTCString():'No successful source fetch'}</span><span>{data.sourceState==='live'?'All three official calendars available':data.sourceState==='partial'?'Some calendar checks are unavailable or stale':'Calendars unavailable'}</span></div></div></section>
    <section className="shell eventBody"><div className="eventNotice"><strong>How to use this desk</strong><span>Compare the previous number, what was expected, the new result and any corrections. Read what each result could mean, then make your own decision.</span></div><Link className="newsGuideLink" href="/learn/market-events">New to CPI, PCE, FOMC or the jobs report? Read the basics for crypto, gold and your pocket →</Link>
      {data.events.length?<EventExplorer events={data.events}/>:<div className="eventUnavailable"><strong>No official calendar result is available right now.</strong><p>Check the source calendars below.</p></div>}
      <p className="eventSources">Sources: <a href="https://www.bls.gov/schedule/news_release/bls.ics">BLS calendar</a> · <a href="https://www.bea.gov/news/schedule/ics/online-calendar-subscription.ics">BEA calendar</a> · <a href="https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm">Federal Reserve calendar</a>.</p>
    </section><Footer/></main>
}
