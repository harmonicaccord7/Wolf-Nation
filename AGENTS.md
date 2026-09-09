# KAPORAL Agent Efficiency Rules

This repository is KAPORAL INTELLIGENCE. Agents working here must minimize repeated work and avoid paying twice for the same research, media or compute result.

## Reuse-first rule
- Read `docs/KAPORAL_REUSABLE_STATE.md` before broad discovery work.
- Reuse existing Supabase tables, migrations, Edge Functions, market-data series, source URLs, graphics and research outputs when they still satisfy the task.
- Search or fetch a known file directly instead of rediscovering the repository.
- Prefer one batched verification query over repeated near-identical calls.
- Never regenerate paid media, stock or AI assets merely to create a duplicate. Preserve stable asset/source identifiers in project documentation when licensing allows reuse.
- Do not store API keys, passwords, service-role keys, access tokens, SMTP passwords or other secrets in this repository or reusable-state documents.

## Cache policy
- Keep harmless static/CDN caching for versioned public assets.
- Authentication, newsletter confirmation/unsubscribe, contact submissions and other state-changing endpoints must be `no-store`.
- Clear or bypass only caches that can make verification stale. Do not purge useful caches indiscriminately.
- QA rows and synthetic test data must be deleted after verification unless a test fixture is explicitly required.

## Source-of-truth order
1. Production Supabase state for database/functions/data observations.
2. `main` for deployed application code.
3. GitHub CI and the intended Vercel project for deployment status.
4. `docs/KAPORAL_REUSABLE_STATE.md` for stable identifiers and reusable operational context.

## Safety and editorial rules
- Never fabricate market data, ETF flows, returns, backtests or research conclusions.
- K-EDGE remains experimental until out-of-sample validation and forward prediction evidence exist.
- No automated publication of financial conclusions without the existing human review gates.
- No personalized profit guarantees or trade promises.
