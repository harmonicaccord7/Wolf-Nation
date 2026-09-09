'use client'
import { FormEvent, useState } from 'react'

export function NewsletterForm(){
 const [status,setStatus]=useState(''); const [busy,setBusy]=useState(false)
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setStatus('');const form=e.currentTarget;const email=String(new FormData(form).get('email')||'').trim().toLowerCase()
  try{
   const response=await fetch('/api/newsletter/subscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email}),cache:'no-store'})
   const data=await response.json().catch(()=>({}))
   if(!response.ok||!data?.ok)throw new Error(data?.error||'subscription_failed')
   if(data.status==='already_confirmed')setStatus('This email is already confirmed for the KAPORAL Market Letter.')
   else if(data.delivery==='sent'||data.delivery==='recently_sent')setStatus('Check your inbox for the KAPORAL confirmation email. You are not subscribed until you confirm.')
   else if(data.delivery==='resend_api_key_missing')setStatus('Your request is pending, but newsletter email delivery still needs its Resend key connected to Supabase. Your address is not subscribed yet.')
   else if(String(data.delivery||'').startsWith('resend_http_'))setStatus('Your request is pending, but the email provider rejected the confirmation message. KAPORAL support is checking the mail configuration; your address is not subscribed yet.')
   else setStatus('Your request is pending. Confirmation delivery is temporarily unavailable, so your address has not been subscribed.')
   form.reset()
  }catch{setStatus('Could not process the newsletter request right now.')}
  finally{setBusy(false)}
 }
 return <div className="newsletterBlock" id="newsletter"><form className="newsletterForm" onSubmit={submit}><input name="email" type="email" placeholder="you@example.com" aria-label="Email address" required/><button className="goldButton" disabled={busy}>{busy?'Joining…':'Join free'}</button></form>{status&&<small className="newsletterStatus" role="status">{status}</small>}<small className="newsletterConsent">Double opt-in: submitting your email creates a pending request only. Subscription starts after confirmation.</small></div>
}
