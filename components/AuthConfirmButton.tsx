'use client'

import type { EmailOtpType } from '@supabase/supabase-js'
import { useMemo, useState } from 'react'
import { createClient } from '../lib/supabase/client'

export function AuthConfirmButton({tokenHash,type,next}:{tokenHash:string;type:EmailOtpType;next:string}){
  const [busy,setBusy]=useState(false)
  const [status,setStatus]=useState('')
  const supabase=useMemo(()=>createClient(),[])

  async function confirm(){
    if(busy) return
    setBusy(true);setStatus('')
    try{
      const {data,error}=await supabase.auth.verifyOtp({token_hash:tokenHash,type})
      if(error) throw error
      if(data.user){
        const email=data.user.email??''
        await supabase.from('profiles').upsert({id:data.user.id,display_name:email?email.split('@')[0]:'reader',role:'reader'},{onConflict:'id'}).then(()=>{})
      }
      location.replace(next)
    }catch(error){
      const message=error instanceof Error?error.message.toLowerCase():''
      if(message.includes('expired')||message.includes('invalid')) setStatus('This confirmation link is invalid or expired. Return to Sign in / Create account and request a new confirmation email. Only the newest link should be used.')
      else setStatus('We could not confirm this account right now. Please try once more, then contact support if the problem continues.')
      setBusy(false)
    }
  }

  return <div className="authConfirmAction">
    <button className="goldButton big" type="button" onClick={confirm} disabled={busy} aria-busy={busy}>{busy?'Confirming…':'Confirm KAPORAL account'}</button>
    {status&&<p className="authStatus" role="status">{status}</p>}
  </div>
}
