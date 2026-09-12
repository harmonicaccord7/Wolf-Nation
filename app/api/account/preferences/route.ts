import { createClient } from '../../../../lib/supabase/server'
import { reply } from '../../../../lib/studio-access'
export const dynamic = 'force-dynamic'
export const revalidate = 0
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export async function GET() {
  const db = await createClient(), { data: { user } } = await db.auth.getUser()
  if (!user) return reply({ error: 'Authentication required' }, 401)
  const [preferences, watchlists] = await Promise.all([
    db.from('reader_preferences').select('timezone,newsletter_frequency,event_alerts,preferred_assets').eq('profile_id', user.id).maybeSingle(),
    db.from('watchlists').select('id,name,watchlist_items(id,symbol,event_id,economic_events(slug,title))').eq('profile_id', user.id).order('created_at', { ascending: true }),
  ])
  if (preferences.error || watchlists.error) return reply({ error: 'Reader workspace unavailable.' }, 503)
  return reply({ preferences: preferences.data, watchlists: watchlists.data ?? [] })
}
export async function POST(request: Request) {
  const db = await createClient(), { data: { user } } = await db.auth.getUser()
  if (!user) return reply({ error: 'Authentication required' }, 401)
  const body = await request.json().catch(() => null)
  if (!body || Array.isArray(body)) return reply({ error: 'Invalid request.' }, 400)
  if (body.symbol !== undefined || body.eventId !== undefined) {
    if ((body.symbol !== undefined) === (body.eventId !== undefined)) return reply({ error: 'Save one asset or one event at a time.' }, 400)
    const symbol = typeof body.symbol === 'string' ? body.symbol.trim().toUpperCase() : null
    const eventId = typeof body.eventId === 'string' && uuid.test(body.eventId) ? body.eventId : null
    if (symbol) {
      if (!/^[A-Z0-9._-]{1,40}$/.test(symbol)) return reply({ error: 'Invalid symbol.' }, 400)
      if (!['BTC', 'ETH', 'SOL'].includes(symbol)) {
        const { data, error } = await db.from('data_series').select('id').eq('code', symbol).eq('is_public', true).maybeSingle()
        if (error) return reply({ error: 'Could not verify the asset.' }, 503)
        if (!data) return reply({ error: 'Choose an available KAPORAL data symbol.' }, 400)
      }
    } else if (eventId) {
      const { data, error } = await db.from('economic_events').select('id').eq('id', eventId).maybeSingle()
      if (error || !data) return reply({ error: 'This event is not available to save.' }, 409)
    } else return reply({ error: 'Valid asset or event required.' }, 400)
    const made = await db.from('watchlists').upsert({ profile_id: user.id, name: 'My watchlist' }, { onConflict: 'profile_id,name', ignoreDuplicates: true })
    if (made.error) return reply({ error: 'Could not create watchlist.' }, 503)
    const { data: list, error: listError } = await db.from('watchlists').select('id').eq('profile_id', user.id).eq('name', 'My watchlist').single()
    if (listError) return reply({ error: 'Could not load watchlist.' }, 503)
    const saved = await db.from('watchlist_items').insert({ watchlist_id: list.id, symbol, event_id: eventId })
    return saved.error && saved.error.code !== '23505' ? reply({ error: 'Could not save item.' }, 503) : reply({ ok: true })
  }
  if (!['weekly', 'weekday', 'material_event', 'off'].includes(body.newsletterFrequency) || typeof body.eventAlerts !== 'boolean') return reply({ error: 'Valid cadence and alert preference required.' }, 400)
  if (typeof body.timezone !== 'string' || body.timezone.length > 80) return reply({ error: 'Provide an IANA timezone, such as Europe/Paris.' }, 400)
  try { new Intl.DateTimeFormat('en', { timeZone: body.timezone }).format() } catch { return reply({ error: 'Unknown timezone. Use an IANA name such as Europe/Paris.' }, 400) }
  const assets = body.preferredAssets ?? ['BTC', 'ETH', 'GOLD']
  if (!Array.isArray(assets) || assets.length > 20 || assets.some((v: unknown) => typeof v !== 'string' || !/^[A-Z0-9._-]{1,40}$/.test(v))) return reply({ error: 'Invalid preferred assets.' }, 400)
  const saved = await db.from('reader_preferences').upsert({ profile_id: user.id, timezone: body.timezone, newsletter_frequency: body.newsletterFrequency, event_alerts: body.eventAlerts, preferred_assets: assets, updated_at: new Date().toISOString() })
  return saved.error ? reply({ error: 'Could not save preferences.' }, 503) : reply({ ok: true })
}
export async function DELETE(request: Request) {
  const db = await createClient(), { data: { user } } = await db.auth.getUser()
  if (!user) return reply({ error: 'Authentication required' }, 401)
  const body = await request.json().catch(() => null)
  if (typeof body?.itemId !== 'string' || !uuid.test(body.itemId)) return reply({ error: 'Valid item id required.' }, 400)
  const result = await db.from('watchlist_items').delete().eq('id', body.itemId).select('id')
  if (result.error) return reply({ error: 'Could not remove item.' }, 503)
  return result.data?.length ? reply({ ok: true }) : reply({ error: 'Saved item not found.' }, 404)
}
