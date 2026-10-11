'use client'
import { useState } from 'react'
import Link from 'next/link'
import { decisionInputError, simulateDecision, type DecisionInputs } from '../../lib/tools/decision-simulation'
import styles from './DecisionLab.module.css'

export type DecisionQuote = { symbol: string; label: string; price: number; provider: string; asOf: string; href: string }
const colors = ['#235a7c', '#6c7070', '#877022', '#137252', '#a3433d']
const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value)
const date = (value: string) => new Date(value).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }) + ' UTC'
const names: Record<keyof DecisionInputs, string> = { price: 'Reference price (USD)', budget: 'Cash budget (USD)', feePercent: 'Fee per transaction (%)', movePercent: 'Final price change (%)', stagedPrice: 'Second-stage price (USD)', strike: 'Option strike (USD)', premium: 'Option premium per unit (USD)', contractUnits: 'Units per option contract' }

export function DecisionLab({ initialQuotes }: { initialQuotes: DecisionQuote[] }) {
  const [quotes, setQuotes] = useState(initialQuotes)
  const first = initialQuotes.find(q => q.symbol === 'BTC') ?? initialQuotes[0]
  const [asset, setAsset] = useState(first?.symbol ?? 'CUSTOM')
  const [fields, setFields] = useState<Record<keyof DecisionInputs, string>>({ price: first ? String(first.price) : '', budget: '1000', feePercent: '0.1', movePercent: '20', stagedPrice: first ? String(Number((first.price * .95).toFixed(4))) : '', strike: first ? String(first.price) : '', premium: first ? String(Number((first.price * .05).toFixed(4))) : '', contractUnits: '1' })
  const [refreshing, setRefreshing] = useState(false), [message, setMessage] = useState('')
  const quote = quotes.find(q => q.symbol === asset)
  const input = Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, value.trim() === '' ? NaN : Number(value)])) as DecisionInputs
  const error = decisionInputError(input), outcomes = error ? [] : simulateDecision(input)
  function choose(symbol: string, available = quotes) {
    setAsset(symbol); setMessage('')
    const next = available.find(q => q.symbol === symbol)
    if (next) setFields(current => ({ ...current, price: String(next.price), stagedPrice: String(Number((next.price * .95).toFixed(4))), strike: String(next.price), premium: String(Number((next.price * .05).toFixed(4))) }))
  }
  async function refresh() {
    setRefreshing(true); setMessage('')
    try {
      const response = await fetch('/api/market/overview', { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok || !Array.isArray(data.assets)) throw new Error('Unavailable')
      const next: DecisionQuote[] = data.assets.filter((a: any) => ['BTC', 'ETH', 'SOL', 'GOLD'].includes(a.symbol) && typeof a.value === 'number' && Number.isFinite(a.value) && a.value > 0 && a.asOf && a.provider).map((a: any) => ({ symbol: a.symbol, label: a.name, price: a.value, provider: a.provider, asOf: a.asOf, href: a.href }))
      setQuotes(next)
      const selected = next.find(q => q.symbol === asset)
      if (selected) { setFields(current => ({ ...current, price: String(selected.price) })); setMessage('Latest stored reference loaded. Your other assumptions are unchanged.') }
      else setMessage('No stored quote is available for this asset. Your entered price is unchanged.')
    } catch { setMessage('The quote could not be refreshed. Your assumptions are unchanged; you can enter a price manually.') }
    finally { setRefreshing(false) }
  }
  function download() {
    if (error) return
    const rows = [['KAPORAL Decision Lab', 'Arithmetic scenario; not a forecast'], ['Asset', asset], ['Reference source', quote?.provider ?? 'Manual entry'], ['Source observation UTC', quote?.asOf ?? 'Not supplied'], ['Used reference price USD', String(input.price)], ['Source quoted price USD', quote ? String(quote.price) : 'Not supplied'], ['Generated UTC', new Date().toISOString()], ...Object.entries(input).map(([key, value]) => [names[key as keyof DecisionInputs], String(value)]), [], ['Strategy', 'Committed USD', 'Cash left USD', 'Final value USD', 'Profit or loss USD', 'Fees USD', 'Maximum loss USD', 'Units', 'Contracts', 'Break-even USD', 'Available'], ...outcomes.map(row => [row.label, String(row.committed), String(row.cash), String(row.finalValue), String(row.profit), String(row.fees), String(row.maximumLoss), String(row.units), row.contracts === null ? '' : String(row.contracts), row.breakEven === null ? '' : String(row.breakEven), String(row.available)]), [], ['Assumptions', 'At expiry; both stages execute; hypothetical USD settlement; percentage fees; cash interest, tax, spread, inflation and FX excluded.']]
    const csv = rows.map(row => row.map(value => {
      const safe = /^[=+@\t\r]/.test(value) || (/^-/.test(value) && !Number.isFinite(Number(value))) ? "'" + value : value
      return `"${safe.replaceAll('"', '""')}"`
    }).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })), link = document.createElement('a')
    link.href = url; link.download = 'kaporal-decision-scenario.csv'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const curves = error ? [] : Array.from({ length: 41 }, (_, i) => ({ move: -50 + i * 2.5, rows: simulateDecision({ ...input, movePercent: -50 + i * 2.5 }) }))
  const values = curves.flatMap(c => c.rows.filter(r => r.available).map(r => r.profit)), low = Math.min(-input.budget * .1 || -1, ...values), high = Math.max(input.budget * .1 || 1, ...values)
  const y = (value: number) => 22 + (high - value) / (high - low) * 208
  return <div className={styles.lab}>
    <div className={styles.assumptions}><h2>1. Set your assumptions</h2><label>Asset<select aria-label="Asset" value={asset} onChange={event => choose(event.target.value)}>{quotes.map(q => <option value={q.symbol} key={q.symbol}>{q.label}</option>)}{asset !== 'CUSTOM' && !quote && <option value={asset}>{asset} — no stored reference</option>}<option value="CUSTOM">Custom asset — enter a USD price</option></select></label>
      {quote ? <p className={styles.source}><Link href={quote.href}>{quote.label} history →</Link><br/>{quote.provider} · {date(quote.asOf)}<br/>Stored reference: {money(quote.price)}. {Number(fields.price) !== quote.price ? 'You are using an edited price.' : 'This is a stored observation, not an executable live quote.'}</p> : <p className={styles.source}>Manual reference. Use a price and contract terms that you can verify.</p>}
      <button className={styles.refresh} onClick={refresh} disabled={refreshing || asset === 'CUSTOM'}>{refreshing ? 'Checking stored quotes…' : 'Load latest stored reference'}</button>{message && <p role="status">{message}</p>}
      <div className={styles.inputs}>{(Object.keys(names) as (keyof DecisionInputs)[]).map(key => <label key={key}>{names[key]}<input type="number" inputMode="decimal" step={key === 'contractUnits' ? '1' : 'any'} value={fields[key]} onChange={event => setFields(current => ({ ...current, [key]: event.target.value }))}/></label>)}</div>
      <p className={styles.note}>Starting assumptions: half the budget is bought now and half at the second-stage price; option premium starts at 5% of the reference price. Edit both. These are examples, not market quotes.</p>
    </div>
    <div className={styles.results}><h2>2. Compare the outcome</h2><div className={styles.presets} aria-label="Example price changes">{[-20, 0, 20].map(move => <button key={move} aria-pressed={input.movePercent === move} onClick={() => setFields(current => ({ ...current, movePercent: String(move) }))}>{move > 0 ? '+' : ''}{move}%</button>)}</div>
      {error ? <p role="alert" className={styles.error}>{error}</p> : <>
        <p className={styles.terminal}>If the final price is <strong>{money(input.price * (1 + input.movePercent / 100))}</strong> ({input.movePercent > 0 ? '+' : ''}{input.movePercent}%), here is the result after the specified fees.</p>
        <div className={styles.tableWrap}><table aria-label="Decision comparison"><thead><tr><th>Alternative</th><th>Final value</th><th>Profit / loss</th><th>Cash left at entry</th><th>Maximum loss</th></tr></thead><tbody>{outcomes.map((row, i) => <tr key={row.strategy}><th><span style={{ color: colors[i] }}>●</span> {row.label}{row.contracts !== null && <small>{row.available ? `${row.contracts} whole contract${row.contracts === 1 ? '' : 's'}` : 'Budget cannot buy one contract'}</small>}</th><td>{money(row.finalValue)}</td><td className={row.profit < 0 ? styles.loss : styles.gain}>{row.profit > 0 ? '+' : ''}{money(row.profit)}</td><td>{money(row.cash)}</td><td>{money(row.maximumLoss)}</td></tr>)}</tbody></table></div>
        <h3>Profit or loss at different final prices</h3><svg className={styles.chart} viewBox="0 0 660 280" role="img" aria-label="Scenario payoff chart for price changes from minus 50 to plus 50 percent"><title>Assumption-based profit or loss, not a price forecast</title><line x1="54" x2="635" y1={y(0)} y2={y(0)} stroke="#818c8b" strokeDasharray="4 4"/><text x="5" y={y(high) + 4}>{Math.round(high).toLocaleString('en-US')}</text><text x="5" y={y(0) + 4}>0</text><text x="5" y={y(low) + 4}>{Math.round(low).toLocaleString('en-US')}</text>{outcomes.map((row, i) => row.available && <polyline key={row.strategy} points={curves.map((curve, index) => `${54 + index / 40 * 581},${y(curve.rows[i].profit)}`).join(' ')} stroke={colors[i]} fill="none" strokeWidth="2.5"/>)}<text x="54" y="263">−50%</text><text x="344" y="263" textAnchor="middle">0%</text><text x="635" y="263" textAnchor="end">+50%</text></svg><p className={styles.note}>Horizontal: your assumed price change. Vertical: profit or loss in USD. No likelihood is assigned to any point. The table uses your selected change, which can extend beyond the chart.</p>
        <div className={styles.thresholds}>{outcomes.filter(row => row.available && row.breakEven !== null).map(row => <article key={row.strategy}><b>{row.label}</b><span>Break-even {row.breakEven! < 0 ? 'is below zero: no reachable break-even under these terms' : money(row.breakEven!)}</span><small>Fees in this scenario: {money(row.fees)}</small></article>)}</div>
        <p><b>Compare waiting with buying:</b> {outcomes[0].profit > 0 ? `Waiting leaves ${money(outcomes[0].profit)} less than buying now in this assumed scenario.` : outcomes[0].profit < 0 ? `Waiting avoids the ${money(-outcomes[0].profit)} loss from buying now in this assumed scenario.` : 'Both end with the same cash value in this assumed scenario.'} Change the assumptions before drawing a conclusion.</p>
        <button className="goldButton" onClick={download}>Download this scenario</button><p className={styles.note}>The tool is free. Inputs stay in this browser tab; the download records your assumptions and sources.</p>
      </>}
    </div>
  </div>
}
