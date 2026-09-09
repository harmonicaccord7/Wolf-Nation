# KAPORAL INTELLIGENCE — Reusable Engineering Context

Last operational refresh: 2026-09-09

This file is the low-cost context ledger for future KAPORAL engineering work. Read it before rediscovering project IDs, routes, provider choices, asset paths, or release procedures. Update it when an item materially changes.

## Canonical infrastructure

- GitHub repository: `harmonicaccord7/Wolf-Nation`
- Production branch: `main`
- Intended Vercel project: `kaporal-intelligence_2`
- Deleted duplicate Vercel project: `kaporal-intelligence` — do not recreate it.
- Canonical site: `https://www.kaporalintelligence.com`
- Supabase project ref: `sgibiqtyiuydpinxplbj`
- Supabase URL: `https://sgibiqtyiuydpinxplbj.supabase.co`
- Official logo: `public/brand/kaporal-intelligence-logo.svg`
- Support address: `globalsupport@kaporalintelligence.com`
- Newsletter sender identity: `KAPORAL INTELLIGENCE <intelligence@kaporalintelligence.com>`

## Secret handling — never put secret values in Git

Reusable configuration means reusing *names and locations*, not copying secret material into Markdown.

- Browser-safe variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL`.
- Supabase Edge Function secrets: `RESEND_API_KEY`, `NEWSLETTER_FROM_EMAIL`, `SITE_URL`, optional `SUPPORT_TO_EMAIL`.
- Vercel/Supabase service-role keys, SMTP passwords, API keys, auth tokens and recovery codes must remain in their secret stores.
- Never paste or commit a Resend API key, Supabase secret/service-role key, Gmail password, SMTP password or access token.

## Reusable platform systems

### ETF Flow Engine

- Edge Function: `etf-flow-estimator`
- Public series: `BTC_ETF_FLOW`, `BTC_ETF_COVERED_AUM`, `BTC_ETF_FUNDS_COVERED`
- Label: **KAPORAL Estimated U.S. Spot Bitcoin ETF Daily Net Flow**
- Method: change in issuer-published shares outstanding × prior stored NAV.
- Current zero-cost primary coverage: IBIT, ARKB, BITB.
- Scheduled twice on U.S. weekdays. Reuse stored `data_points`; do not call issuer pages again just to answer a question whose latest stored observation is still fresh.

### Research OS / Signal Lab

- Public accountability: `/track-record`, `/impact-map`
- Private newsroom: `/studio`
- Private Signal Lab: `/studio/signals`
- Experimental model: `K-EDGE 0.1`
- K-EDGE is a probabilistic research ranking system, not a profit guarantee and not an auto-trading engine.

### Email / support

- Newsletter Edge Function: `newsletter`
- Contact Edge Function: `support-contact`
- Incoming support: ImprovMX → Gmail/Thunderbird.
- Outgoing KAPORAL support identity: Resend SMTP.
- Auth email delivery should use Resend as Supabase custom SMTP, not Supabase's built-in production-limited mailer.

## Cache and quota policy

1. **Do not blindly purge useful data caches.** Supabase historical observations, ETF snapshots and derived data are reusable evidence, not disposable cache.
2. **Do not cache sensitive/session-changing surfaces.** `/auth/**`, `/account/**`, `/studio/**`, `/newsletter/**` and `/api/**` should use `no-store` behavior.
3. **Static branded assets may be cached aggressively** because file/version changes invalidate them. Reuse the canonical SVG instead of regenerating the logo.
4. **Invalidate only stale build/browser artifacts when evidence points to them.** Prefer a versioned asset, a fresh production deployment or a hard refresh over deleting all caches.
5. **Reuse provider observations within their natural freshness window.** Do not spend API credits fetching the same value repeatedly when the database already holds the latest valid observation.
6. **Never cache or persist one-time auth confirmation tokens in this file.** They are intentionally short-lived credentials.

## Efficient tool sequence

When an exact repository path, project ref or series code is known, fetch it directly instead of searching broadly. Query Supabase once for the smallest dataset needed. Check GitHub CI and the single intended Vercel status rather than polling duplicate projects. Checkpoint substantive work to a branch early, then PR → CI → merge → production verification.

For launch QA, prefer reusable automated checks (`npm run qa:launch`, typecheck, production build) before manual browser testing. Manual device testing is still required for visual/mobile acceptance.

## Current auth/newsletter operational checkpoint

On 2026-09-09 the newsletter health probe proved the code path is reachable but the Supabase Edge Function environment did not expose `RESEND_API_KEY`. It also revealed that `NEWSLETTER_FROM_EMAIL` and `SITE_URL` had been entered with the variable name included inside the value. Function code now sanitizes accidental `NAME = value` prefixes for non-secret settings, but the actual `RESEND_API_KEY` secret still must exist under the exact key name.

Supabase Auth must use production URL configuration and custom SMTP. Old confirmation emails that point to `localhost:3000` are invalid legacy messages and should be discarded after the configuration is corrected.

## Release rule

A release is not called production-ready merely because it builds. Required order: source control → CI/typecheck → production build → intended Vercel deployment success → database/provider health → route/sitemap checks → auth/newsletter/contact tests → mobile/desktop visual acceptance.
