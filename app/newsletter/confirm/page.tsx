import Link from 'next/link'
import { Header } from '../../../components/Header'
import { Footer } from '../../../components/Footer'
import { NewsletterConfirmButton } from '../../../components/NewsletterConfirmButton'

export const dynamic='force-dynamic'
export const metadata={title:'Confirm newsletter subscription',robots:{index:false,follow:false,noarchive:true,nosnippet:true}}

export default async function ConfirmPage({searchParams}:{searchParams:Promise<{token?:string}>}){
 const {token=''}=await searchParams
 const usable=token.length>=40
 return <main className="intelligencePage"><Header/><section className="deskHero"><div className="shell deskHeroGrid"><div><span className="eyebrow">KAPORAL MARKET LETTER</span><h1>{usable?'Confirm your subscription.':'Confirmation link unavailable.'}</h1><p>{usable?'Your email link is ready. Click “Confirm subscription” below to finish double opt-in. No password or website account is needed.':'This link is incomplete or expired. Submit your address again from the website to request a new confirmation email.'}</p><div className="deskHeroActions">{usable?<NewsletterConfirmButton token={token}/>:<Link className="goldButton" href="/newsletter#newsletter-signup">Request confirmation</Link>}</div></div><aside><small>DOUBLE OPT-IN</small><strong>One deliberate click completes consent.</strong><span>Opening the email link alone does not subscribe you. This protects addresses from automatic mail scanners; the confirmation button below completes the request.</span></aside></div></section><Footer/></main>
}
