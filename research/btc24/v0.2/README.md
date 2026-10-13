# Bitcoin v0.2 research protocol — 13 October 2026

This protocol is frozen in a Git commit before running the candidate's historical comparison. It is an experiment, not a claim that the model improved. The private v0.1 artifact, forecasts, resolver and public application behavior remain unchanged.

The candidate uses the same eight lagged Coinbase OHLCV features and UTC target as v0.1. It changes two fixed aspects of fitting: a 730-day resolved-label training window and a summed-loss L2 penalty of 100, rather than v0.1's expanding window and penalty of 10. This is one predeclared candidate, not a search across many lookbacks, penalties or exposure thresholds. Reuse the deterministic solver and training-only standardization.

Why test it: an expanding fit can average across old market conditions; a recent window tests that tradeoff, while a stronger penalty tests coefficient shrinkage on the smaller sample. Neither change is presumed to make prices predictable. Keep the result even if it is worse.

## Frozen evidence and timing

`protocol.json` pins the existing private September 12 Coinbase snapshot, its SHA-256, coverage, v0.1 artifact hash and 985 historical target rows. No new vendor download is needed. Raw candles, fitted coefficients and target-level probabilities stay outside Git. The runner must reject a different snapshot, malformed metadata, changed protocol, incomplete coverage or failure to reproduce the original v0.1 artifact.

All comparisons use identical January 1, 2024–September 12, 2026 target boundaries. A label can train a fold only if its end is strictly earlier than the first prediction input cutoff in that quarter. The training window retains labels with end at least cutoff minus 730 days; it does not reach backward for extra rows if source days are missing. Fit scalers using only those training rows. Later candles must not alter an earlier fitted fold or forecast.

The v0.1 historical results and labels were already inspected during earlier research. This new comparison is therefore retrospective research using present-day vendor vintages, **not a newly unseen holdout**. It cannot justify a trading, profitability or validation claim. Reusing one historical test for multiple research ideas introduces selection risk, which the reported bootstrap interval does not correct.

## Reports and independent reproduction

Report both versions and the original training-prior benchmark on the same rows: Brier loss, log loss, directional accuracy, positive precision and ten-bin calibration. Include all calendar quarters, training coverage and strict timing checks. Record paired candidate-minus-v0.1 and candidate-minus-benchmark score differences using the fixed-seed 14-day moving-block bootstrap. No interval or favourable metric automatically promotes the candidate.

Keep the existing long/cash threshold at 0.55 and 10/25/50 basis points per side. Report exposure days, abstention, return and daily-close drawdown for candidate, v0.1 and common timing/cost baselines. These are candle-proxy simulations, not actual executions. Preserve zero-exposure results rather than describing abstention as trading profit.

The numerical audit must reconstruct features and labels independently, fit each rolling fold with scikit-learn's `LogisticRegression(C=0.01)`, check the training-only scaler and coefficients, and reproduce probabilities, scores and costs. Use the already pinned research requirements and record the versions actually used. Original algorithm documentation: https://scikit-learn.org/1.8/modules/generated/sklearn.linear_model.LogisticRegression.html and Coinbase candle definitions: https://docs.cdp.coinbase.com/api-reference/exchange-api/rest-api/products/get-product-candles.

## Next gate

Do not register, schedule, issue, publish or sell v0.2 forecasts from this comparison. A later research decision must explicitly freeze a fitted artifact and separately versioned future ledger before any target begins, preserve source provenance and immutable evidence, and pass independent numerical and engineering checks. At least 90 non-overlapping resolved forward calls permit a research review; they do not guarantee sufficient power or validation. Other asset/category models remain separate work.

Metadata correction before any candidate evaluation: the snapshot payload records receipt at 16:28:52.245 UTC; the database run as-of value 16:28:49.705 UTC records collection start. The protocol now pins the payload timestamp. Source, target, fit and comparison rules were unchanged.
