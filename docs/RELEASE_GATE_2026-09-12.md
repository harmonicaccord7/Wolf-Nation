# KAPORAL PR #21 release evidence

## Latest acceptance checkpoint — 19 September 2026

- **Revised financial-content authorization recorded.** The owner instructed us to finish the revised approval and authenticated editor/newsletter acceptance, then merge PR #21. That instruction is recorded against the scenario/background copy at `21689fa493305fab9acea9a4dca1fb67ebc25698`. The September 12 first-edition dates remain a historical snapshot, not a current publication approval.
- **Current application checks pass.** CI `35440138813` passed 77 browser tests with zero failures and one intentional desktop skip, together with the required source/model/ledger/RLS/newsletter/audit/typecheck/build checks. Vercel preview succeeded.
- **Authenticated acceptance still open.** The exact preview requires Vercel sign-in; secure browser authentication has been requested. The owner editor role is present. The latest September 18 draft includes the revised six calendar explanations and upcoming releases. Zero editions are published or delivered; the test has not been substituted with a database impersonation.
- **Next transition.** Complete real editor sign-in, create/recheck the current edition, review/approve/publish through Studio, deliver only to the consented owner test recipient, and verify inbox receipt, unsubscribe, suppression and duplicate protection. Then merge the checked PR and verify the production deployment. Owner merge authorization already exists.

This checkpoint supersedes older pending-approval statements in the historical sections below. It does not close an unobserved authenticated test or validate the experimental prediction models.

Application release is held. The owner has authorized completing the work and merging when the required evidence passes. No production application deployment or merge has been performed during this continuation.

## Current checkpoint — September 19, 2026

This section supersedes dated status statements below; the older sections retain their historical evidence.

Candidate `219acce` passed the password-control checks on all three browsers, but run `35439624130` exposed an outdated Daily News test assumption (74 passed, three news-test failures, one intentional skip). The UN feed's latest article is September 9: zero geopolitical articles in seven days and ten in thirty days, confirmed directly in production. The default seven-day filter correctly excluded them. The follow-up test selects an actually observed topic and checks every visible result, including the existing no-match/search behavior; it no longer assumes weekly publication by every source. The final candidate's CI result belongs in the PR description.

| Area | Current evidence | Release implication |
|---|---|---|
| Newsletter consent | Owner reports receiving the email and completing subscription successfully. Production has one confirmed subscriber, confirmed September 13 at 19:30 UTC. | Consent email reception and subscription are accepted. Do not ask the owner to repeat this test. This is separate from delivery of an actual newsletter edition. |
| Account password visibility | Production `/auth` still has the older form without visibility controls. PR controls now explicitly say **Show password / Hide password**, for password and confirmation independently. Regression coverage exercises signup, value preservation, mobile overflow and duplicate-account feedback. | Use the new candidate's CI result; this change is not live until application deployment. A real recovery-email-to-password-reset round trip remains unobserved. |
| CI and deployment | Before this follow-up, head `5eff8c7ca324465b6632aa5a2e0654b9f34a5f84` passed CI run `34764449687` (77 browser passes, one intentional skip) and Vercel preview. PR #21 is open, draft and mergeable. | Record the new commit's checks in the PR description. Mergeability alone does not close acceptance. |
| News and draft automation | All four source feeds were checked successfully September 19 at 11:05 UTC. Ten private draft editions exist; newest updated September 18. Publisher dates remain visible, even when older than the fetch. | Scheduled refresh is operating. No edition has been published or broadcast; drafts must not be described as delivered newsletters. |
| Bitcoin research | Eight frozen forward forecasts exist: six resolved, two open. The trained baseline previously failed to outperform its benchmark. | Research remains private and experimental. Six outcomes do not validate predictions; completing every future model is not proof of application correctness. |
| Financial content | Owner reviewed the original packet and requested the September 13 educational revisions; no later approval of that revised text is recorded. | `AGENTS.md` requires human review before publishing financial conclusions. Review the revised scenario/background packet and a current edition, not a stale upcoming-event draft. |
| Account/editor acceptance and edition delivery | Owner editor role and database isolation/publication checks passed previously. No actual signed-in Studio approval/publication or issue-to-inbox delivery acceptance is recorded. | Finish authenticated reader/editor acceptance and one approved issue delivery/unsubscribe test. Preserve existing consent and avoid duplicate sends. |
| Devices and Search Console | Owner says real-phone checks look good so far. Automated desktop, WebKit phone and Chromium phone checks passed previously. Google sign-in was explicitly deferred. Current GSC connector is blocked by its expired trial. | Preserve the owner's positive phone evidence; do not invent device versions or screenshots. Sitemap submission/processing remains unverified and deferred; the connector subscription is not a requirement to use Google's free console. |
| Incoming email | Received mail in the business Gmail proves `globalsupport@kaporalintelligence.com` forwards through ImprovMX to `kaporalintelligence@gmail.com`. No received message addressed to `intelligence@` or signed-in alias configuration was available. | `intelligence@` is a verified outbound newsletter identity, not evidence of an inbound forwarding rule. Confirm its ImprovMX alias before promising replies reach Gmail. |

The remaining work is not a new seven-part implementation project. Consent delivery is closed; the application changes already exist. Outstanding release acceptance is the revised human editorial approval, authenticated account/editor and first-edition delivery evidence, then merge and post-deployment verification. Password recovery and the final physical-device scope must be recorded accurately. Google sign-in stays deferred at the owner's request. Public prediction claims remain disabled while research continues.

## Confirmation-link follow-up, September 13

The owner reported that the **Confirm subscription** link in a received email did not appear to work. The production confirmation page returned HTTP 200 for a controlled token-shaped URL. A controlled synthetic pending subscriber was then confirmed through the deployed website endpoint (`POST /api/newsletter/confirm`) with HTTP 200 and `{\"ok\":true,\"status\":\"confirmed\"}`; the synthetic row was deleted immediately. This proves the production database, Edge Function and website API path are operational, but it does not substitute for observing the owner's mailbox click.

Newsletter Edge Function v13 is now active. New messages use the canonical HTTPS KAPORAL host even if a malformed `SITE_URL` secret is present, and include both an HTML copy/paste fallback URL and a plain-text alternative. The landing page now explains that opening the email is step one and the clearly labelled **Confirm subscription** button is the deliberate step two. A repeated submission for an existing pending address now retries through the same ten-minute cooldown instead of getting stuck at `already_pending`; the old production form can therefore recover without a UI deployment. A fresh confirmation request for the owner's pending address returned `sent` at 14:56 UTC; provider acceptance is recorded, but inbox receipt and the final click still need the owner's observation.

The prior browser CI failures were isolated to an inaccessible test locator (`getByLabel('Topic')`) and a stale confirmation-button label; the rendered controls were present. The tests now use accessible roles and record whether the third-party TradingView iframe actually attaches. Current PR head: `1de4d029c536f25ceb3f6f56d7dcdea1c2cbbac9`; CI run `34764190257` is green with 77 passed and one intentional desktop skip. Keep the release held for the real mailbox confirmation, human editorial approval and the other gates below.

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

## September 13 scope additions

- Owner requests: plain-English financial background, visible Daily News, email-only newsletter signup, stronger email uniqueness, account recovery/password visibility, and TradingView news/referral placement.
- Revised exact text: `docs/EDITORIAL_REVIEW_2026-09-12.md`. Original newsletter remains draft; revisions do not constitute approval. The stored draft now contains 62 blocks.
- Daily News backend has 50 real dated headlines across all four configured sources and an enabled hourly job. Publishing facts from approved RSS sources does not publish financial conclusions or research drafts.
- New newsletter reservation migration and v11 worker are active. Existing subscription state is protected against repeated requests; unsubscription requires new confirmation before resubscription.
- Browser checks added to CI for email-only navigation/subscription, password visibility, recovery endpoint selection, duplicate-email feedback, ten financial backgrounds, news search/categories/dates and TradingView attribution. Inspect the CI for the new commit before closing these gates.
- Real user mailbox recovery and review of revised financial copy are still outstanding. Earlier user phone checks are positive provisional evidence; Google sign-in is deferred.
- TradingView personal-referral bulk-email/automation is excluded by its program terms. A normal TradingView tool card is prepared; activation of referral marketing requires the appropriate reviewed Partner Program link. Its news widget cannot guarantee the identical news selection from a personal chart and is not an API for model input.
- No merge, production application deployment, newsletter issue send, paid partnership signup, or claimed model validation is authorized by successful implementation checks alone.
