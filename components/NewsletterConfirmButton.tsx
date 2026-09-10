'use client'

import Link from 'next/link'
import { useState } from 'react'

export function NewsletterConfirmButton({token}:{token:string}){
  const [busy,setBusy]=useState(false)
  const [status,setStatus]=useState<'idle'|'confirmed'|'error'>('idle')
  const [invalidLink,setInvalidLink]=useState(false)

  async function confirm(){
    if(busy)return
    setBusy(true);setStatus('idle');setInvalidLink(false)
    try{
      const response=await fetch('/api/newsletter/confirm',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token}),cache:'no-store'})
      const data=await response.json().catch(()=>({})) as {ok?:boolean;status?:string;error?:string}
      setInvalidLink(data.status==='invalid'||data.status==='invalid_or_expired'||data.error==='invalid_token')
      setStatus(response.ok&&data.ok?'confirmed':'error')
    }catch{setStatus('error')}
    finally{setBusy(false)}
  }

  if(status==='confirmed')return <div className="authStatus"><strong>Subscription confirmed.</strong><p>Your address is now active for the KAPORAL Market Letter.</p><Link href="/">Return home →</Link></div>

  return <div className="authConfirmAction"><button className="goldButton big" type="button" onClick={confirm} disabled={busy} aria-busy={busy}>{busy?'Confirming…':'Confirm Market Letter'}</button>{status==='error'&&<div className="authStatus" role="status"><p>{invalidLink?'This confirmation token is invalid or expired. Submit your address again to request a fresh email.':'We could not confirm your subscription right now. Please try this button again in a moment.'}</p>{invalidLink&&<Link href="/#newsletter">Request a new confirmation →</Link>}</div>}</div>
}
