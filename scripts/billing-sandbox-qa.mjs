import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { applySandboxSnapshot, emptySandboxLedger, parseSandboxSnapshot, sandboxAccess } from '../lib/billing/sandbox.ts'

const alice = '11111111-1111-4111-8111-111111111111', bob = '22222222-2222-4222-8222-222222222222'
const start = Date.parse('2026-10-01T00:00:00Z'), end = Date.parse('2026-11-01T00:00:00Z')
const event = { mode:'test',eventId:'evt_1',subscriptionId:'sub_fixture',ownerId:alice,revision:1,plan:'research-sandbox',status:'active',payment:'paid',periodStart:start,periodEnd:end,cancelAtPeriodEnd:false }
const empty = () => emptySandboxLedger(alice, event.subscriptionId)
const apply = (changes = {}, ledger = empty()) => applySandboxSnapshot(ledger, { ...event, ...changes })
const active = apply().ledger
assert.equal(sandboxAccess(empty(), alice, start).reason, 'no-subscription')
assert.deepEqual(sandboxAccess(active,alice,start), { mode:'test',sandboxAccess:true,reason:'active-paid-period' })
assert.equal(sandboxAccess(active,alice,start-1).reason,'not-started')
assert.equal(sandboxAccess(active,alice,end-1).sandboxAccess,true)
assert.equal(sandboxAccess(active,alice,end).reason,'expired')
assert.equal(sandboxAccess(active,alice,end+1).sandboxAccess,false)
assert.equal(sandboxAccess(active,bob,start).reason,'invalid-context')
assert.equal(sandboxAccess(active,'',start).sandboxAccess,false)
for (const now of [NaN, Infinity, -1, '2026-10-15', start+.5, 8640000000000001]) assert.equal(sandboxAccess(active,alice,now).sandboxAccess,false)
for (const status of ['active','past_due','canceled','blocked']) for (const payment of ['paid','unpaid']) for (const cancelAtPeriodEnd of [true,false]) {
  const ledger = apply({ status,payment,cancelAtPeriodEnd }).ledger
  for (const now of [start-1,start,end-1,end,end+1]) {
    assert.equal(sandboxAccess(ledger,alice,now).sandboxAccess,status==='active'&&payment==='paid'&&now>=start&&now<end)
  }
}
assert.equal(sandboxAccess(apply({ cancelAtPeriodEnd:true }).ledger,alice,start).reason,'active-until-period-end')
const canceled = apply({ eventId:'evt_2',revision:2,status:'canceled' },active).ledger
assert.equal(sandboxAccess(canceled,alice,start).sandboxAccess,false)
const stale = apply({ eventId:'evt_late',revision:1 },canceled)
assert.equal(stale.outcome,'stale'); assert.deepEqual(stale.ledger.snapshot,canceled.snapshot)
assert.equal(sandboxAccess(stale.ledger,alice,start).sandboxAccess,false)
assert.equal(apply({ eventId:'evt_late',revision:1 },stale.ledger).outcome,'duplicate')
assert.equal(apply({},active).outcome,'duplicate')
assert.equal(apply({},active).ledger,active)
assert.throws(()=>apply({ payment:'unpaid' },active),/Conflicting duplicate/)
assert.throws(()=>apply({ eventId:'evt_same_revision' },active),/Ambiguous revision/)
assert.throws(()=>apply({ ownerId:bob },active),/mismatch/)
assert.throws(()=>apply({ subscriptionId:'sub_other' },active),/mismatch/)
const renewed = apply({ eventId:'evt_renew',revision:3,periodStart:end,periodEnd:end+86400000 },canceled).ledger
assert.equal(sandboxAccess(renewed,alice,end).sandboxAccess,true)
assert.equal(sandboxAccess(renewed,alice,end-1).sandboxAccess,false)
const reordered = Object.fromEntries(Object.entries(event).reverse())
assert.equal(applySandboxSnapshot(active,reordered).outcome,'duplicate')
const payload = { ...event }; const detached = applySandboxSnapshot(empty(),payload).ledger
payload.status='canceled'; assert.equal(detached.snapshot.status,'active')
assert.equal(empty().snapshot,null); assert.equal(active.snapshot.status,'active')
Object.freeze(active.snapshot); Object.freeze(active.receipts); Object.freeze(active)
assert.doesNotThrow(()=>apply({ eventId:'evt_new',revision:2 },active))
for (const invalid of [null,[],{}, { ...event, extra:true }, { ...event,mode:'live' }, { ...event,plan:'premium' }, { ...event,eventId:'__proto__' }, { ...event,eventId:'constructor' }, { ...event,eventId:'x'.repeat(129) }, { ...event,subscriptionId:'' }, { ...event,ownerId:'reader@example.com' }, { ...event,revision:0 }, { ...event,revision:1.5 }, { ...event,revision:Infinity }, { ...event,status:'trialing' }, { ...event,status:{toString:()=> 'active'} }, { ...event,payment:true }, { ...event,periodStart:NaN }, { ...event,periodStart:-1 }, { ...event,periodEnd:start }, { ...event,periodEnd:'2026-11-01' }, { ...event,cancelAtPeriodEnd:'false' }]) assert.throws(()=>parseSandboxSnapshot(invalid))
const missing = { ...event }; delete missing.payment; assert.throws(()=>parseSandboxSnapshot(missing))
assert.throws(()=>emptySandboxLedger('bad',event.subscriptionId))
assert.throws(()=>emptySandboxLedger(alice,''))
assert.equal(sandboxAccess({ ...active,mode:'live' },alice,start).sandboxAccess,false)
assert.equal(sandboxAccess({ ...active,snapshot:{ ...event,mode:'live' } },alice,start).sandboxAccess,false)
assert.equal(sandboxAccess({ ...active,snapshot:{ ...event,ownerId:bob } },alice,start).reason,'invalid-binding')
const full = { ...active,receipts:Object.fromEntries(Array.from({length:4096},(_,i)=>['evt_capacity_'+i,'fixture'])) }
assert.throws(()=>apply({ eventId:'evt_overflow',revision:2 },full),/capacity/)

// Fail CI if this preliminary module is wired into a production route, component
// or library. A future integration must deliberately replace this boundary with
// provider verification, durable transactions/RLS and end-to-end acceptance.
function files(path) { return readdirSync(path,{withFileTypes:true}).flatMap(item => item.isDirectory()?files(path+'/'+item.name):[path+'/'+item.name]) }
for (const root of ['app','components','lib','supabase/functions']) for (const path of files(root)) {
  if (path==='lib/billing/sandbox.ts'||! /\.(ts|tsx|js|mjs)$/.test(path)) continue
  assert.doesNotMatch(readFileSync(path,'utf8'), /billing\/sandbox|(?:applySandboxSnapshot|emptySandboxLedger|sandboxAccess)\s*\(/, 'Sandbox contract must remain disconnected: '+path)
}
console.log('Billing sandbox QA passed: lifecycle/time matrix, owner binding, immutable snapshots, duplicate/conflict/stale ordering, capacity and live-input rejection. Production integration remains forbidden; no provider, payment or entitlement was created.')
