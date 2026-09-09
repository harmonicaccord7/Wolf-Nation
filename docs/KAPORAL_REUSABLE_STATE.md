# KAPORAL Reusable State

Last operational refresh: 2026-09-09.

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
- Account/auth sender target: `KAPORAL Accounts <accounts@kaporalintelligence.com>`

## Reusable production functions
- `newsletter`: newsletter double opt-in/confirm/unsubscribe. Dynamic state; never cache.
- `support-contact`: private support intake + optional email delivery. Dynamic state; never cache.
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

## Current launch blockers / state
### Newsletter
A production Edge Function diagnostic on 2026-09-09 returned `resend_api_key_missing`. This means the newsletter code is active but the `RESEND_API_KEY` is not currently available to that Supabase Edge Function runtime. Add the secret in Supabase Edge Function secrets, then re-run double-opt-in QA. The QA subscriber used to diagnose this was deleted afterward.

### Supabase Auth email
Observed confirmation links returned to `localhost:3000`, proving Supabase Auth URL configuration is stale. Required hosted configuration:
- Site URL: `https://www.kaporalintelligence.com`
- Allowed redirect URL: `https://www.kaporalintelligence.com/auth/confirm**` (or exact route variants supported by the dashboard)
- Production application uses `/auth/confirm`.
- Configure custom SMTP through Resend so messages originate from KAPORAL rather than Supabase's default sender.

Recommended Supabase Auth SMTP values:
- Host: `smtp.resend.com`
- Port: `465` with SSL/TLS, or `587` with STARTTLS if required by the dashboard
- Username: `resend`
- Sender email: `accounts@kaporalintelligence.com`
- Sender name: `KAPORAL Accounts`
- Password: dedicated Resend API key stored only in Supabase; never commit it.

Recommended signup email template for SSR/PKCE:
```html
<h2>Confirm your KAPORAL account</h2>
<p>Follow the link below to confirm your email address and finish signing up.</p>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/account">Confirm email address</a></p>
<p>If you did not request this account, no action is required.</p>
```
Keep auth email transactional and minimal; do not turn it into a marketing email.

### Contact
A synthetic production call successfully inserted a private `contact_messages` row, proving the storage/routing path works. The synthetic QA row was deleted immediately after verification. Email forwarding from the Edge Function still depends on the same missing Resend key and should be retested after the secret is restored.

## Cache / token efficiency
- Do not purge stable public/static assets without a concrete stale-cache symptom.
- State-changing auth/newsletter/contact routes should use `Cache-Control: no-store`.
- New deployments naturally fingerprint Next.js static assets; do not repeatedly regenerate them to 'clear cache'.
- Remove QA database rows after tests.
- Reuse the issuer source URLs and stored ETF snapshots; do not repurchase equivalent ETF-flow data unless the free engine cannot meet a defined requirement.
- Prefer direct file fetches when a path is known; avoid broad repository searches for already documented locations.

## Launch QA checklist
- [ ] Newsletter: Resend secret restored; subscribe -> delivered -> confirm -> confirmed -> unsubscribe.
- [ ] Auth: Site URL no longer localhost; branded SMTP; create account -> confirm on laptop + iPhone -> session/account.
- [x] Contact storage path inserts successfully; synthetic QA data removed.
- [ ] Contact email delivery retested after Resend secret restoration.
- [x] ETF database values/provenance verified.
- [ ] ETF public visual verified on production desktop + narrow phone.
- [ ] Public route/link sweep after final deployment.
- [x] `robots.ts` references canonical site and sitemap; `/auth` and `/studio` excluded from indexing.
- [ ] Production `sitemap.xml` HTTP verification and Search Console/Bing submission.
- [ ] Final mobile acceptance on narrow iPhone-class viewport and Android/Chrome-class viewport.
