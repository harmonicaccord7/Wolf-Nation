# Bitcoin 24-hour experiment, version 0.1.0

Protocol written on 2026-09-12 before fetching or evaluating the long-history dataset. Private research; no automated trading, public financial publication or profit claim.

## Exact question

Forecast `P(Coinbase BTC-USD close > open)` for **tomorrow's complete UTC day**. A forecast issued on September 12 predicts September 13 00:00 through September 14 00:00 UTC. Inputs end September 12 00:00. The deliberate 24-hour gap from input cutoff to target start also applies to every training/evaluation row. This is a 24-hour target window, **not an immediate now-to-24-hours trade signal**. Price changes after the input cutoff do not enter this version.

Historical open/close are the first/last exchange trades in each daily bucket, not executable order quotes. The day closes above its open defines class 1; ties are class 0. We do not estimate a price target, profit probability, or cross-asset opportunity score.

## Source and data checks

- [Coinbase Exchange candles API](https://docs.cdp.coinbase.com/api-reference/exchange-api/rest-api/products/get-product-candles), BTC-USD, daily OHLCV, requested from January 1, 2017 through the latest complete UTC day.
- Respect 300-candle request limit using 250-day chunks. Preserve request URLs, fetched times, raw-response SHA-256, canonical full input SHA-256 and raw candles privately in the existing `model_runs` table. Git contains code and derived evidence, not redistributed raw market history.
- Reject invalid OHLC/volume, conflicting duplicates, stale latest candle and incomplete first coverage. Report gaps; exclude every feature/target window crossing a missing day. Do not impute prices.
- Historical candles are the vendor's **current vintage**, downloaded today. We do not possess historical release timestamps or revision vintages. Chronological evaluation is simulated, not contemporaneous forward evidence.

## Fixed method and evaluation

- Eight features: log returns over 1/3/7/14 days, 7/30-day realized log-return standard deviation, latest log high/low range, and 7-day mean volume relative to 30-day mean.
- Standardization learned exclusively on each training set. Logistic regression minimizes summed binary log loss plus `10/2 * sum(weights²)`; intercept is unpenalized. Deterministic Newton solver with convergence check. The penalty, feature list, splits and exposure threshold are fixed before evaluating the holdout.
- Initial training precedes the first 2023 forecast input cutoff; 2023 is a separate validation year. Final chronological test begins January 1, 2024. Expanding training refits each calendar quarter, using only labels resolved **strictly before** that quarter's first forecast input cutoff. No shuffled split; no future-trained scaler.
- Compare Brier score, log loss, accuracy, precision and calibration bins with the expanding training-set up-frequency benchmark. Brier difference uncertainty uses a fixed-seed 14-day moving-block bootstrap (1,000 repetitions). Report every quarter and the entire holdout; do not tune after seeing poor results.
- Illustrative long/cash rule: long when probability >= 0.55, otherwise cash. Each exposure closes at that day's end, charging two cost legs even on consecutive days. Report 10/25/50 basis points **per side**, jointly representing assumed fees and slippage. Costs are illustrative, not a verified account fee schedule. Compare the same timing with lagged positive-momentum and always-long daily rules, plus continuous buy-and-hold and cash. No shorting, leverage, interest, taxes, funding or capacity assumptions.
- Backtest execution uses candle open/close proxies. Daily maximum drawdown misses intraday losses. Calibration intervals are exploratory and not adjusted for later research attempts.

## Prospective ledger and acceptance

Each new forecast pins the fitted model, source snapshot hash, feature values, input cutoff, probability definition and future UTC start/end. Forecast insertion must precede the start by at least five minutes. Database triggers prevent rewriting or deleting model artifacts, forecasts, backtests and outcomes. Only a mature target with the exact matching Coinbase daily candle can resolve; missing data remain unresolved. The daily job records private forecasts and resolves mature outcomes; it never publishes or sends email. Retries reuse a unique model/window key.

Engineering acceptance: real long-history ingestion; deterministic fit; chronological/purged evaluation; independent numerical reproduction; private persisted evidence; immutable future-dated prediction and scheduled resolver; honest Studio display.

Predictive acceptance remains separate: require at least 90 non-overlapping resolved daily forward calls, compare prospective Brier/log loss with each forecast's frozen training prior and cost-adjusted performance, then human research review. Ninety calls are a minimum sample, not a guarantee of enough statistical power. A version with no demonstrated advantage remains experimental or is retired; it cannot silently become validated. Frozen v0.1.0 parameters do not change during forward evaluation. Further training creates a new model version and a separate ledger.

This experiment addresses Bitcoin only. It does not complete predictive models for macro, liquidity, volatility, Africa or geopolitics.
