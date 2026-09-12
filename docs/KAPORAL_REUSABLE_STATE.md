# KAPORAL Reusable State

Last operational refresh: 2026-09-12. See the latest continuation below before relying on the historical checklist.

This file is a non-secret, reuse-first checkpoint for future KAPORAL engineering work. It intentionally excludes passwords, API secrets, service-role credentials, SMTP passwords and private tokens.

## Canonical production
- Product: KAPORAL INTELLIGENCE
- Canonical site: `https://www.kaporalintelligence.com`
- GitHub repository: `harmonicaccord7/Wolf-Nation`
- Production branch: `main`
- Intended Vercel project: `kaporal-intelligence_2`
- Duplicate Vercel project `kaporal-intelligence`: deleted by owner on 2026-09-09; do not recreate it.
- Supabase project ref: `sgibiqtyiuydpinxplbj`
- Supabase URL: `https://sgibiqtyiuydpinxplbj.supabase.co`

## Brand / support
- Official support address: `globalsupport@kaporalintelligence.com`
- Incoming support: ImprovMX -> `kaporalintelligence@gmail.com`
- Human reply workflow: Thunderbird + Resend SMTP
- Newsletter sender target: `KAPORAL Market Letter <intelligence@kaporalintelligence.com>`
- Account/auth sender target: `KAPORAL Intelligence Accounts <accounts@kaporalintelligence.com>`

## Reusable production functions
- `newsletter`: newsletter double opt-in/confirm/unsubscribe. Dynamic state; never cache.
- `support-contact`: private support intake + email delivery. Dynamic state; never cache.
- `etf-flow-estimator`: KAPORAL primary-source ETF estimator.

## ETF engine
Public label: **KAPORAL Estimated U.S. Spot Bitcoin ETF Daily Net Flow**.
Formula: change in issuer-published shares outstanding multiplied by the prior stored NAV, with T+1 observation aligned back to the prior business day.
Current validated free issuer set:
- IBIT — BlackRock/iShares holdings CSV
- ARKB — 21Shares/ARK public product page
- BITB — Bitwise public product page

Latest verified database observation at this checkpoint:
- Flow date: 2026-09-08
- Estimated flow: -67.27704227405344 USD millions
- Covered AUM: 64.79782336919 USD billions
- Funds covered: 2 (IBIT, ARKB). The supported issuer set above is broader than the latest observation's available coverage.
- Provider: KAPORAL Derived ETF Flow
Coverage is partial. Missing issuer observations remain missing; do not impute or fabricate them.

## K-EDGE
- Private experimental model: `K-EDGE 0.1`
- Stored in `signal_model_versions`
- Related tables: `signal_predictions`, `signal_outcomes`, `backtest_runs`
- Public profit guarantees are prohibited. Validate using timestamped forward calls and walk-forward/out-of-sample backtests with costs/slippage and no look-ahead.

## Current operational state
### Newsletter
- `RESEND_API_KEY` is restored in Supabase Edge Function secrets.
- Production delivery probe returned `delivery: sent`.
- Final production double-opt-in confirmation/unsubscribe acceptance passed on 2026-09-10. The original delivered QA email remained pending on GET, confirmed only after the button POST, and then unsubscribed successfully. The synthetic QA row was deleted.
- A launch-blocking schema mismatch was repaired: the Edge Function writes `confirmed`, but the legacy constraint allowed only `active`. Migration `20260910140844_allow_confirmed_newsletter_status.sql` adds `confirmed` while preserving every previous state. It is already applied to production.
- Launch hardening changes confirmation from GET/page-load to a deliberate POST/button so mail scanners cannot silently confirm an address.

### Supabase Auth
- Site URL is `https://www.kaporalintelligence.com`.
- Allowed production redirect includes `https://www.kaporalintelligence.com/auth/confirm`.
- Custom SMTP through Resend is enabled with KAPORAL account identity.
- A live resend test returned HTTP 200 and updated `confirmation_sent_at`.
- User completed the newest production confirmation successfully on 2026-09-09. Auth acceptance is PASS.

### Contact
- Synthetic production storage test passed.
- Resend email-delivery test returned `delivery: sent`.
- Synthetic QA rows were deleted after verification. Contact backend acceptance is PASS.

## Cache / token efficiency
- Do not purge stable public/static assets without a concrete stale-cache symptom.
- `/auth/**`, `/account/**`, `/studio/**`, `/newsletter/**` and `/api/**` should bypass caches with `no-store`.
- New deployments fingerprint Next.js static assets; do not repeatedly regenerate them to clear cache.
- Remove QA database rows after tests.
- Reuse stored issuer observations and ETF snapshots instead of repurchasing equivalent data.
- Prefer direct file fetches when a path is known; avoid rediscovering documented paths and identifiers.
- Never store live credentials or one-time confirmation tokens in this file.

## Security / release QA
- Next.js `16.3.2` was flagged by npm audit as critical after the Aug 2026 security release. Final launch branch upgrades to `16.3.4` and CI now runs `npm audit --omit=dev --audit-level=high`.
- Reusable route/link QA lives at `scripts/launch-qa.mjs` and is run by CI as `npm run qa:launch`.
- Private and transactional routes are excluded from robots crawling.

## Launch QA checklist
- [x] Newsletter: subscribe -> delivered -> deliberate confirm -> confirmed -> unsubscribe; QA row removed.
- [x] Auth: production URL + branded SMTP + fresh confirmation -> account/session.
- [x] Contact storage path + email delivery; synthetic QA data removed.
- [x] ETF database values/provenance verified.
- [ ] ETF public visual verified on production desktop + narrow phone.
- [ ] Automated public route/link sweep passes on final branch and production build.
- [x] `robots.ts` references canonical site and sitemap; private/transactional surfaces excluded.
- [ ] Production `sitemap.xml` HTTP verification and Google Search Console/Bing submission.
- [ ] Final mobile acceptance on narrow iPhone-class viewport and Android/Chrome-class viewport.

## Launch continuation, 2026-09-10
- Fixes and final QA are tracked in PR #21: `https://github.com/harmonicaccord7/Wolf-Nation/pull/21`.
- Per-series history queries restore ETF, Treasury, dollar and other lower-frequency observations hidden by a shared row limit. Public pages receive their own canonical URLs.
- The first PR commit passed both CI runs and produced a ready Vercel preview. The preview is protected, and the current Vercel connector cannot access the intended project or issue a share link. Do not weaken deployment protection to work around this.
- CI now includes desktop Chromium, 375px WebKit phone emulation and 393px Chromium phone emulation, with layout, navigation, ETF/provenance and confirmation-error checks plus screenshot artifacts. Record actual run results before marking acceptance passed. Emulation is not physical-device sign-off.
- The first browser run (34487454792) had 21 passes, 8 failures and one intentional desktop skip. It exposed a phone menu button below 44px width, now corrected. Two test assumptions were corrected: equivalent root canonical URLs normalize identically, and issuer links must match the current observation's fund count rather than an old count of three. Read the latest PR checks for the corrected candidate's result.
- Screenshot review also found pale section labels on light intelligence/contact backgrounds, desktop pill styles narrowing phone drawer links, a horizontal flex basis inflating the stacked newsletter field to 280px tall, and adjoining editorial navigation links that lacked the existing button styles. Scoped CSS corrections address all four.
- The follow-up browser run (34528962639) passed every behavioral assertion (28 passed, one capture failure, one intentional desktop skip). WebKit could not save the long homepage at 3x pixel density; capture now uses CSS pixels while retaining the original device emulation settings. Use the latest PR CI run and screenshots for final acceptance evidence.
- Google sign-in still returns 502 / connection refused in the cloud browser. GSC Wizard is connected as `harmonicaccord7@gmail.com`, but neither `https://www.kaporalintelligence.com/` nor `sc-domain:kaporalintelligence.com` exists in that account's accessible properties. Register/verify the property there, or connect the Google account that already owns it.
- Production sitemap HTTP verification passed again on 2026-09-10 (200, application/xml, 73 unique canonical-domain URLs, no auth/API/newsletter transaction URLs). Search Console processing status, live inspection and indexing requests remain open. Submission is distinct from Google choosing to index a page.
- Keep the application PR unmerged until the remaining acceptance evidence is available; only the newsletter database repair has been applied to production during this continuation.

## Current continuation, 2026-09-12
- User authorized resolving the remaining blockers and then merging PR #21/updating the site. Required evidence has not been waived. The application PR remains draft; production `main` is unchanged.
- Applied additive workspace migrations `20260912085512_market_decision_workspace`, `20260912085831_decision_workspace_refresh_job`, and `20260912090752_optimize_workspace_policies`. Filenames reflect actual production migration versions; the old unapplied `20260911210903` draft was replaced.
- Corrected a newly discovered Auth/profile mismatch: six Auth users had no application profiles. All six now have reader profiles; new signups create reader profiles in an Auth trigger. No editor/admin has been assigned. Ask the owner to identify the confirmed account that should have editorial access; do not infer privilege from signup metadata or an unrelated connector account.
- New Edge Functions: `decision-workspace-refresh` and `newsletter-delivery`. Both implement custom authorization. Anonymous delivery/refresh probes returned 401. Existing `newsletter` consent function is unchanged; the app routes new `d.` delivery-unsubscribe tokens to the new worker.
- `kaporal-decision-workspace-refresh` is active every six hours at minute 25 UTC. Its private job token stays in Vault. The job refreshes official calendars, stores reproducible observed-data runs, and prepares private drafts by cadence. It never approves, publishes or sends an edition.
- First real worker request: pg_net `2122`, HTTP 200, 45 official events, one weekly draft, zero publications and zero emails. Draft: `market-letter-weekly-2026-09-12`, id `3821816f-af7f-40b4-b1d9-06654961f7a4`.
- First reproducible corrected run: `cc2025dc-3277-4da8-9a64-e6d24b735bf5`, model version `0.2.0`, cutoff `2026-09-12T08:59:44.230Z`. Full inputs and SHA-256 retained. Four observed modules, two abstentions, 18 non-overlapping daily BTC replay windows. This is exploratory descriptive research, not model validation. There are still no calibrated K-EDGE predictions or forward outcomes.
- Corrected FOMC policy decisions to the final meeting day: September 16, 2026. No announcement time is invented from a date-only calendar. Source timestamps are cached with content, historical event pages remain addressable, and stored calendar sync preserves reviewed numeric-source metadata.
- Reader workspace now validates timezones/symbols, handles concurrent default-list creation, displays saved assets/events, and removes items with owner RLS. Chart/event pages expose Save controls. Newsletter cadence affects queue eligibility and is rechecked before sending.
- Newsletter publication is guarded in PostgreSQL: draft -> review -> editor approval with notes -> published. Published content is immutable. An editor can inspect/edit the full draft and its sources. Delivery uses private tokens, consent suppression, leased claims, bounded retries and stable Resend idempotency keys. A new issue-to-inbox acceptance run remains required after human review; the existing consent round trip remains historical PASS.
- Google Search Console now has `sc-domain:kaporalintelligence.com`. Inspection API: homepage and `/bitcoin` PASS, Submitted and indexed, INDEXING_ALLOWED, MOBILE. Last Google crawl: homepage Sep 10, Bitcoin Aug 31. These are indexed-state results, not live tests of this PR. Submitted-sitemap list remains empty. Browser now reaches Google sign-in; no signed-in browser session is available. GSC Wizard has inspection/read capabilities but no Google sitemap-submit action.
- Vercel connector still returns 404 for intended project `prj_aYdToRhngJ8yX94bWjKZYeLTEolQ` under its connected team. Do not weaken preview protection or recreate the deleted duplicate project. GitHub CI and GitHub's Vercel deployment status remain available evidence sources.
- Local production build, typecheck, route/link sweep, 31 database-policy assertions, model/calendar tests, email rendering/idempotency tests, and Deno checks for both new workers passed. Email unit tests did not send mail. New browser acceptance tests cover the event desk, chart inspection/range/rotation, save sign-in boundary and private mutation endpoints; attach the exact new CI results before claiming they passed.
- Real iPhone/Safari and Android/Chrome acceptance remains open. Browser emulation and Google's mobile crawler do not constitute physical-device acceptance.
- Review packet and closure matrix: `docs/RELEASE_GATE_2026-09-12.md` and `docs/EDITORIAL_REVIEW_2026-09-12.md`.
- Latest worker v2 uses model `0.2.1` and canonical JSON serialization. Real run `02853709-cc01-4b62-b374-35eadb89af93`, cutoff `2026-09-12T09:19:00.271Z`, has five observed modules and one geopolitical abstention; 18 replay windows. Stored input checksum `f1c17bd92dd83a14325d253363c28f0f7b9f04db0b5906c1b5a790e1b0683d62`, all six outputs and replay were independently reproduced after JSONB retrieval. This supersedes the initial v0.2.0 snapshot evidence above.
- Repeat refresh 2125 returned HTTP 200 and preserved the existing draft (zero new drafts, publications or sends). Production sitemap rechecked: HTTP 200, 73 unique canonical-origin URLs, no private routes. Remaining database advisor output is unused-index information and the pre-existing Auth leaked-password-protection setting.
- Expanded implementation pushed to PR candidate `20ed3a1d2a33e9badeafe8824207a9f44e2db207`; Vercel reports preview success at `https://vercel.com/harmonicaccord7-1039s-projects/kaporal-intelligence_2/2yJ1h6oXMrf3HBBhFm2dc4amD5LR`. Production main is unchanged. Current PR CI run: `34685552659`; record final browser evidence below after completion.
