'use client'
import Link from 'next/link'
import { useState } from 'react'
export function SaveToWatchlist({ symbol, eventId }: { symbol?: string; eventId?: string }) {
  const [status, setStatus] = useState(''), [busy, setBusy] = useState(false), [signIn, setSignIn] = useState(false)
  async function save() {
    setBusy(true)
    try {
      const r = await fetch('/api/account/preferences', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(symbol ? { symbol } : { eventId }) })
      const body = await r.json()
      if (r.status === 401) { setSignIn(true); return }
      if (!r.ok) throw new Error(body.error || 'Could not save.')
      setStatus('Saved to your watchlist.')
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Could not save.') } finally { setBusy(false) }
  }
  return <div className="saveWatchlist"><button className="outlineButton" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save to watchlist'}</button>{signIn && <Link href="/auth">Sign in to save</Link>}<span role="status">{status}</span></div>
}
