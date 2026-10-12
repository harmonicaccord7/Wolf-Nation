# KAPORAL delivery and product brief — 11 October 2026

Operational refresh — **12 October 2026**: [PR #39](https://github.com/harmonicaccord7/Wolf-Nation/pull/39) is now merged at `33621e9b65b4bfbc96fce47f6cd7b5d38adf7b8a`, with both candidate CI runs, post-merge main CI and the intended Vercel production deployment successful. Capital Intelligence News is live at `/news/journal`, with ten complete existing explainers and a verified homepage entry. This supersedes the October 11 journal-candidate wording below; the remaining content/model/product gaps still apply.

Fresh production observations: daily crypto history advanced through the October 12 close endpoint, representing October 11's completed UTC day. Database size is about 72.7 MB. Private BTC v0.1.0 has 31 issued forecasts, 29 resolved and two open; this is inference evidence, not retraining or validation. There are 34 private newsletter drafts, zero published editions and zero published original-reporting articles. The owner has reviewed the edition; the actual browser is signed out, so recording its approval and testing publication still require an authorised editor session. No broadcast, charge or credential change occurred.

## What the platform can credibly offer

KAPORAL is a decision-research workspace: trace a market observation to its source, understand an upcoming event, and compare the consequences of alternative assumptions before committing money. Its practical value should come from readable research, documented scenarios, local-currency risk and repeatable workflows. It cannot currently sell a validated trading signal or a promise of profitable calls and puts.

For a banker, business owner or adviser, demonstrate: Bitcoin ten-year history; a CPI explanation; a buy/wait/stage/options comparison with visible fees and losses; and a Cameroon or Botswana currency/inflation scenario. The same data can lead to different decisions because the user’s budget, horizon, currency and risk differ. These calculators do not infer suitability or submit trades.

## Concrete delivery state

| Area | Evidence on 11 October | Limit that remains |
|---|---|---|
| Release | PR21 was already merged under the owner’s ship-increments instruction. PR36 history, PR37 Decision Lab and PR38 Africa workspaces are now merged separately after green checks. | Model performance does not hold ordinary application updates. The public journal is the next checked increment. |
| Public histories | Production BTC 10Y has 3,653 closes from 11 October 2016. MAX retains earlier 2016 Coinbase observations. ETH starts at the May 2016 Coinbase listing; SOL at its June 2021 listing. FRED macro/yield histories now retain 2016 observations; gold futures and DXY retain October 2016 onward. | Daily closes differ from current CoinGecko quotes. Listing dates, non-trading days and provider gaps remain visible. No pre-listing values are invented. |
| ETF/options evidence | Bitcoin ETF flow remains a source-labelled reconstruction from available issuer observations. | Two covered funds and roughly 26 recent ETF observations are partial coverage. Historical options ingestion also starts in August 2026. A chart button cannot manufacture licensed history. ETF launches constrain possible start dates. |
| Free Decision Lab | Same-budget buy, cash, two-stage, long-call and long-put comparisons; visible assumptions, whole contracts, fees, premium loss, break-even, payoff chart and CSV. Production arithmetic was checked interactively. | Option premiums are editable assumptions, not exchange quotes. Expiry-only hypothetical USD settlement; no live orders, leverage, probabilities or suitability advice. |
| Africa workspaces | Nine country pages, active homepage/coverage links, four macro indicators per country, official exchange portals, country questions and currency/inflation tools. Botswana has 47 real World Bank points: 2014–2025, reserves through 2024. | National news is not a complete newswire. Exchange links are source portals; local equity quotes, fundamentals and exchange-specific data licensing remain to build. |
| Original public journal | Capital Intelligence News candidate provides full on-site versions of the ten existing KAPORAL explainers, a home entry, search/sitemap discovery, and approved reporting/edition archives. | No original reporting or newsletter edition is published in the database at this audit. Do not present external RSS headlines as KAPORAL reporting. |
| Newsletter | Owner states the edition was reviewed; email-only double opt-in and account sign-in are separate. | Approval must be recorded through the authenticated editor workflow before publication. Browser is signed out. Web publication, delivery queue, provider acceptance and actual inbox receipt are different evidence. No broadcast is authorised by this release. |

## Why charts were too short

The public chart pipeline had short provider ranges and a capped retained tail. That was independent of the longer private BTC research snapshots. PR36 removed those caps and added a bounded daily-close importer with source URLs, stored timestamps and checksums. It did not retrain a model or turn descriptive history into a trading forecast.

The production database occupies about 72.1 MB, well below the Free plan’s 500 MB allowance. Capacity was not the cause of the short history. Check database size, egress, CPU, connection pressure, API latency and failed jobs before attributing a future data problem to a subscription tier.

## Honest model status

The actual trained version is **K-BTC-24H 0.1.0**, an experimental logistic baseline. Eight lagged OHLCV features cover 1/3/7/14-day returns, 7/30-day volatility, daily high/low range and relative volume. Its target is the next complete UTC day’s BTC close versus its open, rather than a price target or an immediate executable trade.

- Frozen historical evidence: 985 holdout targets and quarterly expanding fits. Accuracy **49.44%**, compared with **50.46%** for the benchmark. Brier loss **0.250290**, benchmark **0.250235**; lower is better. No predictive advantage was established.
- Current private forward ledger: **30 issued calls, 28 resolved, two open**, latest issuance 11 October at 00:20 UTC. Outcomes remain immutable and belong to their model version. These counts are not an accuracy or profit claim.
- Macro, liquidity, volatility, Africa and geopolitical prediction models are not validated products. Descriptive observations and rules-based proxies must not be relabelled trained predictions.
- The public ten-year close chart and the private OHLCV training snapshot have different purposes and start dates. Added chart history does not change the frozen v0.1 artifact.

Next research milestone: register a distinct v0.2 candidate and freeze its data cutoff, target, features, fitting protocol and evaluation rules before examining its held-out result. Compare it with v0.1 and simple benchmarks on identical frozen windows. Preserve v0.1’s forward ledger; do not overwrite a failed experiment. Test lagged market/event features only when their release timestamps demonstrate they were available at prediction time.

Required reporting: target/horizon, source coverage and missingness, model version/checksum, walk-forward sample size, leakage checks, Brier/log loss and calibration, directional accuracy versus benchmark, uncertainty around differences, performance across regimes, abstention rate, and a separately specified cost/slippage/position-size/drawdown simulation. Accuracy alone is insufficient, and a historical fit is not prospective validation. Public release requires the documented validation and editorial gates; there is no guaranteed completion date or return.

## Africa development after the current release

1. Expand country-specific official news and issuer disclosures, with publication/retrieval dates and an explicit missing-coverage state. Prioritise Cameroon and Botswana alongside the existing exchanges. Keep World Bank annual facts separate from current news and quotes.
2. Build exchange-specific market adapters only after verifying access and redistribution rights: tickers, prices, delays, currency, volume, spreads, dividends, issuer accounts and announcements. Show incomplete fields instead of fabricated records.
3. Add issuer and IPO research pages with prospectus versions, valuation inputs, debt, proceeds, controlling interests, eligibility and exit-liquidity checks. The Nigeria page already points to the actual SEC Dangote notice and issuer site; an approval to open an offer does not prove today’s availability.
4. Add country-specific crypto/platform/regulatory and custody explainers from current official sources. Separate a crypto asset, a listed share and a business investment. Local rules require continuing verification.
5. Add lighter mobile layouts, low-data reading, accessible tables and later French-language coverage. Test on actual phones and constrained connections; browser emulation is supporting evidence, not proof of rural connectivity.

## A paid product needs repeatable value first

Keep public news/explainers, useful chart ranges and the basic calculators free. Candidate paid value is saved scenario portfolios and exports, event watchlists and alerts, historical event replay, detailed Africa issuer/IPO dossiers, reviewed research editions, and team review records. A forecast is a paid feature only after it meets its separate validation requirements.

Before billing, demonstrate returning users who save and revisit a scenario or watchlist, completed on-site reading, repeat use of Africa tools, and demand for a named research workflow. Measure source freshness and gaps, tool completion, invalid-input recovery, mobile load time, newsletter confirmation/delivery, retention and paid-feature interest. Collect only justified data; define each metric and obtain any required consent before adding tracking.

Sandbox milestone: test-only checkout, signed webhook verification, duplicate-event idempotency, entitlement creation/revocation, renewal failure and cancellation, owner-only RLS and a disabled-by-default live-payment switch. Use test keys through the provider’s authorised secure connection. No real charge, price promise or subscription is enabled in these increments.

## Hosting and security decisions

Verified official documentation on 11 October:

- [Supabase pricing](https://supabase.com/pricing): Free includes 500 MB database space; Pro starts at $25/month, with 8 GB and daily backups. Additional resources can cost more. Continue independent development within current capacity; choose Pro when backups, production reliability, security eligibility or measured usage justify it.
- [Supabase password security](https://supabase.com/docs/guides/auth/password-security): leaked-password protection is available on Pro and higher. It cannot be closed on the currently connected Free organisation without an owner-approved plan upgrade. Enable it after that approval; do not alter credentials or claim it is already enabled.
- [Vercel Hobby terms](https://vercel.com/docs/plans/hobby): Hobby is for personal, non-commercial use. [Pro pricing](https://vercel.com/pricing) starts at $20 per deploying seat per month plus usage. Resolve commercial hosting eligibility before operating paid subscriptions; do not purchase a plan in this workflow.

## Exact remaining owner-dependent actions

Use an existing authorised KAPORAL editor account to sign in to `/studio`, open the exact reviewed newsletter edition, record review notes/approval and verify the resulting authenticated transition. Public publication can be tested separately from mail delivery; no audience broadcast should be used as an acceptance test. The current browser has no authenticated editor session, and service-role SQL is not a substitute.

For paid sandbox work, connect the chosen provider in test mode using its secure credentials flow. For leaked-password protection, approve and perform the required Supabase plan change. Neither action blocks public history, calculator, journal or country-page improvements.

Next deliverables now that the journal is live: authenticated edition acceptance if the session is available; otherwise continue independent country news/issuer coverage and a frozen v0.2 research protocol. Paid sandbox integration remains test-only and needs the chosen provider's secure test connection. Report the specific merged commit and production evidence for every increment.
