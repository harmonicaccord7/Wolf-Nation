'use client'
import { FormEvent, useState } from 'react'
import { createClient } from '../lib/supabase/client'
export function NewsletterForm(){
 const [status,setStatus]=useState(''); const [busy,setBusy]=useState(false)
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setStatus('');const form=e.currentTarget;const email=String(new FormData(form).get('email')||'').trim().toLowerCase();const supabase=createClient();const {error}=await supabase.from('newsletter_subscribers').insert({email,status:'pending',source:'website_footer',consent_at:new Date().toISOString()});if(error&&error.code!=='23505')setStatus('Could not subscribe right now.');else{setStatus('You’re on the list. Confirmation workflow is the next email-layer step.');form.reset()}setBusy(false)}
 return <div><form onSubmit={submit}><input name="email" type="email" placeholder="you@example.com" aria-label="Email address" required/><button className="goldButton" disabled={busy}>{busy?'Joining…':'Join free'}</button></form>{status&&<small className="newsletterStatus">{status}</small>}</div>
}
