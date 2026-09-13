import Link from 'next/link'
import { PasswordRecoveryForm } from '../../../components/PasswordRecoveryForm'
export const metadata = { title: 'Forgot password' }
export default function ForgotPasswordPage() { return <main className="authShell"><section><Link className="authBrand" href="/">KAPORAL INTELLIGENCE</Link><p className="eyebrow">ACCOUNT RECOVERY</p><h1>Get back into your account.</h1><p>Use the email address you registered with. We will send a secure link so you can choose a new password.</p></section><PasswordRecoveryForm/></main> }
