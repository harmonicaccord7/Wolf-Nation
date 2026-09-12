import { createHash } from 'node:crypto'
import { studioAccess, reply } from '../../../../../lib/studio-access'
import { runDecisionModules, replayBtcBaseline, DECISION_MODEL_VERSION, canonicalJson } from '../../../../../lib/models/modules'
import { loadModelSnapshot } from '../../../../../lib/models/load-snapshot'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export async function GET() {
  const { db, error } = await studioAccess(); if (error) return error
  const result = await db.from('model_runs').select('id,module_code,model_version,as_of,status,metrics,results,created_at').order('created_at', { ascending: false }).limit(20)
  return result.error ? reply({ error: 'Model history unavailable.' }, 503) : reply({ runs: result.data })
}
export async function POST() {
  const { db, user, error } = await studioAccess(); if (error || !user) return error!
  const asOf = new Date().toISOString()
  try {
    const snapshot = await loadModelSnapshot(db, asOf)
    const results = runDecisionModules(snapshot.series, asOf), replay = replayBtcBaseline(snapshot.series.BTC ?? [], asOf)
    const inputHash = createHash('sha256').update(canonicalJson(snapshot.series)).digest('hex')
    const metrics = { observed: results.filter(r => r.status === 'observed').length, abstained: results.filter(r => r.status === 'abstained').length, inputHash, replay }
    const saved = await db.from('model_runs').insert({ module_code: 'decision-suite', model_version: DECISION_MODEL_VERSION, run_type: 'research_snapshot', universe: 'Observed public data; experimental BTC baseline replay', as_of: asOf, status: metrics.observed ? 'completed' : 'abstained', input_snapshot: { ...snapshot, cutoff: asOf, hash: inputHash }, metrics, results, created_by: user.id }).select('id').single()
    return saved.error ? reply({ error: 'Results could not be stored; no successful run is claimed.' }, 503) : reply({ id: saved.data.id, asOf, results, replay, inputHash })
  } catch { return reply({ error: 'Source queries failed; no run was stored.' }, 503) }
}
