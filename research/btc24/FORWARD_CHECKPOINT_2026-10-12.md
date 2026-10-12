# K-BTC-24H 0.1.0 — complete private forward checkpoint

Cutoff: **2026-10-12 07:08:24.997890 UTC**. This is a read-only audit of one immutable version, not retraining, a public forecast, an execution record or validated investment advice.

## Target, source and protocol

- Model: `K-BTC-24H 0.1.0`, fitted logistic baseline. Preserve the original artifact, data snapshots and historical evidence in `README.md`, `RESULTS_2026-09-12.md` and `evidence-2026-09-12.json`.
- Target: probability that Coinbase BTC-USD's next complete UTC-day close exceeds that day's open. Inputs end 24 hours before the target day starts. The target is not the return from the time a reader opens the site and does not predict options prices or gold.
- Eight lagged OHLCV features: 1/3/7/14-day returns, 7/30-day volatility, daily high/low range and relative volume. No current-event release value is retrospectively added to this version.
- Source: [Coinbase Exchange BTC-USD candles](https://api.exchange.coinbase.com/products/BTC-USD/candles). Forecast and outcome records pin snapshot identifiers and SHA-256 hashes. The public ten-year close chart is a separate projection of market history and did not change this fit.
- Reused evaluator: `lib/models/btc24-forward.ts::evaluateBtc24Forward`, with the complete version-specific ledger, exact cutoff and ledger completeness flag. Model checksum, all 31 frozen probabilities, target timing, non-overlap, source provenance and recorded outcomes passed. No threshold, feature or artifact was changed after seeing these outcomes.

## Complete ledger and evaluated window

| Evidence | Result |
|---|---:|
| Issued forecasts | 31 |
| Resolved and included targets | 29 |
| Still-open targets | 2 |
| Missing mature outcomes | 0 |
| Missing forecast days inside this version's span | 0 |
| Invalid rows / audit issues | 0 / 0 |
| Evaluated target interval | 13 September 2026 00:00–12 October 2026 00:00 UTC |
| Last issued target ends | 14 October 2026 00:00 UTC |
| Research gate | `insufficient-evidence` |

The two open calls contribute no outcomes or performance. The documented minimum of 90 resolved non-overlapping targets permits further research review; reaching that number alone cannot establish skill, calibration, profitability or release eligibility. No uncertainty interval is reported for this sub-minimum sample.

## Probabilities and comparison with the frozen benchmark

| Metric on the same 29 targets | Model | Frozen benchmark |
|---|---:|---:|
| Directional accuracy | 55.17% (16/29) | 55.17% (16/29) |
| Positive-class precision | 55.17% | 55.17% |
| Brier loss, lower is better | 0.250472 | 0.248594 |
| Log loss, lower is better | 0.694095 | 0.690333 |
| Mean probability of an up day | 51.21% | 51.61% |
| Observed share of up days | 55.17% | 55.17% |

Paired Brier difference (model minus benchmark) is **+0.001878**; the descriptive score favours the benchmark. All resolved model probabilities fall in the 0.50–0.60 calibration bin. Equal accuracy here is not a directional advantage over predicting the majority class. Twenty-nine observations do not establish reliable calibration, uncertainty across regimes or an investment edge.

Keep this prospective result separate from the frozen **985-target historical** result: model accuracy 49.44% versus benchmark 50.46%; model Brier 0.250290 versus benchmark 0.250235. Neither result demonstrates predictive advantage. Do not combine the samples into a more flattering statistic or replace old results with a later version.

## Fixed hypothetical cost comparisons

The pre-existing research rule enters an unlevered long position only when the model probability is at least **0.55**; otherwise it holds cash. It activated on **zero of 29** resolved days (100% abstention), so return and drawdown are zero. That is no exposure, not proof that the model made profitable decisions. All stored calls retain `abstain-unvalidated` and no trade was placed.

The table shows total simulated return / maximum daily-close drawdown, in percent, over the same evaluated interval. Costs are applied on each entry and exit. Momentum uses the already defined positive lagged one-day-return rule; it was not chosen or tuned from this interval.

| Cost per side | Model rule, 0 active days | Always long daily, 29 active days | Momentum, 16 active days | Buy and hold | Cash |
|---|---:|---:|---:|---:|---:|
| 10 basis points (0.10%) | 0.00 / 0.00 | +2.20 / 8.81 | +10.73 / 3.57 | +8.09 / 5.66 | 0.00 / 0.00 |
| 25 basis points (0.25%) | 0.00 / 0.00 | -6.33 / 13.35 | +5.53 / 5.86 | +7.76 / 5.66 | 0.00 / 0.00 |
| 50 basis points (0.50%) | 0.00 / 0.00 | -19.02 / 20.92 | -2.61 / 9.64 | +7.22 / 5.66 | 0.00 / 0.00 |

These are historical calculations using source candle opens/closes and fixed proportional costs, not executable fills or realised customer returns. They exclude intraday drawdown, market impact, spread variation, funding, taxes, cash interest and inflation. The daily-entry comparisons and continuous buy-and-hold strategy have different turnover. Do not select the best displayed strategy and claim prospective superiority from this short interval.

## Next research decision

Keep v0.1.0 private and experimental, continue its immutable ledger, and report all outcomes by version. A v0.2 candidate needs a separately registered data cutoff, target, features, fit and evaluation protocol before inspecting its held-out result. Any macro/event inputs must have proven release timestamps available at prediction time. Compare versions and simple benchmarks on identical frozen windows, including proper probability scores, calibration, uncertainty, coverage, abstention, cost sensitivity and drawdown. Do not hold unrelated working application improvements for this research.
