import { createHash } from 'node:crypto'
import Link from 'next/link'
import { Header } from '../../../components/Header'
import { Footer } from '../../../components/Footer'
import { createClient } from '../../../lib/supabase/server'

function hash(value:string){return createHash('sha256').update(value).digest('hex')}

export default async function NewsletterConfirmPage({searchParams}:{searchParams:Promise<{token?:string}>}){
 const {token}=await searchParams;let confirmed=false
 if(token){const supabase=await createClient();const {data}=await supabase.rpc('confirm_newsletter_subscription',{p_token_hash:hash(token)});confirmed=Boolean(data)}
 return <main><Header/><section className="productHero"><div className="shell newsletterResult"><p className="eyebrow">THE KAPORAL MARKET LETTER</p><h1>{confirmed?'Subscription confirmed.':'Confirmation link invalid or expired.'}</h1><p>{confirmed?'You are now confirmed for KAPORAL’s evidence-led market briefings.':'Request a new confirmation from the newsletter form. Links expire after 48 hours and cannot be reused.'}</p><Link className="goldButton" href="/">Return to KAPORAL INTELLIGENCE</Link></div></section><Footer/></main>
}
