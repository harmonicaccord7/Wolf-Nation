import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import ts from 'typescript'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as chart from '../lib/data/chart.ts'
import * as formatting from '../lib/format-intelligence.ts'
import { instrumentLabel, sourceFrequency } from '../lib/data/freshness.ts'

// Synthetic unit evidence only. No real rows, credentials or network requests.
const require = createRequire(import.meta.url)
class FrozenDate extends Date {
  constructor(...args) { super(...(args.length ? args : ['2026-09-25T06:00:00Z'])) }
  static now() { return Date.parse('2026-09-25T06:00:00Z') }
}
function unitModule(path, imports = {}) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8')
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const module = { exports: {} }
  vm.runInNewContext(compiled, { exports: module.exports, module, Date: FrozenDate, console, require: name => imports[name] ?? require(name) }, { filename: path })
  return module.exports
}
const rows = [2023, 2024, 2025, 2027].map((year, i) => ({ value: i, observed_at: `${year}-01-01T00:00:00Z`, provider: 'Synthetic annual provider', metadata: { year: String(year) } }))
function fixture({ frequency = 'annual', points = rows, available = true, fail = false } = {}) {
  const queries = []
  const db = { from(table) {
    const q = { table, filters: [], from: 0, to: 999 }
    const chain = {
      select(fields) { q.fields = fields; return chain },
      eq(key, value) { q.filters.push({ op: 'eq', key, value }); return chain },
      lte(key, value) { q.filters.push({ op: 'lte', key, value }); return chain },
      gte(key, value) { q.filters.push({ op: 'gte', key, value }); return chain },
      order(key, options) { q.order = { key, ...options }; return chain },
      range(from, to) { q.from = from; q.to = to; return chain },
      async maybeSingle() {
        queries.push(q)
        assert.ok(q.filters.some(f => f.key === 'is_public' && f.value === true))
        return { data: available ? { id: 'unit-series', code: 'UNIT_ANNUAL', label: 'Synthetic annual series', frequency, unit: '%', source_url: 'https://example.com/annual' } : null, error: null }
      },
      then(resolve, reject) {
        queries.push(q)
        const filtered = points.filter(p => q.filters.every(f => f.op === 'eq' || (f.op === 'lte' ? p[f.key] <= f.value : p[f.key] >= f.value)))
          .sort((a,b) => b.observed_at.localeCompare(a.observed_at)).slice(q.from, q.to + 1)
        return Promise.resolve({ data: fail ? null : filtered, error: fail ? { message: 'Synthetic failure' } : null }).then(resolve, reject)
      },
    }
    return chain
  } }
  return { queries, load: unitModule('../lib/data/chart-series.ts', {
    react: { cache: fn => fn }, '../supabase/server': { createClient: async () => db },
    './chart': chart, './freshness': { instrumentLabel, sourceFrequency },
  }).getChartSeries }
}
assert.equal(chart.defaultChartRange('annual'), 'MAX')
for (const frequency of ['market', 'daily', 'monthly', 'quarterly', null, undefined]) assert.equal(chart.defaultChartRange(frequency), '1Y')
const annual = fixture()
const series = await annual.load('UNIT_ANNUAL')
assert.equal(series.range, 'MAX')
assert.equal(series.history.length, 3, 'All stored past annual observations, excluding the future row')
assert.equal(series.history[0].value, 0, 'A genuine zero is retained')
assert.equal(series.history.at(-1).metadata.year, '2025')
assert.equal(series.truncated, false)
const pointQuery = annual.queries.find(q => q.table === 'data_points')
assert.equal(pointQuery.filters.some(f => f.op === 'gte'), false, 'The annual default must not hide old history')
assert.ok(pointQuery.filters.some(f => f.op === 'lte' && f.value === series.asOf))
assert.equal(pointQuery.to, 999, 'Existing bounded pagination remains in use')
const short = await fixture().load('UNIT_ANNUAL', '1Y')
assert.equal(short.range, '1Y')
assert.equal(short.history.length, 0, 'An explicitly requested empty short window stays empty')
const daily = await fixture({ frequency: 'daily' }).load('UNIT_ANNUAL')
assert.equal(daily.range, '1Y')
assert.equal((await fixture({ frequency: 'daily' }).load('UNIT_ANNUAL', 'MAX')).history.length, 3)
const missing = await fixture({ points: [] }).load('UNIT_ANNUAL')
assert.equal(missing.history.length, 0)
assert.equal(missing.range, 'MAX')
const privateSeries = fixture({ available: false })
assert.equal(await privateSeries.load('PRIVATE'), null)
assert.equal(privateSeries.queries.length, 1, 'Unknown/private definitions must not trigger a point query')
await assert.rejects(fixture({ fail: true }).load('UNIT_ANNUAL'), /could not be loaded/)

assert.equal(formatting.formatObservationDate('2025-01-01T00:00:00Z', 'annual'), 'Reporting year 2025')
assert.equal(formatting.formatObservationDate('2024-12-31T23:00:00-02:00', 'annual'), 'Reporting year 2025', 'UTC reference year is stable')
assert.equal(formatting.formatObservationDate(null, 'annual'), 'No verified observation yet')
assert.equal(formatting.formatObservationDate('invalid', 'annual'), 'invalid')
assert.match(formatting.formatObservationDate('2025-01-01T00:00:00Z', 'daily'), /01 Jan 2025/)
assert.match(formatting.formatObservationDate('2025-01-01T00:00:00Z', 'market'), /00:00 UTC/)

const { HistoryChart } = unitModule('../components/intelligence/HistoryChart.tsx', { '../../lib/data/chart': chart })
const render = (data, extra = {}) => renderToStaticMarkup(React.createElement(HistoryChart, { points: data.history, label: 'Synthetic annual series', unit: '%', asOf: data.asOf, frequency: data.frequency, ...extra }))
const html = render(series)
assert.match(html, /aria-pressed="true"[^>]*>MAX<\/button>/)
assert.match(html, /3 observations/)
assert.match(html, /Reporting year 2025/)
assert.match(html, /not a release date or a live quote/)
assert.match(html, /<th>Reporting year<\/th>/)
assert.doesNotMatch(html, /1 Jan|00:00 UTC/)
assert.match(html, /role="img"/)
assert.match(render(series, { initialRange: '1Y' }), /No observations in the selected period/)
assert.doesNotMatch(render(missing), /role="img"/)
assert.match(render({ ...series, frequency: 'daily' }, { initialRange: 'MAX' }), /Date \(UTC\)/)
assert.match(render({ ...series, frequency: 'daily' }, { initialRange: 'MAX' }), /00:00 UTC/)

const chartProps = []
const page = unitModule('../app/data/[code]/page.tsx', {
  'next/link': { default: ({ children, ...props }) => React.createElement('a', props, children) },
  'next/navigation': { notFound: () => { throw Error('not found') } },
  '../../../components/Header': { Header: () => null }, '../../../components/Footer': { Footer: () => null },
  '../../../components/SaveToWatchlist': { SaveToWatchlist: () => null },
  '../../../components/intelligence/HistoryChart': { HistoryChart: props => { chartProps.push(props); return React.createElement(HistoryChart, props) } },
  '../../../lib/data/chart-series': { getChartSeries: async () => series }, '../../../lib/format-intelligence': formatting,
})
const pageHtml = renderToStaticMarkup(await page.default({ params: Promise.resolve({ code: 'unit_annual' }) }))
assert.equal(chartProps[0].initialRange, 'MAX', 'Server query and client range must agree')
assert.equal(chartProps[0].frequency, 'annual')
assert.match(pageHtml, /Reporting year 2025/)
assert.match(pageHtml, /href="https:\/\/example.com\/annual"/)
console.log('Annual-chart QA passed: frequency-aware defaults, explicit ranges, public-definition boundary, bounded queries, future exclusion, genuine zero/missing data, reporting years and synchronized server/client chart rendering.')
