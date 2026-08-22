import Link from 'next/link'
import { Header } from '../../../components/Header'
import { Footer } from '../../../components/Footer'
import { newsletterAction } from '../../../lib/newsletter'

export const metadata={title:'Unsubscribe from newsletter',robots:{index:false,follow:false}}
export default async function UnsubscribePage({searchParams}:{searchParams:Promise<{token?:string}>}){
 const {token=''}=await searchParams
 const result=token?await newsletterAction('unsubscribe',{token}):{ok:false,status:'invalid'}
 return <main className="intelligencePage"><Header/><section className="deskHero"><div className="shell deskHeroGrid"><div><span className="eyebrow">EMAIL PREFERENCES</span><h1>{result.ok?'Newsletter preference updated.':'Unsubscribe link unavailable.'}</h1><p>{result.ok?'The matching subscription is unsubscribed, or was already inactive.':'This unsubscribe link is invalid. No subscription record was changed.'}</p><div className="deskHeroActions"><Link className="goldButton" href="/">Return home</Link></div></div><aside><small>CONTROL</small><strong>Reader consent is reversible.</strong><span>KAPORAL newsletter delivery is separate from reader-account authentication.</span></aside></div></section><Footer/></main>
}
