'use client'
import Link from 'next/link'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { createClient } from '../lib/supabase/client'
import { PasswordField } from './PasswordField'
import { friendlyAuthError, newPasswordError, NEW_PASSWORD_MIN } from '../lib/auth/forms'
export function ResetPasswordForm() {
  const db = useMemo(() => createClient(), []), [ready, setReady] = useState(false), [checked, setChecked] = useState(false), [busy, setBusy] = useState(false), [status, setStatus] = useState(''), [done, setDone] = useState(false), [email, setEmail] = useState('')
  useEffect(() => {
    let mounted = true
    db.auth.getUser().then(({ data, error }) => { if (mounted) { setReady(!error && Boolean(data.user)); setEmail(data.user?.email ?? ''); setChecked(true) } }).catch(() => { if (mounted) setChecked(true) })
    return () => { mounted = false }
  }, [db])
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy || !ready) return
    const form = event.currentTarget, data = new FormData(form), password = String(data.get('password') ?? '')
    const error = newPasswordError(password, String(data.get('confirmPassword') ?? ''))
    if (error) { setStatus(error); return }
    setBusy(true); setStatus('')
    try {
      const { error } = await db.auth.updateUser({ password }); if (error) throw error
      form.reset(); setDone(true); setReady(false)
      const { error: signOutError } = await db.auth.signOut({ scope: 'global' })
      setStatus(signOutError ? 'Your password has changed. We could not confirm sign-out on other devices. Contact support if you suspect access by someone else.' : 'Your password has changed. Sign in with your new password. Other sessions have been signed out; existing access tokens may remain valid briefly until they expire.')
    } catch (error) { setStatus(friendlyAuthError(error as { message?: string; status?: number; code?: string }).message) }
    finally { setBusy(false) }
  }
  return <div className="authCard"><h2>Choose a new password</h2>{!checked ? <p role="status">Checking your reset session…</p> : ready ? <form onSubmit={submit} noValidate><label>Account email<input name="email" type="email" autoComplete="username" readOnly value={email}/></label><PasswordField name="password" label="New password" minLength={NEW_PASSWORD_MIN} autoComplete="new-password"/><PasswordField name="confirmPassword" label="Confirm new password" minLength={NEW_PASSWORD_MIN} autoComplete="new-password"/><p className="authHint">Use at least 12 characters. Choose a unique password or accept your password manager’s suggestion. Save it before signing out.</p><button className="goldButton big" disabled={busy}>{busy ? 'Saving…' : 'Save new password'}</button></form> : !done && <p role="status">A valid reset link or signed-in account is required. Your link may have expired, been used already, or opened in a different browser. Request a fresh link below.</p>}{status && <div className="authStatus" role="status"><p>{status}</p></div>}<Link className="authRecoveryLink" href={done ? '/auth' : '/auth/forgot-password'}>{done ? 'Sign in with your new password' : 'Request a new reset link'}</Link></div>
}
