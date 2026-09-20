import { Header } from '../../components/Header'
import { Footer } from '../../components/Footer'
import { ContactForm } from '../../components/ContactForm'

export const metadata={alternates:{canonical:'/contact'},title:'Contact & Support',description:'Contact KAPORAL INTELLIGENCE for account, research, data and website support.'}

export default function ContactPage(){
  return <main className="contactPage">
    <Header/>
    <section className="contactHero"><div className="shell contactHeroGrid"><div><span className="eyebrow">CONTACT & SUPPORT</span><h1>Tell us what needs attention.</h1><p>Use this channel for account problems, data-quality questions, corrections, research enquiries and website support. Messages are stored privately for the editorial/support team.</p><div className="contactTrust"><span>Private support inbox</span><span>Rate-limited against abuse</span><span>No market order execution</span></div></div><aside><small>SUPPORT EMAIL</small><strong>globalsupport@kaporalintelligence.com</strong><p>For account-access issues, include the email address you used to register. Never send passwords, API keys, recovery codes or payment-card details.</p></aside></div></section>
    <section className="shell contactBody"><div className="contactContext"><span className="eyebrow">HOW WE ROUTE IT</span><h2>One support surface for the platform.</h2><p>Account and authentication issues go to platform support. Research corrections follow the public corrections policy. Data questions are checked against stored provider timestamps and provenance before any change is made.</p><ul><li>Account registration and sign-in</li><li>Newsletter and email-delivery problems</li><li>Market-data provenance or stale observations</li><li>Research corrections and methodology questions</li><li>Institutional, media and partnership enquiries</li></ul></div><ContactForm/></section>
    <Footer/>
  </main>
}
