// Replay only the archived protocol; report aggregate errors, never raw rows or fits.
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import {fileURLToPath} from 'node:url'
import {runCandidate} from './btc24-candidate-run.mjs'
import {classification} from '../../lib/models/btc24.ts'

export function confidenceAudit(rows, key) {
  if (!rows.length) throw new Error('No forecasts to audit')
  const cells = {upCorrect:0, upWrong:0, downCorrect:0, downWrong:0}
  const edges = [[.5,.55],[.55,.6],[.6,.7],[.7,.9],[.9,1]]
  const bands = edges.map(([lower,upper]) => ({lower,upper,count:0,correct:0}))
  const probabilities = []
  for (const row of rows) {
    const p = row[key]
    if (!Number.isFinite(p) || p < 0 || p > 1 || ![0,1].includes(row.y)) throw new Error('Invalid probability or label')
    probabilities.push(p)
    const up = p >= .5, correct = Number(up) === row.y, confidence = Math.max(p,1-p)
    cells[(up?'up':'down')+(correct?'Correct':'Wrong')]++
    const bin = bands.find(b => confidence >= b.lower && (confidence < b.upper || b.upper === 1))
    bin.count++; bin.correct += Number(correct)
  }
  const correct = cells.upCorrect + cells.downCorrect
  return {observations:rows.length, correct, wrong:rows.length-correct, accuracy:correct/rows.length,
    probabilityRange:{minimum:Math.min(...probabilities),maximum:Math.max(...probabilities)},
    confusion:cells, confidenceBands:bands.map(b=>({...b,coverage:b.count/rows.length,accuracy:b.count?b.correct/b.count:null}))}
}

// Illustration only: a fixed Bernoulli success rate and independent, identical trials.
export function perfectSampleIllustration(target=.999,alpha=.05) {
  if (!(target>0&&target<1&&alpha>0&&alpha<1)) throw new Error('Invalid target or confidence level')
  const requiredCorrect = Math.ceil(Math.log(alpha)/Math.log(target))
  return {target,oneSidedConfidence:1-alpha,requiredCorrect,allowedErrors:0,
    lowerBound:alpha**(1/requiredCorrect),previousSampleLowerBound:alpha**(1/(requiredCorrect-1)),
    assumption:'Independent identically distributed Bernoulli trials; not established for these market forecasts',
    meaning:'Mathematical illustration, not a forecast guarantee, validation gate or time promise'}
}

function selfTest() {
  const edgesForCheck=[[.5,.55],[.55,.6],[.6,.7],[.7,.9],[.9,1]]
  const rows=[{p:.5,y:1},{p:.55,y:0},{p:.45,y:0},{p:.6,y:1},{p:.7,y:0},{p:.9,y:1},{p:1,y:1},{p:0,y:1}]
  const report=confidenceAudit(rows,'p')
  assert.equal(report.correct,5)
  assert.equal(report.confusion.upWrong,2)
  assert.deepEqual(report.confidenceBands.map(b=>b.count),[1,2,1,1,3])
  assert.equal(report.confidenceBands.reduce((s,b)=>s+b.count,0),rows.length)
  assert.equal(report.confidenceBands.reduce((s,b)=>s+b.correct,0),report.correct)
  assert.equal(confidenceAudit([{p:.5,y:0}],'p').confidenceBands[4].accuracy,null)
  assert.throws(()=>confidenceAudit([],'p'))
  for(const p of [NaN,Infinity,-.1,1.1]) assert.throws(()=>confidenceAudit([{p,y:1}],'p'))
  assert.throws(()=>confidenceAudit([{p:.5,y:2}],'p'))
  const example=perfectSampleIllustration()
  assert.equal(example.requiredCorrect,2995)
  assert.ok(example.lowerBound>=example.target && example.previousSampleLowerBound<example.target)
  assert.throws(()=>perfectSampleIllustration(1))
  const archived=JSON.parse(fs.readFileSync(new URL('../../research/btc24/v0.2/evidence-summary-2026-10-13.json',import.meta.url),'utf8')).aggregateEvidence
  const evidence=JSON.parse(fs.readFileSync(new URL('../../research/btc24/v0.2/confidence-audit-2026-10-13.json',import.meta.url),'utf8'))
  for(const pin of ['protocolHash','snapshotHash','observations','periodStart','periodEnd']) assert.equal(evidence[pin],archived[pin],pin)
  for(const [name,model] of Object.entries(evidence.models)) {
    assert.equal(model.observations,archived.observations)
    assert.equal(model.correct+model.wrong,model.observations)
    assert.equal(Object.values(model.confusion).reduce((s,n)=>s+n,0),model.observations)
    assert.equal(model.confusion.upCorrect+model.confusion.downCorrect,model.correct)
    assert.ok(Math.abs(model.accuracy-archived.metrics[name].hitRate)<1e-12)
    assert.equal(model.confidenceBands.length,5)
    assert.equal(model.confidenceBands.reduce((s,b)=>s+b.count,0),model.observations)
    assert.equal(model.confidenceBands.reduce((s,b)=>s+b.correct,0),model.correct)
    for(const [index,b] of model.confidenceBands.entries()) {
      assert.deepEqual([b.lower,b.upper],edgesForCheck[index])
      assert.ok(Number.isInteger(b.count)&&b.count>=0&&Number.isInteger(b.correct)&&b.correct>=0&&b.correct<=b.count)
      assert.equal(b.coverage,b.count/model.observations)
      assert.equal(b.accuracy,b.count?b.correct/b.count:null)
    }
  }
  for(const key of ['target','oneSidedConfidence','requiredCorrect','allowedErrors','assumption','meaning']) assert.equal(evidence.accuracyAspiration[key],example[key])
  for(const key of ['lowerBound','previousSampleLowerBound']) assert.ok(Math.abs(evidence.accuracyAspiration[key]-example[key])<1e-14)
  console.log('Confidence audit QA passed: complete denominators, fixed band boundaries, empty bands, invalid inputs and exact perfect-sample illustration.')
}

if (process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  if (process.argv[2]==='--self-test') selfTest()
  else {
    const input=process.argv[2]
    if(!input||process.argv.length!==3) throw new Error('Usage: node --experimental-strip-types scripts/research/btc24-confidence-audit.mjs private-source-record.json')
    const real=fs.realpathSync(input)
    let parent=path.dirname(real)
    while(true) {
      if(fs.existsSync(path.join(parent,'.git'))) throw new Error('Raw input must be outside every Git worktree')
      const next=path.dirname(parent); if(next===parent)break; parent=next
    }
    if(fs.statSync(real).size>1_000_000) throw new Error('Unexpected input size')
    const protocol=JSON.parse(fs.readFileSync(new URL('../../research/btc24/v0.2/protocol.json',import.meta.url),'utf8'))
    const archived=JSON.parse(fs.readFileSync(new URL('../../research/btc24/v0.2/evidence-summary-2026-10-13.json',import.meta.url),'utf8')).aggregateEvidence
    const replay=runCandidate(JSON.parse(fs.readFileSync(real,'utf8')),protocol)
    for(const key of ['protocolHash','snapshotHash','legacyArtifactHash','candidateArtifactHash']) assert.equal(replay[key],archived[key],key+' changed')
    const mappings={candidate:'probability',legacy:'legacyProbability',benchmark:'baseline'}
    const models={}
    for(const [name,key] of Object.entries(mappings)) {
      const rows=replay.result.rows.map(row=>({...row,probability:row[key]}))
      const metrics=classification(rows)
      for(const metric of ['observations','hitRate','precision','brier','logLoss','actualUpRate']) assert.ok(Math.abs(metrics[metric]-archived.metrics[name][metric])<1e-12,name+' '+metric+' differs from archived evidence')
      models[name]=confidenceAudit(replay.result.rows,key)
    }
    console.log(JSON.stringify({analysis:'btc24-fixed-confidence-diagnostics-1',status:'retrospective research; no promotion',
      method:'Replay the frozen v0.2 source/protocol/artifacts; compare original aggregate scores; classify every same target at probability >=0.5. Confidence is max(p,1-p), not achieved accuracy.',
      bandRules:'Fixed half-open bands; final band includes 1. No new strategy, fitted parameters or threshold selection.',
      protocolHash:replay.protocolHash,snapshotHash:replay.snapshotHash,observations:replay.result.observations,
      periodStart:replay.result.periodStart,periodEnd:replay.result.periodEnd,models,
      accuracyAspiration:perfectSampleIllustration(),
      limits:['Historical labels were already inspected.','Empty confidence bands have no accuracy estimate.','Tiny perfect subsets do not establish future accuracy.','No raw observations, fitted coefficients, per-target probabilities or trading outcomes are emitted.']},null,2))
  }
}
