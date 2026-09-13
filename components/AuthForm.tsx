'use client'

import Link from 'next/link'
import { FormEvent, useMemo, useState } from 'react'
import { createClient } from '../lib/supabase/client'
import { PasswordField } from './PasswordField'
import { accountExistsMessage, newPasswordError, NEW_PASSWORD_MIN } from '../lib/auth/forms'

type Mode='signin'|'signup'
type AuthErrorLike={message?:string;status?:number;code?:string}

const EMAIL_RE=/^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SIGNUP_COOLDOWN_MS=60_000
const SITE_URL=(process.env.NEXT_PUBLIC_SITE_URL||'https://www.kaporalintelligence.com').replace(/\/$/,'')

function friendlyAuthError(error:AuthErrorLike){
  const message=String(error?.message??'').toLowerCase()
  if(error?.status===429||message.includes('rate limit')||message.includes('too many')) return {message:'Too many authentication emails were requested in a short period. Wait a few minutes before trying again. If this keeps happening, contact support.',rateLimited:true}
  if(message.includes('invalid login credentials')) return {message:'The email or password is incorrect.',rateLimited:false}
  if(message.includes('email not confirmed')) return {message:'Your email address still needs to be confirmed. Open the newest confirmation email before signing in.',rateLimited:false}
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
    if(mode==='signin'&&!password){setStatus('Enter your password.');return}
    if(mode==='signup'){const validation=newPasswordError(password,confirmPassword);if(validation){setStatus(validation);return}}

    if(mode==='signup'){
      const key=`kaporal-signup-cooldown:${email}`
      const last=Number(localStorage.getItem(key)||0)
      const remaining=SIGNUP_COOLDOWN_MS-(Date.now()-last)
      if(remaining>0){setStatus(`A confirmation request was just sent. Wait ${Math.ceil(remaining/1000)} seconds before requesting another.`);return}
    }

    setBusy(true)
    try{
      if(mode==='signup'){
        const confirmationUrl=`${SITE_URL}/auth/confirm?next=/account`
        const {data,error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:confirmationUrl}})
        if(error) throw error
        if(data.user?.identities?.length===0){setStatus(accountExistsMessage);return}
        localStorage.setItem(`kaporal-signup-cooldown:${email}`,String(Date.now()))
        if(data.user&&data.session){
          await supabase.from('profiles').insert({id:data.user.id,display_name:email.split('@')[0],role:'reader'}).then(()=>{})
          location.href='/account';return
        }
        form.reset()
        setStatus('Check your inbox to confirm your account. If this email already belongs to an account, sign in or use Forgot password. Submitting again does not create another account.')
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
      <label>Email<input name="email" type="email" required maxLength={254} inputMode="email" autoCapitalize="none" autoComplete="username"/></label>
      <PasswordField key={mode} name="password" minLength={mode==='signup'?NEW_PASSWORD_MIN:undefined} autoComplete={mode==='signin'?'current-password':'new-password'}/>
      {mode==='signup'&&<PasswordField name="confirmPassword" label="Confirm password" minLength={NEW_PASSWORD_MIN} autoComplete="new-password"/>}
      {mode==='signup'&&<p className="authHint">Use at least 12 characters and a password you do not use elsewhere. Accept your browser’s strong-password suggestion or choose your own, then save it in your password manager.</p>}
      <button className="goldButton big" disabled={busy} aria-busy={busy}>{busy?'Working…':mode==='signin'?'Sign in':'Create free account'}</button>
    </form>
    <Link className="authRecoveryLink" href="/auth/forgot-password">Forgot password?</Link>
    <p className="authHint">Your email is your username. To receive email updates only, <Link href="/newsletter#newsletter-signup">subscribe to the newsletter with just your email</Link>.</p>
    {status&&<div className="authStatus" role="status"><p>{status}</p>{rateLimited&&<Link href="/contact">Contact support →</Link>}</div>}
    <p className="authFine">Reader accounts can bookmark and personalize. Research Studio access requires an approved researcher/editor role.</p>
  </div>
}
