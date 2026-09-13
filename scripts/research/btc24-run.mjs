import fs from 'node:fs'
import { createHash } from 'node:crypto'
import { cleanCandles, researchExperiment } from '../../lib/models/btc24.ts'
import { canonicalJson } from '../../lib/models/modules.ts'
const [input, output] = process.argv.slice(2)
if (!input || !output) throw new Error('Usage: node --experimental-strip-types scripts/research/btc24-run.mjs private-snapshot.json private-result.json')
const snapshot = JSON.parse(fs.readFileSync(input, 'utf8'))
const hash = createHash('sha256').update(canonicalJson(snapshot.candles)).digest('hex')
if (snapshot.hash !== hash) throw new Error('Source checksum mismatch')
const { candles, quality } = cleanCandles(snapshot.candles, Date.parse(snapshot.fetchedAt) / 1000)
const result = researchExperiment(candles)
const artifactHash = createHash('sha256').update(canonicalJson(result.fittedFinal)).digest('hex')
fs.writeFileSync(output, JSON.stringify({ snapshotHash: hash, artifactHash, quality, result }))
const { rows, strategies, folds, ...test } = result.test
console.log(JSON.stringify({ snapshotHash: hash, artifactHash, quality, train: result.train, validation: result.validation, test, folds: folds.map(({ model, ...f }) => f), strategies: strategies.map(({ model, alwaysLongDaily, momentum, buyHold, cash, ...s }) => ({ ...s, model: { ...model, curve: undefined }, alwaysLongDaily: { ...alwaysLongDaily, curve: undefined }, momentum: { ...momentum, curve: undefined }, buyHold: { ...buyHold, curve: undefined }, cash: { ...cash, curve: undefined } })), gate: result.gate }, null, 2))
