'use client'

import { FormEvent, useState } from 'react'

export function ContactForm(){
  const [busy,setBusy]=useState(false)
  const [status,setStatus]=useState('')
  const [reference,setReference]=useState('')

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault()
    if(busy) return
    setBusy(true);setStatus('');setReference('')
    const form=event.currentTarget
    const fd=new FormData(form)
    const payload={
      name:String(fd.get('name')||'').trim(),
      email:String(fd.get('email')||'').trim(),
      subject:String(fd.get('subject')||'').trim(),
      message:String(fd.get('message')||'').trim(),
      website:String(fd.get('website')||'').trim()
    }
    try{
      const response=await fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
      const data=await response.json().catch(()=>({})) as {ok?:boolean;error?:string;reference?:string}
      if(!response.ok||!data.ok) throw new Error(data.error||'Unable to send your message right now.')
      form.reset()
      setStatus('Your message has been received by KAPORAL support.')
      setReference(data.reference||'')
    }catch(error){setStatus(error instanceof Error?error.message:'Unable to send your message right now.')}
    finally{setBusy(false)}
  }

  return <form className="contactForm" onSubmit={submit}>
    <div className="contactFormGrid">
      <label>Name<input name="name" required minLength={2} maxLength={120} autoComplete="name"/></label>
      <label>Email<input name="email" type="email" required maxLength={254} inputMode="email" autoComplete="email"/></label>
    </div>
    <label>Subject<input name="subject" required minLength={2} maxLength={160} defaultValue="Website enquiry"/></label>
    <label>Message<textarea name="message" required minLength={10} maxLength={5000} rows={8} placeholder="Tell us what happened and, if relevant, which page or account action you were using."/></label>
    <label className="contactHoneypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off"/></label>
    <button className="goldButton big" disabled={busy} aria-busy={busy}>{busy?'Sending…':'Send message'}</button>
    {status&&<div className="contactStatus" role="status"><strong>{status}</strong>{reference&&<span>Reference: {reference}</span>}</div>}
  </form>
}
