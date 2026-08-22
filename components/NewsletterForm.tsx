'use client'
import { FormEvent, useState } from 'react'

export function NewsletterForm(){
 const [status,setStatus]=useState(''); const [busy,setBusy]=useState(false)
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setStatus('');const form=e.currentTarget;const fd=new FormData(form);const email=String(fd.get('email')||'').trim().toLowerCase();const website=String(fd.get('website')||'');try{const res=await fetch('/api/newsletter/subscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,website})});const data=await res.json();setStatus(res.ok?(data.message||'Check your inbox to confirm.'):(data.error||'Could not subscribe right now.'));if(res.ok)form.reset()}catch{setStatus('Could not subscribe right now.')}finally{setBusy(false)}}
 return <div className="newsletterBlock"><form className="newsletterForm" onSubmit={submit}><input name="email" type="email" placeholder="you@example.com" aria-label="Email address" required/><input className="newsletterHoneypot" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true"/><button className="goldButton" disabled={busy}>{busy?'Joining…':'Join free'}</button></form>{status&&<small className="newsletterStatus" role="status">{status}</small>}</div>
}
