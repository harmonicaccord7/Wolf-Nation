# KAPORAL Efficiency Protocol

Purpose: project-local instructions for any engineer or AI agent working on KAPORAL INTELLIGENCE. This is not a secret store and not an autonomous trading agent.

## Start here

1. Read `docs/KAPORAL_REUSABLE_CONTEXT.md` before discovery work.
2. Reuse existing routes, Edge Functions, tables, series codes, providers and brand assets before creating replacements.
3. Fetch a known file directly. Search/list only when the path is unknown.
4. Query the smallest useful dataset once and reuse the result throughout the task.

## Cost discipline

- Prefer official/free primary data and already-stored Supabase observations.
- Do not buy or call a paid data source until a missing feature has been proven valuable with the free/private research layer.
- Do not regenerate an asset when an approved canonical asset already exists.
- Do not repeatedly invoke an external provider for the same observation/date.
- Keep K-EDGE/backtests private until statistical evidence supports publication.

## Cache discipline

- Sensitive and state-changing routes: `no-store`.
- Historical research/data: preserve and reuse.
- Static brand assets: cache/version, do not purge blindly.
- Clear a browser/build cache only when the symptom is consistent with stale content and a fresh deployment/versioned asset did not resolve it.

## Secret discipline

Only secret *names* may appear in repository documentation. Actual API keys, SMTP passwords, service-role keys, auth tokens and recovery codes stay in managed secret stores. Never use a Markdown cache as a secret vault.

## Engineering checkpoint discipline

For a substantive batch:

1. Create/continue one focused branch.
2. Checkpoint code early enough that a conversation/tool boundary cannot strand the work.
3. Run `npm run qa:launch`, `npm run typecheck`, then `npm run build`.
4. Open one PR with a precise scope.
5. Merge only after CI passes and the intended Vercel project succeeds.
6. Ignore/decommission duplicate deployment projects rather than treating their failures as production failures.
7. Update the reusable context ledger when infrastructure or canonical identifiers change.

## Data and prediction discipline

KAPORAL may rank opportunities and publish probabilities only when inputs, timestamp, horizon and invalidation are recorded. Every forward signal should later receive an outcome. Backtests must be walk-forward/out-of-sample, account for fees/slippage where applicable, and avoid look-ahead. Never transform a high score into a guaranteed-profit statement.

## Stop and ask only when necessary

Do not ask the user to repeat information already in the reusable context ledger or source control. Ask only for credentials/secrets that cannot be accessed through a managed secret store, paid-plan approval, or a genuinely ambiguous product decision.
