import Link from 'next/link'
import { Header } from '../../../components/Header'
import { Footer } from '../../../components/Footer'
import { newsletterAction } from '../../../lib/newsletter'

export const metadata={title:'Confirm newsletter subscription',robots:{index:false,follow:false}}
export default async function ConfirmPage({searchParams}:{searchParams:Promise<{token?:string}>}){
 const {token=''}=await searchParams
 const result=token?await newsletterAction('confirm',{token}):{ok:false,status:'invalid'}
 return <main className="intelligencePage"><Header/><section className="deskHero"><div className="shell deskHeroGrid"><div><span className="eyebrow">KAPORAL MARKET LETTER</span><h1>{result.ok?'Subscription confirmed.':'Confirmation link unavailable.'}</h1><p>{result.ok?'Your address is now confirmed for KAPORAL newsletter delivery. You can unsubscribe from any future email.':'This link is invalid or expired. Submit your address again from the website to request a new confirmation email.'}</p><div className="deskHeroActions"><Link className="goldButton" href="/">Return home</Link>{!result.ok&&<Link className="glassButton" href="/#newsletter">Request confirmation</Link>}</div></div><aside><small>DOUBLE OPT-IN</small><strong>Consent must be confirmed.</strong><span>A pending email address is not treated as an active subscriber until this confirmation step succeeds.</span></aside></div></section><Footer/></main>
}
