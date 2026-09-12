import assert from 'node:assert/strict'
import { renderEdition, sendEdition } from '../lib/newsletter-delivery.ts'
const fixture={delivery_id:'test-delivery',issue_key:'test-issue',title:'QA <script>fixture</script>',body:{blocks:[{type:'paragraph',text:'A source-backed educational test <img onerror=alert(1)>'}]},email:'recipient@example.test',unsubscribe_token:'a'.repeat(64),attempt:1}
const rendered=renderEdition(fixture)
assert.ok(!rendered.html.includes('<script>'))
assert.ok(!rendered.html.includes('<img'))
assert.ok(rendered.text.includes('/newsletter/unsubscribe?token=d.'))
const calls=[]
const provider=async(url,options)=>{calls.push({url,...options});return new Response(JSON.stringify({id:'provider-test-id'}),{status:200})}
assert.equal((await sendEdition(fixture,'test-key','Test <test@example.test>',provider)).accepted,true)
await sendEdition({...fixture,attempt:2},'test-key','Test <test@example.test>',provider)
assert.equal(calls[0].body,calls[1].body,'retry must use exactly the same payload')
assert.equal(calls[0].headers['Idempotency-Key'],calls[1].headers['Idempotency-Key'])
assert.deepEqual(JSON.parse(calls[0].body).to,['recipient@example.test'])
assert.equal((await sendEdition(fixture,'test-key','Test',async()=>new Response('{}',{status:429}))).retryable,true)
assert.equal((await sendEdition(fixture,'test-key','Test',async()=>new Response('{}',{status:422}))).retryable,false)
assert.equal((await sendEdition(fixture,'test-key','Test',async()=>{throw new Error('timeout')})).error,'provider_response_uncertain')
console.log('Newsletter QA passed: escaped edition, unsubscribe link, stable retry body/key, one recipient, rate limits, permanent errors and uncertain delivery. No email sent.')
