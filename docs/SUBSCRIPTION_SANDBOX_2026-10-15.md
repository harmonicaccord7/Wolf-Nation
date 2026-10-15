# Subscription sandbox contract — October 15, 2026

## Delivered scope

This is the first **offline, test-only** billing increment, not a paid launch. `lib/billing/sandbox.ts` implements a normalized snapshot contract, an immutable in-memory event reducer and time-dependent sandbox access checks. `npm run qa:billing` is included in the existing `qa:tools` CI gate. A source boundary assertion prevents importing/calling this module from application routes, components, other libraries or Edge Functions. No checkout, webhook endpoint, customer, paid entitlement, provider dependency, database table, migration, RLS policy or public pricing page is introduced.

The proposed `research-sandbox` identifier is a fixture plan, not a purchasable product or a commitment to benefits/pricing. A successful synthetic check returns `mode: test` and `sandboxAccess`, never a production access token. Nothing in this module proves payment, authenticates a webhook or changes a reader/editor role. Arbitrary fixture input must never be used to authorize a real request.

## Rules exercised

| Condition | Sandbox result |
| --- | --- |
| No snapshot, wrong owner, malformed context or live-mode input | Deny |
| Active, paid, at/after period start and strictly before period end | Allow test access |
| Cancellation scheduled at period end | Retain test access only through the paid period |
| Period expired without any subsequent event | Deny immediately at the exact end boundary |
| Unpaid, past due, immediately canceled or blocked | Deny; no implicit grace period |
| Same event identifier and canonical payload | Duplicate; original state unchanged |
| Same event identifier with different payload | Reject conflicting duplicate |
| Older authoritative revision | Record receipt but do not roll back current state |
| Different event at equal revision | Reject; explicit reconciliation required |
| Different owner or subscription | Reject before any receipt/state change |
| Receipt capacity exceeded | Fail closed, never silently discard idempotency evidence |

Fixtures cover the full status/payment/cancellation/time matrix, renewal boundaries, cancellation followed by delayed activation, duplicate key ordering, extra/missing/invalid fields, input mutation, frozen state, cross-owner/subscription events, live payloads and bounded receipts. All values are synthetic. The reducer has no I/O and does not pretend to provide durable idempotency or concurrent safety.

## Required next increments before genuine provider acceptance

1. Owner chooses an authorized provider and supplies its **test-mode connection through secure configuration**, never in chat. No live keys, charges or plan purchase are authorized. Product benefits, pricing/currency, tax/refund/cancellation terms, market-data redistribution rights and commercial hosting eligibility remain decisions before sale. Current free news, calculators, CSV and account saving stay free; unvalidated predictions are not a paid promise.
2. Add a provider-specific server adapter: verify the signature over the untouched raw body using the official SDK, enforce test-mode/account/product allowlists, retrieve canonical provider subscription/invoice state, and bind the provider customer to an authenticated server-side owner. Checkout redirects, email addresses, user-editable metadata and client JSON are not proof of payment. The offline contract does none of these steps.
3. Define a real canonical reconciliation/version protocol. The fixture's `revision` is not a claim that a provider supplies monotonic event revisions. Never substitute arrival order or equal-second event creation timestamps. Reconcile under a subscription-scoped lock, persist the receipt and snapshot atomically, enforce unique provider/account/mode/event identifiers, and test retries/concurrent delivery. Distinguish API failure from cancellation; do not grant new access on unverifiable data. Document the duration of previously verified paid access.
4. Introduce reviewed migrations with RLS: owners can read only their safe membership metadata; clients cannot grant/update memberships or write event receipts; provider identifiers and audit payloads are private. Paid membership must never imply editorial/admin permissions. Native database fixtures must test owner isolation and atomic/idempotent processing before integration. Preserve existing newsletter consent and editorial policies.
5. Test checkout completion vs unpaid/abandoned checkout, renewal, failed payment, cancellation both ways, refund/dispute revocation policy, out-of-order/duplicate events, tampered signatures, account/mode mismatch, expiry without an event and portal access. Keep all routes no-store and all payment/personal data out of public logs/artifacts. Record actual provider sandbox evidence, not just synthetic tests.
6. Only then replace the intentional source boundary with reviewed server integration and actual authenticated acceptance. Enabling live payment requires separate owner authorization. A future eligible Supabase plan/native password-protection setting is a separate security gate, not something these tests enable.

## Current production checkpoint

Verified starting main: PR #47 merge `9b17f6b408421e2adea6d6596fd70ec132e15460`, exact tree `98c71bd8c319903626017d3c8e8cfd225016e017`. Main CI `38525878214` passed 137 browser tests and one existing intentional skip. Intended Vercel production `FiUkBUhWGNPMTHQU5mx1dSmn6AQ8` succeeded. Read the focused PR/current main for this increment's actual release evidence.

At 06:48 UTC on October 15, public `/status` was OPERATIONAL with 64,827 source-labelled observations, a four-minute-old market snapshot and 6/6 current source checks. North Africa's latest publisher item remains September 22; source-check success does not make it newly published news. Read-only Supabase audit at `2026-10-15T06:48:18.796632Z` found 41 draft newsletter issues, none published, database 81,063,059 bytes. The actual `/studio/newsletter` browser is signed out. The owner's content review remains acknowledged; genuine editor publication and consented issue delivery acceptance remain open. Security advisor still reports disabled native leaked-password protection with its existing remediation link.

This increment does not train/promote a model, publish financial content or predictions, send newsletters, change credentials, purchase a plan, enable billing or alter production data. Frozen model evidence remains unchanged; no 99.9% accuracy or profitable strategy is claimed.
