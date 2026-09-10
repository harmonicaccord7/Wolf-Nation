# KAPORAL Reusable State

Last operational refresh: 2026-09-10.

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
- Flow date: 2026-09-03
- Estimated flow: +471.32921260273315 USD millions
- Covered AUM: 69.75811531125 USD billions
- Funds covered: 3 (IBIT, ARKB, BITB)
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
- Google sign-in still returns 502 / connection refused in the cloud browser. GSC Wizard is connected as `harmonicaccord7@gmail.com`, but neither `https://www.kaporalintelligence.com/` nor `sc-domain:kaporalintelligence.com` exists in that account's accessible properties. Register/verify the property there, or connect the Google account that already owns it.
- Production sitemap HTTP verification previously passed (200, 73 URLs). Search Console processing status, live inspection and indexing requests remain open. Submission is distinct from Google choosing to index a page.
- Keep the application PR unmerged until the remaining acceptance evidence is available; only the newsletter database repair has been applied to production during this continuation.
