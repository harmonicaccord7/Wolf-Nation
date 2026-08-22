import Link from 'next/link'
import { NewsletterForm } from './NewsletterForm'
import { institutionalNav } from '../lib/navigation'

export function Footer(){
  return <footer><div className="shell footerGrid"><Link className="brand footerBrand" href="/"><span className="brandLogoFrame footerLogoFrame" aria-hidden="true"><img className="brandLogo" src="/brand/kaporal-intelligence-logo.svg?v=20260822-svg1" alt="" /></span><span><strong>KAPORAL</strong><small>INTELLIGENCE</small></span></Link><div className="footerPitch"><b>The KAPORAL Market Letter</b><span>Two serious briefings. No noise.</span></div><NewsletterForm/><div className="footerLinks">{institutionalNav.map(item=><Link key={item.href} href={item.href}>{item.label}</Link>)}</div><small className="footerLegal">© 2026 KAPORAL INTELLIGENCE · Independent research & education. Live and delayed market data is source-labelled. Provider outages and revisions can occur.</small></div></footer>
}
