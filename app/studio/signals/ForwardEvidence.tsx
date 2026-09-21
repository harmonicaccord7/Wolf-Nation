import type { evaluateBtc24Forward } from '../../../lib/models/btc24-forward'

type Report = Awaited<ReturnType<typeof evaluateBtc24Forward>>
const pct = (v: number | null) => v == null ? '—' : `${(v * 100).toFixed(1)}%`
const num = (v: number, digits = 6) => v.toFixed(digits)

export default function ForwardEvidence({ report }: { report: Report }) {
  const metrics = report.metrics
  return <section className="studio-panel signalTablePanel" aria-labelledby="forward-evidence-heading">
    <p className="eyebrow">PROSPECTIVE EVIDENCE · PRIVATE · EXPERIMENTAL</p>
    <h2 id="forward-evidence-heading">Complete version-specific forward report</h2>
    <p>As of {report.asOf}. {report.resolved} valid resolved outcomes / {report.minimum} minimum before human research review.
      {' '}Reaching this minimum does not validate a model or enable publication.</p>
    <dl className="signalMethod">
      <div><dt>Evidence gate</dt><dd>{report.gate.replaceAll('-', ' ')}</dd></div>
      <div><dt>Coverage</dt><dd>{report.mature} mature targets · {report.pending} not yet mature · {report.missingOutcomes} missing outcomes · {report.missingForecastDays} missing daily forecasts inside the issued span · {report.invalidRows} invalid rows</dd></div>
      <div><dt>Issued span (UTC)</dt><dd>{report.firstTarget ?? 'Not started'} → {report.lastTargetEnd ?? '—'} (end exclusive)</dd></div>
      <div><dt>Evaluated span</dt><dd>{report.evaluatedStart ?? 'Not available'} → {report.evaluatedEnd ?? '—'} (end exclusive)</dd></div>
    </dl>
    <p>Coverage refers to this version’s issued span, not an assumption that a retired model still runs.
      {!!report.daysSinceLastTarget && <> The last issued target ended {report.daysSinceLastTarget} complete day(s) ago; check whether this version is paused or retired.</>}</p>
    {report.issueCount > 0 && <div role="alert"><strong>Performance withheld: evidence needs attention.</strong><ul>{report.issues.map((message, i) => <li key={i}>{message}</li>)}</ul>{report.issueCount > report.issues.length && <p>{report.issueCount - report.issues.length} additional issue(s).</p>}</div>}
    {!metrics && !report.issueCount && <p>No mature outcomes are available yet. No performance statistic is inferred from an empty ledger.</p>}
    {metrics && <>
      <p>These are descriptive results from frozen forecasts, not a claim of predictive advantage. The benchmark is the training up-frequency frozen with this exact model version; it is not refitted to the observed outcomes.</p>
      <div className="signalTableScroll"><table className="signalTable">
        <caption>Forward classification · same {metrics.model.observations} target days for model and benchmark</caption>
        <thead><tr><th scope="col">Measure</th><th scope="col">Frozen model</th><th scope="col">Frozen training-frequency benchmark</th></tr></thead>
        <tbody>
          <tr><th scope="row">Direction accuracy (threshold 50%)</th><td>{pct(metrics.model.hitRate)}</td><td>{pct(metrics.benchmark.hitRate)}</td></tr>
          <tr><th scope="row">Brier error · lower is better</th><td>{num(metrics.model.brier)}</td><td>{num(metrics.benchmark.brier)}</td></tr>
          <tr><th scope="row">Log loss · lower is better</th><td>{num(metrics.model.logLoss)}</td><td>{num(metrics.benchmark.logLoss)}</td></tr>
          <tr><th scope="row">Precision among predicted up days</th><td>{pct(metrics.model.precision)}</td><td>{pct(metrics.benchmark.precision)}</td></tr>
          <tr><th scope="row">Actual up days</th><td colSpan={2}>{pct(metrics.model.actualUpRate)}</td></tr>
        </tbody>
      </table></div>
      <p>Brier difference (model minus benchmark): {num(metrics.brierDifference)}. Negative favors the model.</p>
      {metrics.uncertainty ? <p>Exploratory 95% moving-block bootstrap interval: {num(metrics.uncertainty.lower95)} to {num(metrics.uncertainty.upper95)}; {metrics.uncertainty.blockDays}-day blocks, {metrics.uncertainty.repetitions} draws, fixed seed {metrics.uncertainty.seed}. An interval crossing zero does not establish improvement. Repeated checking and future model searches are not corrected for; human review is still required.</p>
        : <p>No confidence interval or validation claim is shown before {report.minimum} resolved daily outcomes. A small sample can look good by chance.</p>}

      <div className="signalTableScroll"><table className="signalTable">
        <caption>Calibration · predicted probability versus actual up frequency (empty bins stay empty)</caption>
        <thead><tr><th scope="col">P(up) range</th><th scope="col">Model count</th><th scope="col">Model mean P(up)</th><th scope="col">Actual up share</th><th scope="col">Benchmark count</th><th scope="col">Benchmark mean P(up)</th><th scope="col">Actual up share</th></tr></thead>
        <tbody>{metrics.model.reliability.map((bin, i) => {
          const benchmark = metrics.benchmark.reliability[i]
          return <tr key={bin.lower}><th scope="row">{pct(bin.lower)}–{pct(bin.upper)}{i === 9 ? ' inclusive' : ' (upper excluded)'}</th><td>{bin.count}</td><td>{pct(bin.predicted)}</td><td>{pct(bin.observed)}</td><td>{benchmark.count}</td><td>{pct(benchmark.predicted)}</td><td>{pct(benchmark.observed)}</td></tr>
        })}</tbody>
      </table></div>

      <h3>Illustrative cost sensitivity—not actual trades</h3>
      <p>The frozen research rule is long for the target day only when P(up) ≥ 55%, otherwise cash. It is different from the 50% direction-accuracy threshold. Daily positions pay two cost legs including assumed fees/slippage; no leverage, shorting or cash interest. Buy-and-hold pays entry/exit costs once. These are candle-based simulations, not executable fills or guaranteed returns. Daily-close drawdown excludes intraday losses.</p>
      <div className="signalTableScroll"><table className="signalTable">
        <caption>Net outcomes over the same complete forward period</caption>
        <thead><tr><th scope="col">Cost per side</th><th scope="col">Rule</th><th scope="col">Exposed days</th><th scope="col">Net cumulative return</th><th scope="col">Daily-close drawdown</th></tr></thead>
        <tbody>{metrics.costs.flatMap(cost => [
          { label: 'Frozen model ≥ 55%', value: cost.model, days: cost.model.activeDays },
          { label: 'Always long · daily round trips', value: cost.alwaysLongDaily, days: cost.alwaysLongDaily.activeDays },
          { label: 'Prior 1-day momentum', value: cost.momentum, days: cost.momentum.activeDays },
          { label: 'Buy and hold', value: cost.buyHold, days: report.resolved },
          { label: 'Cash · no interest', value: cost.cash, days: 0 },
        ].map(row => <tr key={`${cost.costBpsPerSide}-${row.label}`}><td>{cost.costBpsPerSide} bps ({num(cost.costBpsPerSide / 100, 2)}%)</td><th scope="row">{row.label}</th><td>{row.days}</td><td>{num(row.value.totalReturnPct, 2)}%</td><td>{num(row.value.maxDrawdownPct, 2)}%</td></tr>))}</tbody>
      </table></div>
      <p>Source: immutable Coinbase BTC-USD daily candles pinned in each outcome’s source snapshot. Zero exposed days or zero daily drawdown does not establish safety. No future data, other model versions or historical backtest outcomes are included here.</p>
    </>}
  </section>
}
