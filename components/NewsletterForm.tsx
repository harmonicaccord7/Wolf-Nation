'use client'
import { FormEvent, useId, useState } from 'react'
export function NewsletterForm(){
 const id=useId(),[status,setStatus]=useState(''),[busy,setBusy]=useState(false),[email,setEmail]=useState(''),[canResend,setCanResend]=useState(false)
 async function request(resend=false){
  if(busy)return
  setBusy(true);setStatus('');setCanResend(false)
  try{
   const response=await fetch('/api/newsletter/subscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:email.trim().toLowerCase(),resend}),cache:'no-store'})
   const data=await response.json().catch(()=>({}))
   if(!response.ok||!data?.ok)throw new Error('subscription_failed')
   if(data.status==='already_confirmed')setStatus('This email is already subscribed to the KAPORAL Market Letter. No duplicate subscription was created. Use another email only if you want a separate subscription.')
   else if(data.status==='delivery_blocked')setStatus('We cannot deliver to this email right now. Please use another address you own or contact support.')
   else if(data.status==='already_pending'){setStatus('This email already has a pending subscription. Open the confirmation email to finish. No second subscription was created.');setCanResend(true)}
   else if(data.delivery==='cooldown'){setStatus('A confirmation request was made recently. Check your inbox or wait 10 minutes before requesting another.');setCanResend(true)}
   else if(data.delivery==='sent'||data.delivery==='recently_sent'){setStatus('Check your inbox for the KAPORAL confirmation email. Click Confirm Market Letter to subscribe. No password or website account is needed.');setCanResend(true)}
   else {setStatus('Confirmation email delivery is temporarily unavailable. You have not been subscribed. Please try again later or contact support.');setCanResend(true)}
  }catch{setStatus('Could not process your request right now. Please try again. Your subscription has not been confirmed.')}
  finally{setBusy(false)}
 }
 async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();await request()}
 return <div className="newsletterBlock" id="newsletter"><p className="newsletterEmailOnly"><b>Email only. No password or account required.</b></p><form className="newsletterForm" aria-label="Newsletter subscription" onSubmit={submit}><label className="srOnly" htmlFor={id}>Email address</label><input id={id} name="email" type="email" placeholder="you@example.com" maxLength={254} inputMode="email" autoComplete="email" autoCapitalize="none" value={email} onChange={event=>{setEmail(event.target.value);setStatus('');setCanResend(false)}} required/><button className="goldButton" disabled={busy}>{busy?'Requesting…':'Subscribe free'}</button></form>{status&&<small className="newsletterStatus" role="status">{status}</small>}{canResend&&<button type="button" className="newsletterResend" disabled={busy} onClick={()=>request(true)}>Resend confirmation email</button>}<small className="newsletterConsent">We send updates only after you confirm your email. You can unsubscribe at any time. Someone entering your address cannot access your inbox or your account.</small></div>
}
