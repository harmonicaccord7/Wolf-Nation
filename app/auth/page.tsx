import Link from 'next/link'
import { AuthForm } from '../../components/AuthForm'

export default function AuthPage(){
  return <main className="authShell">
    <section>
      <Link className="authBrand" href="/" aria-label="KAPORAL INTELLIGENCE home">
        <img className="authLogo" src="/brand/kaporal-intelligence-logo.png" alt="KAPORAL INTELLIGENCE" />
        <span>KAPORAL INTELLIGENCE</span>
      </Link>
      <p className="eyebrow">SECURE ACCESS</p>
      <h1>One account. Two worlds.</h1>
      <p>Readers get bookmarks and personalization. Approved researchers and editors unlock the private KAPORAL Research OS.</p>
    </section>
    <AuthForm/>
  </main>
}
