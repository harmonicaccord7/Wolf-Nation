'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
type Preferences = { timezone: string; newsletter_frequency: string; event_alerts: boolean; preferred_assets: string[] }
type Item = { id: string; symbol: string | null; event_id: string | null; economic_events: { slug: string; title: string } | null }
export function PreferencePanel() {
  const [preferences, setPreferences] = useState<Preferences>({ timezone: 'UTC', newsletter_frequency: 'weekly', event_alerts: false, preferred_assets: ['BTC', 'ETH', 'GOLD'] })
  const [items, setItems] = useState<Item[]>([]), [symbol, setSymbol] = useState(''), [status, setStatus] = useState(''), [busy, setBusy] = useState(false)
  async function load() {
    const r = await fetch('/api/account/preferences', { cache: 'no-store' }), body = await r.json()
    if (!r.ok) throw new Error(body.error || 'Workspace unavailable.')
    if (body.preferences) setPreferences(body.preferences)
    setItems((body.watchlists ?? []).flatMap((list: { watchlist_items: Item[] }) => list.watchlist_items))
  }
  useEffect(() => { load().catch(error => setStatus(error.message)) }, [])
  async function change(method: string, payload: unknown, message: string) {
    setBusy(true); setStatus('')
    try {
      const r = await fetch('/api/account/preferences', { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }), body = await r.json()
      if (!r.ok) throw new Error(body.error || 'Could not save.')
      await load(); setStatus(message); setSymbol('')
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Request failed.') } finally { setBusy(false) }
  }
  return <section className="preferencePanel"><span className="eyebrow">PRIVATE WORKSPACE</span><h2>Newsletter preferences & watchlist</h2>
    <p>Your cadence applies to approved editions sent to your verified account email after newsletter confirmation. Saving a preference does not subscribe you or publish an issue.</p>
    <div className="preferenceGrid"><label>Newsletter cadence<select value={preferences.newsletter_frequency} onChange={e => setPreferences({ ...preferences, newsletter_frequency: e.target.value })}><option value="weekly">Weekly</option><option value="weekday">Weekday editions</option><option value="material_event">Material-event editions</option><option value="off">Off</option></select></label>
      <label>Timezone<input value={preferences.timezone} onChange={e => setPreferences({ ...preferences, timezone: e.target.value })} placeholder="Europe/Paris" /></label>
      <label className="checkRow"><input type="checkbox" checked={preferences.event_alerts} onChange={e => setPreferences({ ...preferences, event_alerts: e.target.checked })} />Allow material-event editions</label>
      <button className="goldButton" disabled={busy} onClick={() => change('POST', { timezone: preferences.timezone, newsletterFrequency: preferences.newsletter_frequency, eventAlerts: preferences.event_alerts, preferredAssets: preferences.preferred_assets }, 'Preferences saved.')}>Save preferences</button>
    </div>
    <div className="watchlistAdd"><label>Available asset symbol<input value={symbol} onChange={e => setSymbol(e.target.value)} placeholder="BTC, ETH, GOLD" maxLength={40} /></label><button className="outlineButton" disabled={busy || !symbol.trim()} onClick={() => change('POST', { symbol: symbol.trim().toUpperCase() }, 'Watchlist updated.')}>Add to watchlist</button></div>
    <h3>Saved assets and events</h3>{items.length ? <ul className="savedItems">{items.map(item => <li key={item.id}><Link href={item.symbol ? '/data/' + item.symbol.toLowerCase() : '/events/' + item.economic_events?.slug}>{item.symbol || item.economic_events?.title || 'Saved event'}</Link><button disabled={busy} onClick={() => change('DELETE', { itemId: item.id }, 'Item removed.')} aria-label={'Remove ' + (item.symbol || item.economic_events?.title)}>Remove</button></li>)}</ul> : <p>Your watchlist is empty. Save a chart or an event to find it here.</p>}
    <p className="preferenceStatus" role="status">{status}</p>
  </section>
}
