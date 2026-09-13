# KAPORAL PR #21 release evidence

Application release is held. The owner has authorized completing the work and merging when the required evidence passes. No production application deployment or merge has been performed during this continuation.

| Gate | Evidence now | Remaining closure action |
|---|---|---|
| Database migration and access | Applied three migrations; repaired six missing reader profiles; owner isolation and publication controls pass 31 assertions. | Editor assignment completed and verified on September 12 (one editor, five readers). Verify that account's authenticated Studio and reader flows. |
| Financial scenario/editorial review | Corrected CPI/PCE/FOMC mechanisms, added distinct employment/GDP scenarios, buying/waiting/staging tradeoffs and a full edition review screen. Concrete packet is ready. | A human editor must read and approve the exact content. AGENTS.md requires this; an automated review cannot stand in for that person. |
| Data and models | Official refresh stored 45 events and full model inputs; latest v0.2.1 run emitted five observed values and one abstention. The stored checksum, all six results and 18 daily BTC replay windows were independently reproduced after the database round trip. Charts have sources, range controls and accessible inspection. | The first trained Bitcoin baseline, long-history walk-forward evaluation and immutable forward call are now stored; see the BTC milestone below. Its predictive advantage was not demonstrated and no future outcomes have matured. Other predictive categories remain incomplete. |
| Newsletter operations | Recurring private draft preparation is active. Database approval, immutable publication, consent/cadence selection, lease-based sending, retries, unsubscribe and idempotency are implemented/tested. | Approve the first edition, confirm a test recipient, and verify actual issue receipt/unsubscribe/suppression. Zero confirmed subscribers were present after historical QA cleanup. No broadcast was sent. |
| Search Console | Domain property accessible. Homepage and Bitcoin URL Inspection API results PASS, indexed, robots/indexing allowed, Google mobile crawl. | Submit the canonical sitemap in the owner's signed-in Search Console and record processing status. The submitted list is empty; the available connector cannot submit it. New production URLs need post-release inspection. |
| Browser and physical devices | Candidate 891a491 passed 53 browser tests (zero failures, one intentional skip), and its screenshots were inspected. The Bitcoin-model addition requires its own current candidate CI result. | Record the current CI results and inspect screenshots. Real iPhone/Safari and Android/Chrome must cover figures/source links, chart interaction, event filtering/timezone, search, form keyboard input, save/remove, menu and rotation. |
| Merge and production update | PR #21 remains draft. Local build/typecheck and meaningful policy/model/email tests pass. | Merge only after applicable evidence is complete; then verify the deployed main commit, canonical routes, live data, forms, sitemap and monitoring. Post-deployment checks cannot be pre-deployment requirements. |

## Operational evidence

- Supabase project: `sgibiqtyiuydpinxplbj`.
- Applied migration versions: `20260912085512`, `20260912085831`, `20260912090752`.
- Refresh request 2122: HTTP 200; 45 events; one draft; no publication or sending. Repeat request 2125: HTTP 200; 45 events; existing draft preserved; zero new drafts, publications or sends.
- Reproducible model run: `02853709-cc01-4b62-b374-35eadb89af93` (v0.2.1) at `2026-09-12T09:19:00.271Z`. Canonical object-key serialization preserves the checksum through JSONB storage. Independently recalculated all six module outputs and replay from this stored snapshot with exact equality.
- Snapshot SHA-256: `f1c17bd92dd83a14325d253363c28f0f7b9f04db0b5906c1b5a790e1b0683d62`.
- Cron: `kaporal-decision-workspace-refresh`, `25 */6 * * *`, active after the successful first run.
- Both new workers returned 401 to unsigned attempts. The delivery worker requires an editor session for sending; a delivery unsubscribe token can only unsubscribe.
- Original consent function remains unchanged. New delivery tokens do not rotate or invalidate existing consent links.
- Fresh database advisors: no table/RLS/security policy findings and no performance warnings; only unused-index information and the existing Auth account-setting advisory below.
- Current production sitemap returned HTTP 200: 73 unique URLs, all on `https://www.kaporalintelligence.com`, no private/transactional URLs. This is the existing production sitemap, not the expanded PR sitemap.
- First expanded browser run `34685552659`: 50 passed, three timeouts, one intentional desktop skip. The three timeouts came from waiting for an optional omitted robots tag on the public archive; changed the test to read all matching tags immediately and retained the required consent-page `noindex` assertion. A fresh candidate run is required.
- Visual review of the actual ETF, event-detail and chart screenshots found a dark watchlist control on the event hero and an overly thin chart line. Corrected button/link/notice contrast and chart stroke width; added the event-save sign-in flow to the existing browser test. Fresh screenshots must verify the correction.
- Provider acceptance is recorded as `sent`; it is not proof of inbox delivery. Retries stop for reconciliation before Resend's 24-hour deduplication window expires. [Provider documentation](https://resend.com/docs/dashboard/emails/idempotency-keys).
- Supabase's existing Auth leaked-password-protection advisory remains an account setting, separate from this PR's dependency audit. [Supabase guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Concrete acceptance workflow

1. Use the exact PR preview from GitHub/Vercel's deployment result. The connected Vercel account currently cannot access the intended project; the owner can open it with the owning Vercel account. Do not disable deployment protection.
2. Sign in with a verified reader: save BTC, save an official event, refresh the account, remove each item, change timezone/cadence, and confirm persistence. Verify another account cannot see or modify these rows.
3. In Studio, open the stored draft, read every block and source, edit/save if needed, submit to review, record human review notes, approve, then publish. A repeat generation must not overwrite it.
4. With a consented test subscriber, prepare the edition queue and send one batch; inspect provider acceptance and the recipient's actual message. Repeat the queue action to confirm no duplicate issue. Unsubscribe from the delivered issue and confirm later delivery eligibility is false.
5. On actual iPhone/Safari and Android/Chrome, complete the public and account interactions above in portrait and landscape, including the on-screen keyboard. Record device/browser versions, exact preview URL/commit, result and screenshots or video.
6. Submit `https://www.kaporalintelligence.com/sitemap.xml` in the verified domain property's Sitemaps screen. Record the processing result. Indexed-state API checks already passed for `/` and `/bitcoin`; request recrawl after the accepted release where necessary.

Nothing in this file marks a human review, physical device or future model outcome as complete without evidence.

## Bitcoin milestone update, September 12 16:40 UTC

The first model-engineering milestone is now complete: 3,541 real daily candles, fitted version 0.1.0, 985 chronological test targets, independent numerical reproduction, one immutable future-dated call and an enabled daily outcome job. The model did not outperform its probability benchmark and remains private/experimental. Zero forward outcomes have matured; other prediction categories are unfinished. Full source, IDs, methodology, measurements and limits: [BTC results](../research/btc24/RESULTS_2026-09-12.md).

Editor assignment is complete (one existing confirmed owner account, five remaining readers). Prior candidate 891a491 passed 53 browser tests and screenshot review. The new Bitcoin candidate still needs its own CI evidence. No human financial approval, device acceptance, new issue receipt or Google sitemap submission has been claimed by these engineering changes.

## Overnight job verification, September 13 07:19 UTC

The 00:20 UTC scheduled run added the next day's real forecast and advanced source history to 3,542 candles; the 01:20 retry left two total forecasts. Zero outcomes have matured. The first can resolve after September 14 00:00 UTC. The private daily automation is functioning; this does not establish prediction skill or close the other release requirements.
