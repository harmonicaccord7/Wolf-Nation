'use client'
import { useEffect, useState } from 'react'
import type { ModuleResult } from '../lib/models/modules'
export function ModelsPanel() {
  const [results, setResults] = useState<ModuleResult[]>([])
  const [status, setStatus] = useState(''), [busy, setBusy] = useState(false)
  useEffect(() => {
    fetch('/api/studio/models/run', { cache: 'no-store' }).then(async r => {
      const body = await r.json()
      if (r.ok && body.runs?.[0]) { setResults(body.runs[0].results); setStatus('Latest stored run: ' + new Date(body.runs[0].as_of).toUTCString()) }
      else if (!r.ok) setStatus(body.error)
    }).catch(() => setStatus('Could not load stored runs.'))
  }, [])
  async function run() {
    setBusy(true); setStatus('Loading source observations…')
    try {
      const response = await fetch('/api/studio/models/run', { method: 'POST', cache: 'no-store' }), body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Run unavailable.')
      setResults(body.results)
      setStatus('Stored run ' + body.id + ' at ' + new Date(body.asOf).toUTCString() + '. Experimental BTC replay: ' + body.replay.observations + ' resolved daily windows; validation remains open.')
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Run failed.') } finally { setBusy(false) }
  }
  return <section className="studio-panel modelsPanel">
    <div className="formTitle"><span>RESEARCH</span><h2>Observed conditions & model evidence</h2><button className="outlineButton" onClick={run} disabled={busy}>{busy ? 'Running…' : 'Run and store observations'}</button></div>
    <p>These calculations describe recorded data. Each run preserves exact inputs, cutoff, version and a checksum. Experimental replay results do not establish forecast reliability.</p>
    <p role="status">{status}</p>
    <div className="modelRows">{results.map(item => <article className="modelRow" key={item.moduleCode}>
      <h3>{item.label}</h3><strong>{item.value == null ? 'Unavailable' : item.value.toFixed(3) + ' ' + item.unit}</strong>
      <p>{item.horizon} · {item.asOf ? new Date(item.asOf).toUTCString() : 'No source observation'}</p>
      <p>{item.rationale}</p><p><b>Limitations:</b> {item.limitation}</p>
      {item.metrics && <dl>{Object.entries(item.metrics).map(([key,value]) => <div key={key}><dt>{key.replace(/([A-Z])/g,' $1')}</dt><dd>{value == null ? 'Unavailable' : value.toFixed(3)}</dd></div>)}</dl>}
    </article>)}</div>
  </section>
}
