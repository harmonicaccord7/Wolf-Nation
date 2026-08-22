'use client'
import { useState } from 'react'
import { createClient } from '../lib/supabase/client'

export function AccountActions(){
  const [busy,setBusy]=useState(false)
  async function signOut(){
    setBusy(true)
    const supabase=createClient()
    await supabase.auth.signOut()
    location.href='/'
  }
  return <button className="outlineButton" type="button" onClick={signOut} disabled={busy}>{busy?'Signing out…':'Sign out'}</button>
}
