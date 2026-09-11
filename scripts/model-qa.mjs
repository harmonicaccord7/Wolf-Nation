import assert from 'node:assert/strict'
import {parseFedCalendar, parseICS} from '../lib/events/calendar.ts'
import {runDecisionModules} from '../lib/models/modules.ts'

const checkedAt='2026-09-12T00:00:00.000Z'
const ics=`BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:cpi-test\nSEQUENCE:1\nDTSTART;TZID=US-Eastern:20260915T083000\nSUMMARY:Consumer Price Index\nEND:VEVENT\nEND:VCALENDAR`
const events=parseICS(ics,'BLS',checkedAt)
assert.equal(events[0].kind,'cpi')
assert.equal(events[0].precision,'minute')
assert.equal(events[0].scheduledAt,'2026-09-15T12:30:00.000Z')
const fed=`<a>2026 FOMC Meetings</a><div class="fomc-meeting--shaded row fomc-meeting" "><div class="fomc-meeting__month"><strong>September</strong></div><div class="fomc-meeting__date">15-16*</div></div>`
const fedEvents=parseFedCalendar(fed,checkedAt)
assert.equal(fedEvents[0].slug,'fomc-2026-09-15')
assert.equal(fedEvents[0].precision,'date')
const snapshot={BTC:[...Array(8)].map((_,i)=>({observedAt:`2026-09-0${i+1}T00:00:00Z`,value:100+i*2})),DXY:[{observedAt:'2026-09-01T00:00:00Z',value:100},{observedAt:'2026-09-02T00:00:00Z',value:101}],US10Y:[{observedAt:'2026-09-01T00:00:00Z',value:4},{observedAt:'2026-09-02T00:00:00Z',value:4.1}],CPI_US:[{observedAt:'2026-09-01T00:00:00Z',value:300},{observedAt:'2026-09-02T00:00:00Z',value:301}]}
const results=runDecisionModules(snapshot,checkedAt)
assert.equal(results.length,6)
assert.equal(results.find(item=>item.moduleCode==='geopolitics_exposure')?.status,'abstained')
assert.equal(results.find(item=>item.moduleCode==='btc_direction')?.status,'scored')
assert.equal(results.some(item=>item.score!==null && (item.score< -100 || item.score>100)),false)
console.log(`model QA passed: ${events.length} calendar parser, ${fedEvents.length} FOMC parser, ${results.length} modules`)
