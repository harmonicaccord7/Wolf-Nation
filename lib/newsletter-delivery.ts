export type Delivery = { delivery_id: string; issue_key: string; title: string; body: { blocks?: { type: string; text?: string; items?: string[] }[] }; email: string; unsubscribe_token: string; attempt: number }
const SITE = 'https://www.kaporalintelligence.com'
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!))
export function renderEdition(delivery: Delivery) {
  const archive = SITE + '/newsletter/' + encodeURIComponent(delivery.issue_key)
  const unsubscribe = SITE + '/newsletter/unsubscribe?token=d.' + encodeURIComponent(delivery.unsubscribe_token)
  const blocks = delivery.body.blocks ?? []
  const text = blocks.map(block => block.text ?? (block.items ?? []).join('\n')).join('\n\n')
  const html = blocks.map(block => block.type === 'bullet_list' ? '<ul>' + (block.items ?? []).map(item => '<li>' + escapeHtml(item) + '</li>').join('') + '</ul>' : '<' + (block.type === 'heading' ? 'h2' : 'p') + '>' + escapeHtml(block.text ?? '') + '</' + (block.type === 'heading' ? 'h2' : 'p') + '>').join('')
  return {
    subject: delivery.title,
    text: text + '\n\nEdition and sources: ' + archive + '\n\nUnsubscribe: ' + unsubscribe,
    html: '<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;line-height:1.65;color:#142d3c"><p>KAPORAL MARKET LETTER</p><h1>' + escapeHtml(delivery.title) + '</h1>' + html + '<p><a href="' + archive + '">Read the edition and sources</a></p><p><a href="' + unsubscribe + '">Unsubscribe</a></p></div>',
    headers: { 'List-Unsubscribe': '<' + unsubscribe + '>' },
  }
}
export async function sendEdition(delivery: Delivery, apiKey: string, from: string, send: typeof fetch = fetch) {
  if (!apiKey || !from) throw new Error('Email provider configuration missing')
  const payload = { from, to: [delivery.email], ...renderEdition(delivery) }
  try {
    const response = await send('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json', 'Idempotency-Key': 'kaporal-edition/' + delivery.delivery_id },
      body: JSON.stringify(payload), signal: AbortSignal.timeout(12_000),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) return { accepted: false, retryable: response.status === 429 || response.status >= 500, error: 'provider_http_' + response.status }
    if (typeof result.id !== 'string') return { accepted: false, retryable: true, error: 'provider_response_uncertain' }
    return { accepted: true, retryable: false, providerMessageId: result.id }
  } catch { return { accepted: false, retryable: true, error: 'provider_response_uncertain' } }
}
