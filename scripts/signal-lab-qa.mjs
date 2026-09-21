import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import ts from 'typescript'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readCompleteLedger } from '../lib/data/complete-ledger.ts'
import { evaluateBtc24Forward } from '../lib/models/btc24-forward.ts'
import { model, prediction, id, report } from './btc24-forward-qa.mjs'

// Unit-only injected dependencies: no production session, JWT, network,
// profile mutation, or test-only authentication route is used.
const require = createRequire(import.meta.url)
function unitModule(path, imports) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8')
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const module = { exports: {} }
  vm.runInNewContext(compiled, { exports: module.exports, module, Date, console, require: name => imports[name] ?? require(name) }, { filename: path })
  return module.exports
}
const version2 = { ...structuredClone(model), id: id(90003), version: 'synthetic-v2', created_at: '2019-12-31T00:03:00Z' }
const firstVersionRows = Array.from({ length: 1107 }, (_, i) => prediction(i))
const secondVersionRows = Array.from({ length: 3 }, (_, i) => {
  const p = prediction(i); p.model_version_id = version2.id; p.id = id(20000 + i)
  p.outcomes[0].id = id(30000 + i); p.outcomes[0].prediction_id = p.id
  return p
})
const tables = { signal_model_versions: [model, version2], signal_predictions: [...firstVersionRows, ...secondVersionRows].map(p => ({ ...p, outcomes: p.outcomes[0] })), backtest_runs: [] }
function fakeClient({ role = 'researcher', signedIn = true, failTable = '', failPage = Infinity } = {}) {
  const queries = []
  const client = { queries, auth: { getClaims: async () => ({ data: { claims: { sub: signedIn ? 'unit-test-user' : null } } }) }, from(table) {
    const filters = [], orders = []
    const q = { table, filters, orders, from: 0, to: Infinity, exact: false,
      select(fields, options) { q.fields = fields; q.exact = options?.count === 'exact'; return q },
      eq(key, value) { filters.push({ op: 'eq', key, value }); return q },
      lte(key, value) { filters.push({ op: 'lte', key, value }); return q },
      order(key, options) { orders.push({ key, ascending: options.ascending }); return q },
      range(from, to) { q.from = from; q.to = to; return q },
      limit(n) { q.to = n - 1; return q },
      maybeSingle: async () => ({ data: { id: 'unit-test-user', role, display_name: 'Synthetic researcher' }, error: null }),
      then(resolve, reject) {
        queries.push(q)
        if (table === failTable && q.from >= failPage) return Promise.resolve({ data: null, count: null, error: { message: 'synthetic failure' } }).then(resolve, reject)
        let result = [...(tables[table] ?? [])].filter(row => filters.every(f => f.op === 'eq' ? row[f.key] === f.value : row[f.key] <= f.value))
        result.sort((a, b) => { for (const order of orders) { const comparison = String(a[order.key]).localeCompare(String(b[order.key])); if (comparison) return order.ascending ? comparison : -comparison } return 0 })
        return Promise.resolve({ data: result.slice(q.from, q.to + 1), count: q.exact ? result.length : null, error: null }).then(resolve, reject)
      } }
    return q
  } }
  return client
}
const load = client => unitModule('../lib/data/signal-lab.ts', {
  '../supabase/server': { createClient: async () => client },
  './complete-ledger': { readCompleteLedger }, '../models/btc24-forward': { evaluateBtc24Forward },
}).getSignalLab

const client = fakeClient()
const data = await load(client)(model.id)
assert.equal(data.authorized, true)
assert.equal(data.model.id, model.id)
assert.equal(data.complete, true)
assert.equal(data.forecastCount, 1107)
assert.equal(data.expectedCount, 1107)
assert.equal(data.predictions.length, 50, 'Preview cap must not cap evaluation')
assert.equal(data.forward.resolved, 1107)
assert.equal(data.forward.metrics.model.observations, 1107)
assert.equal(data.forward.gate, 'human-review-required')
assert.equal(data.errors.length, 0)
for (const q of client.queries.filter(q => ['signal_predictions', 'backtest_runs'].includes(q.table))) {
  assert.ok(q.filters.some(f => f.key === 'model_version_id' && f.value === model.id))
  assert.ok(q.filters.some(f => f.key === 'created_at' && f.value === data.asOf))
}
assert.ok(client.queries.filter(q => q.table === 'signal_predictions').every(q => q.orders.map(o => o.key).join(',') === 'created_at,id' && q.exact))
const selected2 = await load(fakeClient())(version2.id)
assert.equal(selected2.forward.resolved, 3)
assert.equal((await load(fakeClient())()).model.id, version2.id, 'Default selects newest BTC version')
const absent = await load(fakeClient())(id(99999))
assert.equal(absent.model, undefined)
assert.equal(absent.forward, null)
assert.equal(absent.complete, false)
assert.match(absent.errors.join(' '), /No substitute/)
const failed = await load(fakeClient({ failTable: 'signal_predictions', failPage: 250 }))(model.id)
assert.equal(failed.complete, false)
assert.equal(failed.forecastCount, 250)
assert.equal(failed.forward.metrics, null)
assert.ok(failed.errors.length > 0)
const failedModels = await load(fakeClient({ failTable: 'signal_model_versions', failPage: 0 }))()
assert.equal(failedModels.complete, false)
assert.ok(failedModels.errors.length > 0)
for (const options of [{ role: 'reader' }, { signedIn: false }]) {
  const denied = fakeClient(options)
  assert.equal((await load(denied)(model.id)).authorized, false)
  assert.equal(denied.queries.length, 0, 'No private model query before approved-role authentication')
}
for (const role of ['researcher', 'editor', 'admin']) assert.equal((await load(fakeClient({ role }))(version2.id)).authorized, true)

const ForwardEvidence = unitModule('../app/studio/signals/ForwardEvidence.tsx', {}).default
const html = renderToStaticMarkup(React.createElement(ForwardEvidence, { report }))
assert.match(html, /Complete version-specific forward report/)
assert.match(html, /90 valid resolved outcomes/)
assert.match(html, /Calibration/)
assert.match(html, /Illustrative cost sensitivity/)
assert.match(html, /human review is still required/)
const failedHtml = renderToStaticMarkup(React.createElement(ForwardEvidence, { report: failed.forward }))
assert.match(failedHtml, /Performance withheld/)
assert.doesNotMatch(failedHtml, /Forward classification/)
const earlyHtml = renderToStaticMarkup(React.createElement(ForwardEvidence, { report: selected2.forward }))
assert.match(earlyHtml, /No confidence interval or validation claim/)
const pageModule = unitModule('../app/studio/signals/page.tsx', {
  'next/link': { default: ({ children, ...props }) => React.createElement('a', props, children) },
  '../../../lib/data/signal-lab': { getSignalLab: async () => data }, './ForwardEvidence': { default: ForwardEvidence },
  './signals.module.css': { default: { versionForm: 'unit-version-form' } },
})
assert.equal(pageModule.dynamic, 'force-dynamic')
const page = renderToStaticMarkup(await pageModule.default({ searchParams: Promise.resolve({ model: model.id }) }))
assert.match(page, /Latest 50 of 1107 fetched/)
assert.match(page, /Model version/)
assert.doesNotMatch(page, /LATEST 50 OUTCOMES/)
console.log('Signal Lab unit acceptance passed: role boundary, exact version selection, >1,000-row loader, safe failures, 50-row preview only, server-rendered calibration/cost tables and no automatic publication.')
