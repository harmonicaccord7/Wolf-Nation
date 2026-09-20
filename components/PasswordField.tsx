'use client'
import { useId, useState } from 'react'
export function PasswordField({ name, label = 'Password', autoComplete, minLength }: { name: string; label?: string; autoComplete: 'current-password' | 'new-password'; minLength?: number }) {
  const id = useId(), [visible, setVisible] = useState(false)
  return <div className="passwordField"><label htmlFor={id}>{label}</label><div className="passwordInputWrap"><input id={id} name={name} type={visible ? 'text' : 'password'} required minLength={minLength} maxLength={128} autoComplete={autoComplete} autoCapitalize="none" spellCheck={false}/><button type="button" className="passwordToggle" aria-controls={id} aria-label={(visible ? 'Hide ' : 'Show ') + label.toLowerCase()} aria-pressed={visible} onClick={() => setVisible(value => !value)}>{visible ? 'Hide password' : 'Show password'}</button></div></div>
}
