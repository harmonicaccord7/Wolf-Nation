'use client'
import { FormEvent, useState } from 'react'
import { createClient } from '../lib/supabase/client'

export function AuthForm(){
  const [mode,setMode]=useState<'signin'|'signup'>('signin')
  const [status,setStatus]=useState('')
  const [busy,setBusy]=useState(false)
  const supabase=createClient()
  async function destination(userId:string){
    const {data:profile}=await supabase.from('profiles').select('role').eq('id',userId).maybeSingle()
    return profile&&['researcher','editor','admin'].includes(profile.role)?'/studio':'/account'
  }
  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault(); setBusy(true); setStatus('')
    const fd=new FormData(e.currentTarget); const email=String(fd.get('email')||'').trim(); const password=String(fd.get('password')||'')
    try{
      if(mode==='signup'){
        const {data,error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:`${location.origin}/auth`}})
        if(error) throw error
        if(data.user && data.session){
          await supabase.from('profiles').insert({id:data.user.id,display_name:email.split('@')[0],role:'reader'}).then(()=>{})
          location.href='/account'; return
        }
        setStatus('Check your email to confirm your account, then sign in.')
      }else{
        const {data,error}=await supabase.auth.signInWithPassword({email,password}); if(error) throw error
        if(data.user){
          await supabase.from('profiles').insert({id:data.user.id,display_name:email.split('@')[0],role:'reader'}).then(()=>{})
          location.href=await destination(data.user.id)
        }
      }
    }catch(err:any){setStatus(err?.message||'Authentication failed.')}
    finally{setBusy(false)}
  }
  return <div className="authCard"><div className="authTabs"><button type="button" className={mode==='signin'?'active':''} onClick={()=>setMode('signin')}>Sign in</button><button type="button" className={mode==='signup'?'active':''} onClick={()=>setMode('signup')}>Create account</button></div><form onSubmit={submit}><label>Email<input name="email" type="email" required autoComplete="email"/></label><label>Password<input name="password" type="password" minLength={8} required autoComplete={mode==='signin'?'current-password':'new-password'}/></label><button className="goldButton big" disabled={busy}>{busy?'Working…':mode==='signin'?'Sign in':'Create free account'}</button></form>{status&&<p className="authStatus">{status}</p>}<p className="authFine">Reader accounts can bookmark and personalize. Research Studio access requires an approved researcher/editor role.</p></div>
}
