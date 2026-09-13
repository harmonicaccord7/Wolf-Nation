'use client'
import Link from 'next/link'
import { useMemo, useState, type FormEvent } from 'react'
import { createClient } from '../lib/supabase/client'
import { EMAIL_RE, friendlyAuthError } from '../lib/auth/forms'
export function PasswordRecoveryForm() {
  const db = useMemo(() => createClient(), []), [status, setStatus] = useState(''), [busy, setBusy] = useState(false), [requestedAt, setRequestedAt] = useState(0)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return
    const email = String(new FormData(event.currentTarget).get('email') ?? '').trim().toLowerCase()
    if (!EMAIL_RE.test(email) || email.length > 254) { setStatus('Enter the email address you used for your account.'); return }
    if (Date.now() - requestedAt < 60_000) { setStatus('A reset request was just made. Wait a minute and check your inbox before trying again.'); return }
    setBusy(true); setStatus('')
    try {
      const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.kaporalintelligence.com').replace(/\/$/, '')
      const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo: site + '/auth/confirm?next=/auth/reset-password' })
      if (error) throw error
      setRequestedAt(Date.now())
      setStatus('If this email has a KAPORAL account, a password-reset email is on its way. Check your inbox and spam folder. Open the newest link in the same browser you used here. You do not need to create another account.')
    } catch (error) { setStatus(friendlyAuthError(error as { message?: string; status?: number }).message) }
    finally { setBusy(false) }
  }
  return <div className="authCard"><h2>Send a password-reset email</h2><form onSubmit={submit} noValidate><label>Account email<input name="email" type="email" inputMode="email" required maxLength={254} autoComplete="username" autoCapitalize="none"/></label><button className="goldButton big" disabled={busy}>{busy ? 'Requesting…' : 'Send reset link'}</button></form>{status && <div role="status" className="authStatus"><p>{status}</p></div>}<Link className="authRecoveryLink" href="/auth">Back to sign in</Link><p className="authHint">Your email is your username. For a password saved by Chrome, check Chrome Settings → Google Password Manager and search for KAPORAL. Your device may ask you to unlock it.</p><p className="authFine">Never share a reset link or password. If you cannot access your email, <Link href="/contact">contact support</Link>.</p></div>
}
