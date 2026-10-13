import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {spawnSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {DAY,makeSamples} from '../lib/models/btc24.ts'
import {canonicalJson} from '../lib/models/modules.ts'
import {BTC24_PROTOCOL_HASH,ROLLING_DAYS,rollingTraining,fitRollingRows,compareRollingCandidate,candidateSummary} from '../lib/models/btc24-candidate.ts'
import {verifiedCandidateInput} from './research/btc24-candidate-run.mjs'
const protocol=JSON.parse(fs.readFileSync(new URL('../research/btc24/v0.2/protocol.json',import.meta.url),'utf8'))
assert.equal(createHash('sha256').update(canonicalJson(protocol)).digest('hex'),BTC24_PROTOCOL_HASH)
assert.throws(()=>verifiedCandidateInput({}, {...protocol,fit:{...protocol.fit,summedLossL2Penalty:10}}),/protocol changed/)
assert.throws(()=>verifiedCandidateInput({recordId:protocol.source.snapshotId,snapshot:{hash:protocol.source.snapshotHash,candles:[]}},protocol),/snapshot or checksum mismatch/)
// Deliberately synthetic fixtures; no source records or forecasts are stored.
const start=Date.parse('2021-01-01')/1000
const candles=Array.from({length:1500},(_,i)=>{const open=100+i*.025+2*Math.sin(i*.63),close=open+1.3*Math.sin(i*1.17);return [start+i*DAY,Math.min(open,close)-1,Math.max(open,close)+1,open,close,100+i%23]})
const samples=makeSamples(candles),result=compareRollingCandidate(candles),firstCutoff=Date.parse(result.folds[0].cutoff)/1000
const train=rollingTraining(samples,firstCutoff)
assert.equal(train.length,ROLLING_DAYS)
assert.ok(train.every(row=>row.end<firstCutoff&&row.end>=firstCutoff-ROLLING_DAYS*DAY))
assert.ok(!train.includes(samples.find(row=>row.end===firstCutoff)))
assert.throws(()=>rollingTraining(samples,firstCutoff+1),/exact UTC/)
assert.ok(result.folds.every(fold=>Date.parse(fold.trainingLastTargetEnd)<Date.parse(fold.cutoff)))
assert.equal(result.rows.length,result.metrics.candidate.observations)
assert.equal(result.rows.length,result.metrics.legacy.observations)
assert.equal(result.rows.length,result.metrics.benchmark.observations)
assert.ok(result.rows.every(row=>row.start-row.cutoff===DAY&&row.end-row.start===DAY))
const firstRows=result.rows.filter(row=>row.fold===result.folds[0].key).map(row=>({...row,probability:row.legacyProbability}))
const futureChanged=candles.map(c=>c[0]>=Date.parse('2024-05-01')/1000?[c[0],...c.slice(1).map(n=>n*1.2)]:c)
const unchanged=fitRollingRows(makeSamples(futureChanged),firstRows)
assert.deepEqual(unchanged.folds[0].model,result.folds[0].model)
assert.deepEqual(unchanged.rows.map(row=>row.probability),result.rows.slice(0,firstRows.length).map(row=>row.probability))
assert.throws(()=>fitRollingRows(samples,[...firstRows].reverse()),/unordered/)
assert.throws(()=>fitRollingRows(samples,[{...firstRows[0],x:firstRows[0].x.map((n,i)=>i?n:n+1)}]),/Different/)
assert.throws(()=>fitRollingRows(samples.filter(row=>row.end>=firstCutoff-100*DAY),firstRows),/500 training/)
const withGap=makeSamples(candles.filter((_,i)=>i!==700)),gapTrain=rollingTraining(withGap,firstCutoff)
assert.ok(gapTrain.length<train.length)
assert.ok(gapTrain.every(row=>row.end>=firstCutoff-ROLLING_DAYS*DAY))
assert.equal(result.gate.forwardCallsIssued,0)
assert.equal(result.gate.publication,'blocked')
assert.equal(result.gate.automaticPromotion,false)
const summary=candidateSummary(result),text=JSON.stringify(summary)
assert.equal(text.includes('coefficients'),false)
assert.equal(Object.hasOwn(summary,'rows'),false)
assert.equal(Object.hasOwn(summary,'fittedFinal'),false)
assert.ok(summary.strategies.every(row=>!Object.hasOwn(row.candidate,'curve')))
assert.equal(summary.abstention.candidateRate,1-summary.abstention.candidateActiveDays/result.observations)
const evidence=JSON.parse(fs.readFileSync(new URL('../research/btc24/v0.2/evidence-summary-2026-10-13.json',import.meta.url),'utf8')),aggregate=evidence.aggregateEvidence
assert.equal(evidence.freezeCommit,'92178ffa979d5ad3b3de3a84fd7c552541e1a060')
assert.equal(aggregate.protocolHash,BTC24_PROTOCOL_HASH)
assert.equal(aggregate.snapshotHash,protocol.source.snapshotHash)
assert.equal(aggregate.legacyArtifactHash,protocol.comparison.legacyArtifactHash)
assert.equal(aggregate.observations,protocol.comparison.expectedTargets)
assert.equal(aggregate.quarters.reduce((sum,row)=>sum+row.observations,0),aggregate.observations)
for(const key of ['candidate','legacy','benchmark']){
  const metrics=aggregate.metrics[key]
  assert.equal(metrics.reliability.reduce((sum,bin)=>sum+bin.count,0),aggregate.observations)
  for(const metric of ['brier','logLoss','hitRate','actualUpRate']){
    const weighted=aggregate.quarters.reduce((sum,row)=>sum+row[key][metric]*row.observations,0)/aggregate.observations
    assert.ok(Math.abs(weighted-metrics[metric])<1e-12)
  }
}
assert.equal(JSON.stringify(evidence).includes('coefficients'),false)
assert.equal(Object.hasOwn(aggregate,'rows'),false)
assert.equal(evidence.independentAudit.verified,true)
assert.equal(evidence.independentAudit.targets,aggregate.observations)
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'kaporal-btc24-qa-'))
try{
  const runner=fileURLToPath(new URL('./research/btc24-candidate-run.mjs',import.meta.url)),repo=fileURLToPath(new URL('../',import.meta.url))
  const input=path.join(temporary,'fixture.json');fs.writeFileSync(input,'{}')
  fs.symlinkSync(repo,path.join(temporary,'repo-link'),'dir')
  for(const [source,target] of [[path.join(repo,'package.json'),path.join(temporary,'result.json')],[input,input],[input,path.join(temporary,'repo-link','private-result.json')]]){
    const blocked=spawnSync(process.execPath,['--experimental-strip-types',runner,source,target],{encoding:'utf8'})
    assert.notEqual(blocked.status,0);assert.match(blocked.stderr,/outside the Git worktree/)
  }
  assert.equal(fs.existsSync(path.join(repo,'private-result.json')),false)
}finally{fs.rmSync(temporary,{recursive:true,force:true})}
console.log('BTC v0.2 research QA passed: frozen protocol/source pins, purged rolling windows, paired targets, future isolation, gaps, evidence-only gates and aggregate redaction.')
