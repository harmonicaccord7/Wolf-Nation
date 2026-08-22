import Link from 'next/link'
import { primaryNav } from '../lib/navigation'

export function Header(){
  return <>
    <div className="disclaimer"><b>Independent research & education — not financial advice.</b><span> Verify information and your own circumstances before acting.</span><Link href="/methodology">Methodology</Link></div>
    <header className="header shell">
      <Link className="brand" href="/" aria-label="KAPORAL INTELLIGENCE home"><span className="brandLogoFrame headerLogoFrame" aria-hidden="true"><img className="brandLogo" src="/brand/kaporal-intelligence-logo.svg?v=20260822-dark2" alt="" /></span><span><strong>KAPORAL</strong><small>INTELLIGENCE</small></span></Link>
      <nav aria-label="Primary navigation">{primaryNav.map(item=><Link key={item.href} href={item.href}>{item.label}</Link>)}</nav>
      <div className="actions"><Link className="iconButton" href="/search" aria-label="Search">⌕</Link><Link className="outlineButton" href="/auth">Sign in</Link><Link className="goldButton" href="/auth">Join free</Link></div>
    </header>
  </>
}
