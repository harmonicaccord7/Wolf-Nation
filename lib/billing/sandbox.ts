/** Offline contract only: no provider, HTTP handler, persistence or real access.
 * Normalized snapshots are synthetic until a separately reviewed adapter verifies
 * provider signatures, retrieves canonical state and binds customer to owner.
 * Never call this module to authorize a production request. */
import { createHash } from 'node:crypto'

export type SandboxSnapshot = {
  mode: 'test'; eventId: string; subscriptionId: string; ownerId: string;
  revision: number; plan: 'research-sandbox'; status: 'active' | 'past_due' | 'canceled' | 'blocked';
  payment: 'paid' | 'unpaid'; periodStart: number; periodEnd: number; cancelAtPeriodEnd: boolean;
}
export type SandboxLedger = {
  mode: 'test'; ownerId: string; subscriptionId: string;
  snapshot: SandboxSnapshot | null; receipts: Readonly<Record<string, string>>;
}
const keys = ['mode','eventId','subscriptionId','ownerId','revision','plan','status','payment','periodStart','periodEnd','cancelAtPeriodEnd'] as const
const identifier = /^[a-zA-Z0-9_-]{1,128}$/
const owner = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const safeTime = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= 8640000000000000

export function parseSandboxSnapshot(input: unknown): SandboxSnapshot {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('Invalid sandbox snapshot')
  const row = input as Record<string, unknown>
  if (Object.keys(row).length !== keys.length || !keys.every(key => Object.hasOwn(row, key))) throw Error('Unexpected sandbox fields')
  if (row.mode !== 'test' || row.plan !== 'research-sandbox') throw Error('Only the test contract is supported')
  if (typeof row.eventId !== 'string' || !identifier.test(row.eventId) || ['__proto__','constructor','prototype'].includes(row.eventId)) throw Error('Invalid event identifier')
  if (typeof row.subscriptionId !== 'string' || !identifier.test(row.subscriptionId) || typeof row.ownerId !== 'string' || !owner.test(row.ownerId)) throw Error('Invalid subscription binding')
  if (typeof row.revision !== 'number' || !Number.isSafeInteger(row.revision) || row.revision < 1) throw Error('Invalid authoritative revision')
  if (typeof row.status !== 'string' || !['active','past_due','canceled','blocked'].includes(row.status) || typeof row.payment !== 'string' || !['paid','unpaid'].includes(row.payment)) throw Error('Invalid lifecycle state')
  if (!safeTime(row.periodStart) || !safeTime(row.periodEnd) || row.periodEnd <= row.periodStart || typeof row.cancelAtPeriodEnd !== 'boolean') throw Error('Invalid entitlement period')
  // Copy only primitive fields: neither caller mutation nor extra metadata survives.
  return Object.fromEntries(keys.map(key => [key, row[key]])) as SandboxSnapshot
}

export function emptySandboxLedger(ownerId: string, subscriptionId: string): SandboxLedger {
  if (!owner.test(ownerId) || !identifier.test(subscriptionId)) throw Error('Invalid subscription binding')
  return { mode: 'test', ownerId, subscriptionId, snapshot: null, receipts: {} }
}

/** A future adapter must serialize/transactionally lock updates and persist the
 * unique event receipt and snapshot atomically. Provider event arrival time is
 * not an authoritative revision. This in-memory reducer does neither. */
export function applySandboxSnapshot(ledger: SandboxLedger, input: unknown): { ledger: SandboxLedger; outcome: 'applied' | 'duplicate' | 'stale' } {
  const snapshot = parseSandboxSnapshot(input)
  if (ledger.mode !== 'test' || snapshot.ownerId !== ledger.ownerId || snapshot.subscriptionId !== ledger.subscriptionId) throw Error('Subscription owner mismatch')
  const digest = createHash('sha256').update(JSON.stringify(snapshot)).digest('hex')
  if (Object.hasOwn(ledger.receipts, snapshot.eventId)) {
    if (ledger.receipts[snapshot.eventId] !== digest) throw Error('Conflicting duplicate event')
    return { ledger, outcome: 'duplicate' }
  }
  if (Object.keys(ledger.receipts).length >= 4096) throw Error('Sandbox receipt capacity reached; do not discard idempotency evidence')
  if (ledger.snapshot && snapshot.revision === ledger.snapshot.revision) throw Error('Ambiguous revision; reconcile canonical state')
  const stale = ledger.snapshot !== null && snapshot.revision < ledger.snapshot.revision
  return { ledger: { ...ledger, snapshot: stale ? ledger.snapshot : snapshot, receipts: { ...ledger.receipts, [snapshot.eventId]: digest } }, outcome: stale ? 'stale' : 'applied' }
}

/** Explicitly returns a test result, never a production entitlement. Check time
 * at every request in a future service: expiry cannot depend on webhook arrival. */
export function sandboxAccess(ledger: SandboxLedger, ownerId: string, now: number): { mode: 'test'; sandboxAccess: boolean; reason: string } {
  const denied = (reason: string) => ({ mode: 'test' as const, sandboxAccess: false, reason })
  if (ledger.mode !== 'test' || ownerId !== ledger.ownerId || !owner.test(ownerId) || !safeTime(now)) return denied('invalid-context')
  if (!ledger.snapshot) return denied('no-subscription')
  let snapshot: SandboxSnapshot
  try { snapshot = parseSandboxSnapshot(ledger.snapshot) } catch { return denied('invalid-snapshot') }
  if (snapshot.ownerId !== ownerId || snapshot.subscriptionId !== ledger.subscriptionId) return denied('invalid-binding')
  if (snapshot.status !== 'active') return denied(snapshot.status)
  if (snapshot.payment !== 'paid') return denied('unpaid')
  if (now < snapshot.periodStart) return denied('not-started')
  if (now >= snapshot.periodEnd) return denied('expired')
  return { mode: 'test', sandboxAccess: true, reason: snapshot.cancelAtPeriodEnd ? 'active-until-period-end' : 'active-paid-period' }
}
