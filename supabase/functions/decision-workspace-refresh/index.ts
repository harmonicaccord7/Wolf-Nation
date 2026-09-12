import { createClient } from 'npm:@supabase/supabase-js@2.112.3'
import { calendarSources, parseICS, parseFedCalendar, eventHasPassed } from '../../../lib/events/calendar.ts'
import { runDecisionModules, replayBtcBaseline, DECISION_MODEL_VERSION, canonicalJson } from '../../../lib/models/modules.ts'
import { loadModelSnapshot } from '../../../lib/models/load-snapshot.ts'
import { draftEdition } from '../../../lib/newsletter-draft.ts'
const headers = { 'content-type': 'application/json', 'cache-control': 'no-store' }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers })
Deno.serve(async request => {
  if (request.method !== 'POST') return json({ error: 'POST required' }, 405)
  const url = Deno.env.get('SUPABASE_URL')!
  const key = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}').default ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const db = createClient(url, key, { auth: { persistSession: false } })
  const { data: authorized, error: authorizationError } = await db.rpc('authorize_workspace_refresh', { token_input: request.headers.get('x-kaporal-job-token') ?? '' })
  if (authorizationError || !authorized) return json({ error: 'Unauthorized' }, 401)
  const input = await request.json().catch(() => ({})), cutoff = new Date().toISOString()
  try {
    const checks = await Promise.allSettled(Object.entries(calendarSources).map(async ([name, source]) => {
      const response = await fetch(source, { headers: { 'user-agent': 'KAPORALCalendar/1.1' }, signal: AbortSignal.timeout(12_000) })
      if (!response.ok) throw new Error(name + ' source unavailable')
      const text = await response.text(), fetchedAt = new Date().toISOString()
      const events = name === 'fed' ? parseFedCalendar(text, fetchedAt) : parseICS(text, name === 'bls' ? 'BLS' : 'BEA', fetchedAt)
      if (!events.length) throw new Error(name + ' parser returned no events')
      return events
    }))
    const events = checks.flatMap(r => r.status === 'fulfilled' ? r.value : []).filter(e => Date.parse(e.scheduledAt) >= Date.parse(cutoff) - 90 * 86400000)
    const sourceState = checks.every(r => r.status === 'fulfilled') ? 'live' : events.length ? 'partial' : 'unavailable'
    if (events.length) {
      const result = await db.rpc('sync_economic_events', { events_json: events.map(event => ({ slug: event.slug, kind: event.kind, title: event.title, scheduled_at: event.scheduledAt, date_precision: event.precision, timezone: event.timezone, provider: event.provider, source_url: event.sourceUrl, checked_at: event.checkedAt, provider_sequence: event.sequence, status: event.status, metadata: { source_id: event.id } })) })
      if (result.error) throw new Error('Calendar persistence failed')
    }
    const snapshot = await loadModelSnapshot(db, cutoff)
    const encoded = new TextEncoder().encode(canonicalJson(snapshot.series))
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', encoded)), value => value.toString(16).padStart(2, '0')).join('')
    const results = runDecisionModules(snapshot.series, cutoff), replay = replayBtcBaseline(snapshot.series.BTC ?? [], cutoff)
    const metrics = { observed: results.filter(r => r.status === 'observed').length, abstained: results.filter(r => r.status === 'abstained').length, inputHash: hash, replay }
    const stored = await db.from('model_runs').insert({ module_code: 'decision-suite', model_version: DECISION_MODEL_VERSION, run_type: 'research_snapshot', universe: 'Public observed data; exploratory BTC replay', as_of: cutoff, status: metrics.observed ? 'completed' : 'abstained', input_snapshot: { ...snapshot, cutoff, hash }, metrics, results }).select('id').single()
    if (stored.error) throw new Error('Model persistence failed')
    const upcoming = events.filter(e => e.status === 'scheduled' && !eventHasPassed(e, Date.now())).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)).slice(0, 8)
    const date = cutoff.slice(0, 10), day = new Date(cutoff).getUTCDay(), kinds: string[] = []
    if (day === 1 || input.prepareDraft === true) kinds.push('weekly')
    if (day >= 1 && day <= 5) kinds.push('weekday')
    if (upcoming.some(e => Date.parse(e.scheduledAt) - Date.parse(cutoff) <= 86400000)) kinds.push('material_event')
    let created = 0
    if (sourceState === 'live' && upcoming.length) for (const kind of kinds) {
      const result = await db.from('newsletter_issues').insert({ issue_key: 'market-letter-' + kind + '-' + date, issue_kind: kind, issue_date: date, title: 'KAPORAL Market Letter — ' + date, dek: 'Official catalysts and a framework for exposure, waiting and risk.', body: draftEdition(upcoming), source_snapshot: { events: upcoming, sourceState, checkedAt: upcoming.map(e=>e.checkedAt).sort()[0], modelRunId: stored.data.id } })
      if (result.error && result.error.code !== '23505') throw new Error('Newsletter draft persistence failed')
      if (!result.error) created++
    }
    return json({ ok: true, modelRunId: stored.data.id, sourceState, eventCount: events.length, draftsCreated: created, observedModules: metrics.observed, replayWindows: replay.observations, published: 0, emailsSent: 0 })
  } catch (error) { return json({ ok: false, error: error instanceof Error ? error.message : 'Refresh failed' }, 503) }
})
