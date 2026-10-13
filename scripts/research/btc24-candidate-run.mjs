import fs from 'node:fs'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {fileURLToPath} from 'node:url'
import {canonicalJson} from '../../lib/models/modules.ts'
import {cleanCandles} from '../../lib/models/btc24.ts'
import {BTC24_PROTOCOL_HASH,compareRollingCandidate,candidateSummary} from '../../lib/models/btc24-candidate.ts'
const sha=value=>createHash('sha256').update(canonicalJson(value)).digest('hex')
const protocolPath=fileURLToPath(new URL('../../research/btc24/v0.2/protocol.json',import.meta.url))
export function verifiedCandidateInput(record,protocol){
  if(sha(protocol)!==BTC24_PROTOCOL_HASH)throw new Error('Frozen candidate protocol changed')
  const snapshot=record?.snapshot,source=protocol.source
  if(record?.recordId!==source.snapshotId||!snapshot||snapshot.hash!==source.snapshotHash||sha(snapshot.candles)!==source.snapshotHash)throw new Error('Pinned source snapshot or checksum mismatch')
  if(snapshot.provider!==source.provider||snapshot.product!==source.product||snapshot.sourceUrl!==source.url||snapshot.fetchedAt!==source.fetchedAt)throw new Error('Pinned source metadata mismatch')
  const {candles,quality}=cleanCandles(snapshot.candles,Date.parse(snapshot.fetchedAt)/1000)
  if(quality.rows!==source.expectedRows||quality.first!==source.firstBucket||quality.last!==source.lastBucket||quality.gaps.length||quality.duplicates||quality.incomplete)throw new Error('Incomplete or changed frozen source coverage')
  return {candles,quality}
}
export function runCandidate(record,protocol){
  const {candles,quality}=verifiedCandidateInput(record,protocol),result=compareRollingCandidate(candles)
  const legacyArtifactHash=sha(result.legacyFittedFinal)
  if(legacyArtifactHash!==protocol.comparison.legacyArtifactHash)throw new Error('Original v0.1 fitted artifact did not reproduce')
  if(result.observations!==protocol.comparison.expectedTargets||result.periodStart!==protocol.comparison.testStart||result.periodEnd!==protocol.comparison.testEndExclusive)throw new Error('Historical target cohort is incomplete or different')
  return {protocolHash:BTC24_PROTOCOL_HASH,snapshotId:record.recordId,snapshotHash:record.snapshot.hash,legacyArtifactHash,candidateArtifactHash:sha(result.fittedFinal),quality,result,summary:candidateSummary(result)}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const [input,output]=process.argv.slice(2)
  if(!input||!output)throw new Error('Usage: node --experimental-strip-types scripts/research/btc24-candidate-run.mjs private-record.json private-result.json')
  const root=path.resolve(fileURLToPath(new URL('../../',import.meta.url)))+path.sep
  const inputReal=fs.realpathSync(input),outputReal=path.join(fs.realpathSync(path.dirname(output)),path.basename(output))
  if(inputReal.startsWith(root)||outputReal.startsWith(root)||inputReal===outputReal)throw new Error('Raw inputs and fitted output must be separate files outside the Git worktree')
  const evidence=runCandidate(JSON.parse(fs.readFileSync(input,'utf8')),JSON.parse(fs.readFileSync(protocolPath,'utf8')))
  fs.writeFileSync(output,JSON.stringify(evidence),{flag:'wx',mode:0o600})
  console.log(JSON.stringify({protocolHash:evidence.protocolHash,snapshotHash:evidence.snapshotHash,legacyArtifactHash:evidence.legacyArtifactHash,candidateArtifactHash:evidence.candidateArtifactHash,quality:evidence.quality,...evidence.summary},null,2))
}
