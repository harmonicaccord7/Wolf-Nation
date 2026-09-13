'use client'
import { useEffect, useState } from 'react'
type Block = { type: string; text?: string; items?: string[] }
type Issue = { id: string; issue_key: string; title: string; status: string; issue_date: string; updated_at: string; body: { blocks?: Block[] }; source_snapshot: { sourceState?: string; checkedAt?: string; events?: { id: string; title: string; sourceUrl: string }[] }; review_notes?: string; newsletter_deliveries?: { id: string; status: string; attempts: number; provider_message_id: string | null; last_error: string | null }[] }
const toText = (issue: Issue) => (issue.body.blocks ?? []).map(b => b.text ?? (b.items ?? []).join('\n')).join('\n\n')
export function NewsletterStudioPanel({ canEdit }: { canEdit: boolean }) {
  const [issues, setIssues] = useState<Issue[]>([]), [selected, setSelected] = useState<Issue | null>(null)
  const [draft, setDraft] = useState(''), [notes, setNotes] = useState(''), [status, setStatus] = useState(''), [busy, setBusy] = useState(false), [kind, setKind] = useState('weekly')
  async function load() {
    const r = await fetch('/api/studio/newsletter/issue', { cache: 'no-store' }), body = await r.json()
    if (!r.ok) throw new Error(body.error || 'Workspace unavailable.')
    const refreshed: Issue[] = body.issues ?? []
    setIssues(refreshed)
    setSelected(current => current ? refreshed.find(issue => issue.id === current.id) ?? null : null)
  }
  useEffect(() => { load().catch(error => setStatus(error.message)) }, [])
  function open(issue: Issue) { setSelected(issue); setDraft(toText(issue)); setNotes(issue.review_notes ?? '') }
  async function action(url: string, method: string, payload: unknown, message: string) {
    setBusy(true)
    try {
      const r = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }), body = await r.json()
      if (!r.ok || body.ok === false) throw new Error(body.error || 'Operation incomplete. Refresh the ledger before retrying.')
      await load(); if (body.issue) open(body.issue)
      setStatus(message + (typeof body.queued === 'number' ? ' Newly queued: ' + body.queued + '.' : '') + (Array.isArray(body.outcomes) ? ' Results: ' + body.outcomes.map((r: {status:string}) => r.status).join(', ') : ''))
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Request failed.') } finally { setBusy(false) }
  }
  const move = (next: string) => selected && action('/api/studio/newsletter/issue', 'PATCH', { id: selected.id, updatedAt: selected.updated_at, status: next, reviewNotes: notes }, 'Edition moved to ' + next + '.')
  return <section className="studio-panel newsletterStudio">
    <h2>Market Letter editorial desk</h2><p>Read and edit the full edition, check every linked source, and record your review before approval. Publication creates an immutable archive edition. Preparing a queue does not send email.</p>
    <div className="newsletterActions"><button disabled={busy} onClick={() => action('/api/studio/events/sync', 'POST', {}, 'Official calendar stored.')}>Sync calendar</button>
      <label>Edition cadence<select value={kind} onChange={e => setKind(e.target.value)}><option value="weekly">Weekly</option><option value="weekday">Weekday</option><option value="material_event">Material event</option></select></label>
      <button disabled={busy} onClick={() => action('/api/studio/newsletter/issue', 'POST', { issueKind: kind }, 'Draft prepared for review.')}>Generate draft</button></div>
    <p role="status">{status}</p>
    <ul className="newsletterIssueRows">{issues.map(issue => <li key={issue.id}><button disabled={busy} onClick={() => open(issue)}>{issue.title} · {issue.status}</button></li>)}</ul>
    {selected && <article className="issueReview"><h3>{selected.title}</h3><p>State: {selected.status} · Sources checked {selected.source_snapshot.checkedAt || 'Unavailable'} · {selected.source_snapshot.sourceState}</p>
      <label>Full edition text<textarea rows={16} value={draft} readOnly={selected.status !== 'draft'} onChange={e => setDraft(e.target.value)} /></label>
      <h4>Review the source records</h4><ul>{(selected.source_snapshot.events ?? []).map((event, index) => <li key={event.id || index}><a href={event.sourceUrl} target="_blank" rel="noreferrer">{event.title} ↗</a></li>)}</ul>
      {selected.status === 'draft' && <><button disabled={busy} onClick={() => action('/api/studio/newsletter/issue', 'PATCH', { id: selected.id, updatedAt: selected.updated_at, bodyText: draft }, 'Draft saved.')}>Save draft text</button><button disabled={busy || draft !== toText(selected)} onClick={() => move('review')}>Submit saved text for review</button></>}
      {selected.status === 'review' && <><button disabled={busy} onClick={() => move('draft')}>Return to draft</button>{canEdit && <><label>Editorial review notes<textarea rows={4} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Record source checks, financial-claim review and any corrections." /></label><button disabled={busy || notes.trim().length < 20} onClick={() => move('approved')}>Approve this reviewed edition</button></>}</>}
      {selected.status === 'approved' && canEdit && <><button disabled={busy} onClick={() => move('draft')}>Reopen as draft</button><button disabled={busy} onClick={() => move('published')}>Publish reviewed edition</button></>}
      {selected.status === 'published' && canEdit && <><button disabled={busy} onClick={() => action('/api/studio/newsletter/queue', 'POST', { issueId: selected.id }, 'Queue prepared; no emails sent.')}>Prepare consented delivery queue</button><button disabled={busy} onClick={() => action('/api/studio/newsletter/deliver', 'POST', { issueId: selected.id, confirmDelivery: true }, 'Delivery batch processed. Check the delivery ledger for provider acceptance.')}>Send next batch of this edition</button></>}
      {canEdit && <><h4>Delivery ledger</h4><p>“Sent” means the provider accepted the message. It does not prove inbox delivery.</p>{selected.newsletter_deliveries?.length ? <ul>{selected.newsletter_deliveries.map(row => <li key={row.id}>{row.status} · {row.attempts} attempts · {row.provider_message_id || row.last_error || 'Waiting'}</li>)}</ul> : <p>No deliveries queued.</p>}</>}
    </article>}
  </section>
}
