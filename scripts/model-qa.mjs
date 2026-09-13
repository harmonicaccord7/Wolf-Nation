import assert from 'node:assert/strict'
import { parseFedCalendar, parseICS } from '../lib/events/calendar.ts'
import { runDecisionModules, elapsedReturn, availablePoints, replayBtcBaseline, canonicalJson, DAY } from '../lib/models/modules.ts'

const checkedAt='2026-09-12T00:00:00.000Z'
assert.equal(canonicalJson({series:{BTC:[{value:100,observedAt:'2026-09-01'}]}}),canonicalJson({series:{BTC:[{observedAt:'2026-09-01',value:100}]}}))
const ics='BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:cpi-test\nSEQUENCE:1\nDTSTART;TZID=US-Eastern:20260915T083000\nSUMMARY:Consumer Price Index\nEND:VEVENT\nEND:VCALENDAR'
assert.equal(parseICS(ics,'BLS',checkedAt)[0].scheduledAt,'2026-09-15T12:30:00.000Z')
const fed='<a>2026 FOMC Meetings</a><div class="fomc-meeting--shaded row fomc-meeting"><div class="fomc-meeting__month"><strong>September</strong></div><div class="fomc-meeting__date">15-16*</div></div>'
assert.equal(parseFedCalendar(fed,checkedAt)[0].slug,'fomc-2026-09-16')
const crossMonth=fed.replace('September','April/May').replace('15-16*','30-1')
assert.equal(parseFedCalendar(crossMonth,checkedAt)[0].slug,'fomc-2026-05-01')
assert.equal(parseICS(ics.replace('20260915','20261215'),'BLS',checkedAt)[0].scheduledAt,'2026-12-15T13:30:00.000Z')
const cutoff=Date.parse(checkedAt)
const btc=Array.from({length:12*96+1},(_,i)=>({observedAt:new Date(cutoff-12*DAY+i*900000).toISOString(),value:100*Math.exp(i/96*.01)}))
assert.ok(Math.abs(elapsedReturn(btc,24,cutoff)-(Math.exp(.01)-1)*100)<1e-9)
assert.ok(Math.abs(elapsedReturn(btc,72,cutoff)-(Math.exp(.03)-1)*100)<1e-9)
assert.equal(elapsedReturn(btc.slice(-4),24,cutoff),null,'15-minute samples cannot stand in for 24 hours')
assert.equal(elapsedReturn(btc,24,cutoff+2*3600000),null,'stale current endpoint must abstain')
const snapshot={BTC:btc,US10Y:[{observedAt:'2026-09-04T00:00:00Z',value:4},{observedAt:'2026-09-11T00:00:00Z',value:4.1}],CPI_US:[{observedAt:'2026-07-01T00:00:00Z',value:300},{observedAt:'2026-08-01T00:00:00Z',value:301}],NGA_INFLATION:[{observedAt:'2025-01-01T00:00:00Z',value:20}]}
const result=runDecisionModules(snapshot,checkedAt)
assert.ok(Math.abs(result.find(r=>r.moduleCode==='liquidity_conditions').value-.1)<1e-10)
assert.ok(Math.abs(result.find(r=>r.moduleCode==='volatility_expectations').value-Math.sqrt(365)*1)<1e-8,'daily sampling must annualize daily returns')
assert.equal(result.find(r=>r.moduleCode==='africa_country').value,20)
assert.equal(result.find(r=>r.moduleCode==='geopolitics_exposure').asOf,null)
assert.ok(runDecisionModules({},checkedAt).every(r=>r.status==='abstained'&&r.asOf===null))
assert.equal(availablePoints([{observedAt:'2026-09-01',value:1,ingestedAt:'2026-09-13'}],cutoff).length,0)
const future={observedAt:'2026-09-13T00:00:00Z',value:999999}
assert.deepEqual(runDecisionModules({...snapshot,BTC:[...btc,future]},checkedAt),result,'future information cannot change a frozen run')
const replay=replayBtcBaseline(btc,checkedAt,10)
assert.ok(replay.rows.length>0)
assert.ok(replay.rows.every(r=>Date.parse(r.resolvedAt)>Date.parse(r.at)))
assert.deepEqual(replayBtcBaseline([...btc,future],checkedAt,10),replay)
assert.ok(replay.rows.reduce((sum,r)=>sum+r.netReturnPct,0)<replay.rows.reduce((sum,r)=>sum+r.returnPct,0),'costs reduce results')
assert.equal(replay.validation,'experimental')
console.log('Model/calendar QA passed: elapsed horizons, missing/stale/future inputs, units, daily volatility, replay costs, DST and final FOMC day.')
