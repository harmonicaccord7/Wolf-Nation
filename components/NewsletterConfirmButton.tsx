'use client'

import Link from 'next/link'
import { useState } from 'react'

export function NewsletterConfirmButton({token}:{token:string}){
  const [busy,setBusy]=useState(false)
  const [status,setStatus]=useState<'idle'|'confirmed'|'error'>('idle')
  async function confirm(){
    if(busy) return
    setBusy(true)
    try{
      const response=await fetch('/api/newsletter/confirm',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})})
      const data=await response.json().catch(()=>({})) as {ok?:boolean}
      setStatus(response.ok&&data.ok?'confirmed':'error')
    }catch{setStatus('error')}
    finally{setBusy(false)}
  }
  if(status==='confirmed') return <div className="authStatus"><strong>Subscription confirmed.</strong><p>Your address is now active for the KAPORAL Market Letter.</p><Link href="/">Return home →</Link></div>
  return <div className="authConfirmAction"><button className="goldButton big" type="button" onClick={confirm} disabled={busy}>{busy?'Confirming…':'Confirm Market Letter'}</button>{status==='error'&&<div className="authStatus" role="status"><p>This confirmation token is invalid or expired. Submit your address again from the website to request a fresh email.</p><Link href="/#newsletter">Request a new confirmation →</Link></div>}</div>
}
