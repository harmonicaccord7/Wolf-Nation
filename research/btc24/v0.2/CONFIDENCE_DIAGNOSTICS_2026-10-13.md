# What the Bitcoin model's errors and confidence actually show

This is a diagnostic replay of the already archived v0.2 experiment, not a new model, new holdout, trading rule or promotion. The owner requested deeper accuracy research and a 99.9% aspiration. Neither current model establishes predictive advantage, and no such accuracy is promised.

## Complete counts

The exact same 985 target days, January 1, 2024 through the September 12, 2026 end boundary, are scored at the unchanged 0.5 classification boundary. The targets and labels were already inspected in the earlier research. Each forecast uses only its existing eight lagged OHLCV features, with the frozen 24-hour input gap and original purged training protocol.

| Measure | v0.2 candidate | v0.1 original | Common benchmark |
| --- | ---: | ---: | ---: |
| Correct / all forecasts | 477 / 985 | 487 / 985 | 497 / 985 |
| Wrong forecasts | 508 | 498 | 488 |
| Directional accuracy | 48.43% | 49.44% | 50.46% |
| Up predictions: correct / issued | 210 / 431 | 477 / 955 | 497 / 985 |
| Down predictions: correct / issued | 267 / 554 | 10 / 30 | 0 / 0 (unavailable) |
| Lowest / highest up probability | 41.94% / 62.49% | 49.26% / 55.75% | 51.54% / 52.28% |

The candidate switches direction more often than v0.1, but its complete accuracy and probability scores are worse at their point estimates. The benchmark predicts up on every evaluation day; its probability remains the original training-set frequency, not a retrospective test-set frequency. The label mix is almost balanced: 497 up days and 488 down days. Do not replace it with an easier label or a filtered denominator to claim improvement.

## Confidence is not achieved accuracy

Here confidence means the probability assigned to the chosen direction, `max(p, 1-p)`. These fixed descriptive bands are separate from the archived 0.55 long/cash simulation. They introduce no new trading rule or fitted threshold.

| Chosen-direction confidence | v0.2 count | v0.2 correct | v0.2 accuracy | v0.1 count | v0.1 correct |
| --- | ---: | ---: | ---: | ---: | ---: |
| 50% to below 55% | 946 | 461 | 48.73% | 980 | 482 |
| 55% to below 60% | 38 | 15 | 39.47% | 5 | 5 |
| 60% to below 70% | 1 | 1 | 100% on one case | 0 | 0 |
| 70% to below 90% | 0 | 0 | Unavailable | 0 | 0 |
| 90% through 100% | 0 | 0 | Unavailable | 0 | 0 |

Every day is accounted for. About 96.04% of candidate forecasts assign under 55% confidence to their chosen direction. Its 55–60% band performs worse in this inspected sample, not better. The original model's five stronger forecasts happened to be correct, but they cover only 0.51% of the days. Claiming 100% accuracy from those five while excluding 980 weaker cases would hide the useful denominator. Empty bands are unavailable, never 0% or 100% accuracy.

These facts support weak predictive evidence for the tested setup. They do not establish whether the cause is inadequate inputs, inappropriate model structure, excessive regularization, market regime changes or ordinary sampling noise. The earlier paired probability-score intervals cross zero. No statistically established inferiority, improved strategy or causal explanation is asserted.

## What would 99.9% evidence require?

99.9% is an aspiration, not an achievable delivery promise. Model confidence, historical classification accuracy, uptime and guaranteed trading profit are different quantities.

A mathematical illustration makes the sample issue concrete. For **independent, identically distributed Bernoulli trials** with no errors, a one-sided 95% exact lower success-rate bound is `0.05^(1/n)`. That lower bound reaches 99.9% only at **2,995 correct forecasts with zero errors**. At 2,994 it is still below 99.9%. Even 985 perfect trials give a lower bound of about 99.696%; 90 perfect trials give about 96.726%. These numbers are not a time estimate or a KAPORAL validation rule. Independence and a stable success rate are not established for market forecasts, so the illustration must not be presented as their valid confidence interval. Multiple research attempts and changing regimes add uncertainty.

The separate 90-outcome forward minimum is an initial research-review gate. It cannot prove 99.9% accuracy and does not automatically validate a model. Preserve every failure and abstention, all cost cases and version-specific immutable forward evidence.

## Next research milestone

1. Archive this weak result and its complete denominators. No v0.2 registration, scheduler change or public prediction is warranted.
2. Freeze one new protocol before any further performance evaluation. Test one stated hypothesis about a different model structure; keep the same targets and source cohort for a transparent exploratory comparison. Record every candidate, including failures. Do not retune the existing test until it appears successful.
3. Before adding macro announcements, ETF flows or cross-asset inputs, establish historical availability times, revisions, licensing and gaps. Today's revised macro value or an after-release article must not leak into an earlier forecast. The existing eight OHLCV inputs do not represent those richer drivers.
4. Use chronological/purged training and validation, train-only transformations, calibrated probabilities, identical-target benchmark comparisons, complete confidence coverage and cost/drawdown evidence. Use development folds for choices; label this already-inspected cohort as retrospective research.
5. Any selected new artifact needs a separate immutable **prospective** ledger, a version-specific benchmark and later editorial review before a public conclusion. A higher in-sample score or a tiny selected perfect subset is insufficient.

This report supplies an honest diagnostic milestone; it does not claim that a new candidate has been trained or that new macro data were acquired. Useful application increments continue independently.

## Reproduce and verify

The aggregate JSON companion is `confidence-audit-2026-10-13.json`. Run `node --experimental-strip-types scripts/research/btc24-confidence-audit.mjs --self-test` for band boundaries, total denominators, missing bands, invalid input and the exact sample-size illustration. This is also included in `qa:btc24`.

For the actual replay, pass the authorized pinned **private source record outside every Git worktree** as the sole argument to that script. It makes no network or database calls. It calls the unchanged frozen runner, verifies source/protocol/final-artifact hashes, then requires all three models' original accuracy, precision, Brier, log-loss and base-rate aggregates to reproduce within `1e-12`. Output contains only aggregate diagnostics, never candles, target-level probabilities or fitted coefficients. Temporary raw copies remain private and are removed after the run.

An actual independent Python/SciPy beta-quantile calculation reproduced the sample-size boundary, and Python separately checked every confidence-band denominator and correct-count sum.

The exact protocol and source hashes are unchanged from the original v0.2 report. That report's independent Python/scikit-learn numerical audit remains the separate reproduction of the fitting code; this diagnostic replay does not replace it.

Primary methodological references, checked October 13:

- Bailey, Borwein, López de Prado and Zhu, *The Probability of Backtest Overfitting*: <https://www.davidhbailey.com/dhbpapers/backtest-prob.pdf>. Repeated selection on the same historical sample can produce misleading successes. No PBO estimate has been computed here.
- NIST/SEMATECH, exact binomial intervals: <https://www.itl.nist.gov/div898/handbook/prc/section2/prc241.htm>. The zero-error example above is our explicit one-sided mathematical calculation under the stated assumptions.
- scikit-learn 1.8.0, time-series cross-validation: <https://scikit-learn.org/1.8/modules/cross_validation.html#cross-validation-of-time-series-data>. Random independent-sample splits do not preserve temporal evaluation.
