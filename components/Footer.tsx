import { NewsletterForm } from './NewsletterForm'

export function Footer(){
  return <footer>
    <div className="shell footerGrid">
      <div className="brand footerBrand">
        <span className="brandLogoFrame footerLogoFrame" aria-hidden="true">
          <img className="brandLogo" src="/brand/kaporal-intelligence-logo.png?v=20260822c" alt="" />
        </span>
        <span><strong>KAPORAL</strong><small>INTELLIGENCE</small></span>
      </div>
      <div className="footerPitch"><b>The KAPORAL Market Letter</b><span>Two serious briefings. No noise.</span></div>
      <NewsletterForm/>
      <div className="footerLinks"><a href="#">Corrections</a><a href="#">Disclosures</a><a href="#">Privacy</a><a href="#">Terms</a></div>
      <small className="footerLegal">© 2026 KAPORAL INTELLIGENCE · Independent research & education. Market data is source-labelled when live.</small>
    </div>
  </footer>
}
