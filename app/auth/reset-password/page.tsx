import Link from 'next/link'
import { ResetPasswordForm } from '../../../components/ResetPasswordForm'
export const metadata = { title: 'Reset your password' }
export const dynamic = 'force-dynamic'
export default function ResetPasswordPage() { return <main className="authShell"><section><Link className="authBrand" href="/">KAPORAL INTELLIGENCE</Link><p className="eyebrow">ACCOUNT SECURITY</p><h1>A fresh password.<br/>The same account.</h1><p>Your saved items and account access stay with your existing email address.</p></section><ResetPasswordForm/></main> }
