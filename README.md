# KAPORAL INTELLIGENCE — Production v0.3

KAPORAL INTELLIGENCE is a premium, AI-assisted and human-supervised global intelligence platform for markets, crypto, macro, options, Africa, business, and technology.

## Current production status

- **Online Supabase backend:** active and secured with Row Level Security (RLS)
- **Research CMS:** story intake, K-SCORE, article drafts, review queue, agent-run audit trail
- **Public editorial layer:** published articles only, structured research pages, corrections, predictions, Impact Maps
- **Reader layer:** authentication foundation, bookmarks, newsletter signup
- **Live data layer:** Supabase Edge Function for BTC/ETH market ingestion with provenance and ingestion logs
- **Frontend:** Next.js 16.3.2 + React 19.2.8
- **Supabase clients:** @supabase/supabase-js 2.112.3 + @supabase/ssr 0.12.4

## Production backend

Supabase project URL is provided through environment variables. Never expose secret/service-role keys to the browser.

Required public environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://sgibiqtyiuydpinxplbj.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<set in deployment environment>
```

Optional provider keys:

```bash
COINGECKO_API_KEY=
FRED_API_KEY=
```

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Product surfaces

- `/` — public intelligence homepage
- `/auth` — reader/research-team authentication
- `/studio` — protected research CMS and newsroom
- `/article/[slug]` — evidence-backed investigation page
- `/api/market/overview` — normalized live market data endpoint

## Editorial workflow

Signal Scout → Niche Scout/K-SCORE → Source Analyst → Fact Checker → Domain Analysts → Contrarian Reviewer → Quant Reviewer → Visual Intelligence Editor → Standards Review → Editor-in-Chief → Human approval → Publish → Prediction Ledger → Weekly retrospective.

## Security model

- RLS is enabled on every public-schema table.
- Anonymous users can read only published/public material.
- Reader data is owner-scoped.
- Internal research tables default-deny unless the authenticated profile has `researcher`, `editor`, or `admin` role.
- Privileged secrets are never expected in browser code.
- Security advisor currently reports zero security lints.

## Deployment

The codebase is Vercel-ready. CI runs on the development and main branches. Deployment secrets belong in Vercel/GitHub secret stores, never committed to source control.
