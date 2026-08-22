# KAPORAL INTELLIGENCE — Production Architecture

## Product principle

KAPORAL is not a content farm. The system is designed around signal detection, source verification, causal analysis, adversarial review, visual explanation, human approval and post-publication scoring.

## Runtime

- Next.js 16 / React 19 frontend and server routes
- Supabase Postgres as canonical application/research database
- Supabase Auth with RLS-based authorization
- Supabase Edge Functions for controlled external-data ingestion
- Vercel as target web runtime/CDN
- GitHub as source-control and review system

## Core data domains

1. Editorial: articles, versions, authors, desks, categories, tags
2. Research: story candidates, K-SCORE, sources, claims, agent runs, review tasks
3. Intelligence graphs: Impact Maps, nodes, causal edges, signals
4. Accountability: predictions, resolutions, corrections, weekly reviews
5. Live data: providers, ingestion runs, market snapshots
6. Audience: profiles, bookmarks, newsletter subscribers

## Security boundaries

- Browser uses only Supabase publishable credentials.
- Service-role/secret keys never enter client code.
- Every public-schema table has RLS enabled.
- Internal research tables are deny-by-default to ordinary readers.
- Research/editor/admin access is enforced in database policies, not only hidden in UI.
- Public financial content is education/research, not personalized instructions.

## Newsroom workflow

Signal Scout → Niche Scout/K-SCORE → Source Analyst → Fact Checker → Domain Analysts → Contrarian Reviewer → Quant Reviewer → Visual Intelligence Editor → Standards Review → Editor-in-Chief → Human approval → Publish → Prediction Ledger → Weekly retrospective.

## Deployment policy

`develop/kaporal-intelligence` is the active integration branch. `main` is reserved for reviewed deployable code. Pull requests should pass typecheck/build and security review before merge.
