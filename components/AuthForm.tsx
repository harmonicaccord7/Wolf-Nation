'use client'

import Link from 'next/link'
import { FormEvent, useMemo, useState } from 'react'
import { createClient } from '../lib/supabase/client'

type Mode='signin'|'signup'

type AuthErrorLike={message?:string;status?:number;code?:string}

const EMAIL_RE=/^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SIGNUP_COOLDOWN_MS=60_000

function friendlyAuthError(error:AuthErrorLike){
  const message=String(error?.message??'').toLowerCase()
  if(error?.status===429||message.includes('rate limit')||message.includes('too many')) return {message:'Too many authentication emails were requested in a short period. Wait a few minutes before trying again. If this keeps happening, contact support.',rateLimited:true}
  if(message.includes('invalid login credentials')) return {message:'The email or password is incorrect.',rateLimited:false}
  if(message.includes('email not confirmed')) return {message:'Your email address still needs to be confirmed. Open the confirmation email before signing in.',rateLimited:false}
  if(message.includes('user already registered')||message.includes('already been registered')) return {message:'An account already exists for this email. Try signing in instead.',rateLimited:false}
  return {message:error?.message||'Authentication failed. Please try again.',rateLimited:false}
}

export function AuthForm(){
  const [mode,setMode]=useState<Mode>('signin')
  const [status,setStatus]=useState('')
  const [busy,setBusy]=useState(false)
  const [rateLimited,setRateLimited]=useState(false)
  const supabase=useMemo(()=>createClient(),[])

  async function destination(userId:string){
    const {data:profile}=await supabase.from('profiles').select('role').eq('id',userId).maybeSingle()
    return profile&&['researcher','editor','admin'].includes(profile.role)?'/studio':'/account'
  }

  function switchMode(next:Mode){setMode(next);setStatus('');setRateLimited(false)}

  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault()
    if(busy) return
    setStatus('');setRateLimited(false)
    const form=e.currentTarget
    const fd=new FormData(form)
    const email=String(fd.get('email')||'').trim().toLowerCase()
    const password=String(fd.get('password')||'')
    const confirmPassword=String(fd.get('confirmPassword')||'')

    if(!EMAIL_RE.test(email)){setStatus('Enter a valid email address.');return}
    if(password.length<10){setStatus('Use at least 10 characters for your password.');return}
    if(mode==='signup'&&password!==confirmPassword){setStatus('The two passwords do not match.');return}

    if(mode==='signup'){
      const key=`kaporal-signup-cooldown:${email}`
      const last=Number(localStorage.getItem(key)||0)
      const remaining=SIGNUP_COOLDOWN_MS-(Date.now()-last)
      if(remaining>0){setStatus(`A confirmation request was just sent. Wait ${Math.ceil(remaining/1000)} seconds before requesting another.`);return}
    }

    setBusy(true)
    try{
      if(mode==='signup'){
        const {data,error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:`${location.origin}/auth?confirmed=1`}})
        if(error) throw error
        localStorage.setItem(`kaporal-signup-cooldown:${email}`,String(Date.now()))
        if(data.user&&data.session){
          await supabase.from('profiles').insert({id:data.user.id,display_name:email.split('@')[0],role:'reader'}).then(()=>{})
          location.href='/account';return
        }
        form.reset()
        setStatus('Account request received. Check your inbox for the confirmation email before signing in.')
      }else{
        const {data,error}=await supabase.auth.signInWithPassword({email,password})
        if(error) throw error
        if(data.user){
          await supabase.from('profiles').insert({id:data.user.id,display_name:email.split('@')[0],role:'reader'}).then(()=>{})
          location.href=await destination(data.user.id)
        }
      }
    }catch(raw){
      const mapped=friendlyAuthError(raw as AuthErrorLike)
      setStatus(mapped.message);setRateLimited(mapped.rateLimited)
    }finally{setBusy(false)}
  }

  return <div className="authCard">
    <div className="authTabs"><button type="button" className={mode==='signin'?'active':''} onClick={()=>switchMode('signin')}>Sign in</button><button type="button" className={mode==='signup'?'active':''} onClick={()=>switchMode('signup')}>Create account</button></div>
    <form onSubmit={submit} noValidate>
      <label>Email<input name="email" type="email" required inputMode="email" autoCapitalize="none" autoComplete="email"/></label>
      <label>Password<input name="password" type="password" minLength={10} required autoComplete={mode==='signin'?'current-password':'new-password'}/></label>
      {mode==='signup'&&<label>Confirm password<input name="confirmPassword" type="password" minLength={10} required autoComplete="new-password"/></label>}
      {mode==='signup'&&<p className="authHint">Use at least 10 characters. Submit once, then wait for the confirmation email instead of repeatedly requesting new messages.</p>}
      <button className="goldButton big" disabled={busy} aria-busy={busy}>{busy?'Working…':mode==='signin'?'Sign in':'Create free account'}</button>
    </form>
    {status&&<div className="authStatus" role="status"><p>{status}</p>{rateLimited&&<Link href="/contact">Contact support →</Link>}</div>}
    <p className="authFine">Reader accounts can bookmark and personalize. Research Studio access requires an approved researcher/editor role.</p>
  </div>
}
