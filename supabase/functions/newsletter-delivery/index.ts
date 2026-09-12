import { createClient } from 'npm:@supabase/supabase-js@2.112.3'
import { sendEdition, type Delivery } from '../../../lib/newsletter-delivery.ts'
const headers = { 'content-type': 'application/json', 'cache-control': 'no-store' }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers })
Deno.serve(async request => {
  if (request.method !== 'POST') return json({ error: 'POST required' }, 405)
  const input = await request.json().catch(() => null)
  if (!input) return json({ error: 'Invalid request' }, 400)
  const url = Deno.env.get('SUPABASE_URL')!
  const serviceKey = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}').default ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!serviceKey) return json({ error: 'Service unavailable' }, 503)
  const db = createClient(url, serviceKey, { auth: { persistSession: false } })
  // Opaque unsubscribe tokens are the sole authority for this action. They can
  // only suppress delivery; they cannot subscribe, publish, or send anything.
  if (input.action === 'unsubscribe') {
    if (typeof input.token !== 'string' || !/^d\.[a-f0-9]{64}$/.test(input.token)) return json({ ok: false, error: 'invalid_token' }, 400)
    const { data, error } = await db.rpc('unsubscribe_newsletter_delivery', { token_input: input.token.slice(2) })
    return error ? json({ ok: false, error: 'unsubscribe_unavailable' }, 503) : json({ ok: Boolean(data), status: data ? 'unsubscribed' : 'invalid' }, data ? 200 : 400)
  }
  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  const { data: { user }, error: authError } = await db.auth.getUser(bearer)
  if (authError || !user) return json({ error: 'Authentication required' }, 401)
  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (!['editor', 'admin'].includes(profile?.role ?? '')) return json({ error: 'Editor required' }, 403)
  if (input.action === 'health') return json({ ok: true, providerConfigured: Boolean(Deno.env.get('RESEND_API_KEY')) })
  if (input.action !== 'deliver' || input.confirmDelivery !== true || typeof input.issueId !== 'string') return json({ error: 'An explicit issue delivery request is required' }, 400)
  const apiKey = Deno.env.get('RESEND_API_KEY')?.trim() ?? ''
  if (!apiKey) return json({ error: 'Provider not configured; queue unchanged' }, 503)
  const { data: deliveries, error: claimError } = await db.rpc('claim_newsletter_deliveries', { target_issue: input.issueId, batch_size: 3 })
  if (claimError) return json({ error: 'Could not claim delivery queue' }, 503)
  const outcomes: { id: string; status: string }[] = []
  for (const delivery of (deliveries ?? []) as Delivery[]) {
    const { data: eligible, error: consentError } = await db.rpc('newsletter_recipient_eligible', { target_delivery: delivery.delivery_id })
    let patch: Record<string, unknown>
    if (consentError) patch = { status: 'failed', last_error: 'consent_check_unavailable', next_attempt_at: new Date(Date.now() + 300_000).toISOString() }
    else if (!eligible) patch = { status: 'suppressed', last_error: 'consent_or_cadence_changed' }
    else {
      const result = await sendEdition(delivery, apiKey, Deno.env.get('NEWSLETTER_FROM_EMAIL')?.trim() || 'KAPORAL Market Letter <intelligence@kaporalintelligence.com>')
      patch = result.accepted ? { status: 'sent', provider_message_id: result.providerMessageId, sent_at: new Date().toISOString(), last_error: null }
        : { status: 'failed', last_error: result.error, next_attempt_at: result.retryable ? new Date(Date.now() + Math.min(3600, 60 * 2 ** delivery.attempt) * 1000).toISOString() : 'infinity' }
    }
    const { error } = await db.from('newsletter_deliveries').update(patch).eq('id', delivery.delivery_id).eq('status', 'sending').eq('attempts', delivery.attempt)
    outcomes.push({ id: delivery.delivery_id, status: error ? 'persistence_uncertain' : String(patch.status) })
  }
  return json({ ok: !outcomes.some(r => r.status === 'persistence_uncertain'), outcomes, note: 'Sent means accepted by the provider. Inbox delivery requires separate delivery evidence.' })
})
