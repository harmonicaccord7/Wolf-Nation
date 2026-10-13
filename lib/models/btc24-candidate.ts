/** Offline, previously-inspected historical research. Never a live signal. */
import {DAY, FEATURE_NAMES, makeSamples, fitLogistic, predict, researchExperiment, classification, strategy, buyHold, brierDifferenceInterval, iso, type Candle, type Sample, type Scored, type FittedModel} from './btc24.ts'
export const BTC24_CANDIDATE_VERSION='0.2.0'
export const BTC24_PROTOCOL_HASH='83ebf4a4767288ed62241f12acca9a4b83442175230f6bfe122b8964265c11b3'
export const ROLLING_DAYS=730, CANDIDATE_PENALTY=100
export function rollingTraining(samples:Sample[],cutoff:number){
  if(!Number.isFinite(cutoff)||cutoff%DAY)throw new Error('An exact UTC input cutoff is required')
  return samples.filter(row=>row.end<cutoff&&row.end>=cutoff-ROLLING_DAYS*DAY)
}
function quarter(start:number){const date=new Date(start*1000);return date.getUTCFullYear()+'-Q'+(Math.floor(date.getUTCMonth()/3)+1)}
export type CandidateRow=Scored&{legacyProbability:number;rollingPrior:number}
export type CandidateFold={key:string;start:string;cutoff:string;trainingFirstTargetEnd:string;trainingLastTargetEnd:string;trainingObservations:number;observations:number;model:FittedModel}
export function fitRollingRows(samples:Sample[],legacyRows:Scored[]){
  if(!legacyRows.length)throw new Error('Paired target rows are required')
  const byStart=new Map(samples.map(row=>[row.start,row])),rows:CandidateRow[]=[],folds:CandidateFold[]=[]
  let key='',fitted:FittedModel|null=null,previous=0
  for(const row of legacyRows){
    const original=byStart.get(row.start)
    if(!original||row.start<=previous||row.start-row.cutoff!==DAY||row.end-row.start!==DAY||row.fold!==quarter(row.start)
      ||row.cutoff!==original.cutoff||row.end!==original.end||row.y!==original.y||row.open!==original.open||row.close!==original.close||row.move!==original.move
      ||row.x.length!==FEATURE_NAMES.length||row.x.some((value,index)=>value!==original.x[index])
      ||!Number.isFinite(row.probability)||row.probability<0||row.probability>1||!Number.isFinite(row.baseline)||row.baseline<0||row.baseline>1)
      throw new Error('Different, unordered or invalid paired historical targets')
    previous=row.start
    if(row.fold!==key){
      const training=rollingTraining(samples,row.cutoff)
      fitted=fitLogistic(training,CANDIDATE_PENALTY)
      if(fitted.lastTargetEnd>=row.cutoff)throw new Error('Candidate training label leakage')
      folds.push({key:row.fold,start:iso(row.start),cutoff:iso(row.cutoff),trainingFirstTargetEnd:iso(training[0].end),trainingLastTargetEnd:iso(fitted.lastTargetEnd),trainingObservations:training.length,observations:0,model:fitted})
      key=row.fold
    }
    folds.at(-1)!.observations++
    rows.push({...row,probability:predict(fitted!,row.x),legacyProbability:row.probability,rollingPrior:fitted!.prior})
  }
  return {rows,folds}
}
export function compareRollingCandidate(candles:Candle[]){
  const samples=makeSamples(candles),legacy=researchExperiment(candles),candidate=fitRollingRows(samples,legacy.test.rows)
  const legacyRows=candidate.rows.map(row=>({...row,probability:row.legacyProbability}))
  const metrics={candidate:classification(candidate.rows),legacy:classification(legacyRows),benchmark:classification(candidate.rows,true),rollingPrior:classification(candidate.rows.map(row=>({...row,baseline:row.rollingPrior})),true)}
  const differences={versusLegacy:brierDifferenceInterval(candidate.rows.map(row=>({...row,baseline:row.legacyProbability}))),versusBenchmark:brierDifferenceInterval(candidate.rows)}
  const quarters=candidate.folds.map(fold=>{
    const current=candidate.rows.filter(row=>row.fold===fold.key),old=current.map(row=>({...row,probability:row.legacyProbability}))
    return {key:fold.key,start:fold.start,end:iso(current.at(-1)!.end),observations:current.length,trainingObservations:fold.trainingObservations,trainingFirstTargetEnd:fold.trainingFirstTargetEnd,trainingLastTargetEnd:fold.trainingLastTargetEnd,candidate:classification(current),legacy:classification(old),benchmark:classification(current,true)}
  })
  const strategies=[10,25,50].map(cost=>({costBpsPerSide:cost,candidate:strategy(candidate.rows,cost),legacy:strategy(legacyRows,cost),alwaysLongDaily:strategy(candidate.rows,cost,'always-long'),momentum:strategy(candidate.rows,cost,'momentum'),buyHold:buyHold(candidate.rows,cost),cash:strategy(candidate.rows,cost,'cash')}))
  const finalCutoff=candles.at(-1)![0]+DAY,finalTraining=rollingTraining(samples,finalCutoff),fittedFinal=fitLogistic(finalTraining,CANDIDATE_PENALTY)
  return {version:BTC24_CANDIDATE_VERSION,features:FEATURE_NAMES,periodStart:iso(candidate.rows[0].start),periodEnd:iso(candidate.rows.at(-1)!.end),observations:candidate.rows.length,
    metrics,differences,quarters,strategies,rows:candidate.rows,folds:candidate.folds,legacyFolds:legacy.test.folds,legacyFittedFinal:legacy.fittedFinal,fittedFinal,
    finalFit:{cutoff:iso(finalCutoff),trainingFirstTargetEnd:iso(finalTraining[0].end),trainingLastTargetEnd:iso(fittedFinal.lastTargetEnd),trainingObservations:finalTraining.length},
    gate:{status:'research-only',previousHistoricalLabelsSeen:true,forwardCallsIssued:0,publication:'blocked',automaticPromotion:false,reason:'Retrospective comparison on an already-inspected historical sample. No separate v0.2 prospective evidence.'}}
}
export function candidateSummary(result:ReturnType<typeof compareRollingCandidate>){
  const {rows,folds,legacyFolds,legacyFittedFinal,fittedFinal,strategies,...summary}=result
  const stripCurve=(value:Record<string,unknown>)=>{const {curve,...rest}=value;return rest}
  return {...summary,abstention:{threshold:.55,candidateActiveDays:strategies[0].candidate.activeDays,legacyActiveDays:strategies[0].legacy.activeDays,candidateRate:1-strategies[0].candidate.activeDays/rows.length,legacyRate:1-strategies[0].legacy.activeDays/rows.length},
    strategies:strategies.map(row=>({costBpsPerSide:row.costBpsPerSide,candidate:stripCurve(row.candidate),legacy:stripCurve(row.legacy),alwaysLongDaily:stripCurve(row.alwaysLongDaily),momentum:stripCurve(row.momentum),buyHold:stripCurve(row.buyHold),cash:stripCurve(row.cash)}))}
}
