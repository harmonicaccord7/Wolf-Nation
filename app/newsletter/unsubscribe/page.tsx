import { createHash } from 'node:crypto'
import Link from 'next/link'
import { Header } from '../../../components/Header'
import { Footer } from '../../../components/Footer'
import { createClient } from '../../../lib/supabase/server'

function hash(value:string){return createHash('sha256').update(value).digest('hex')}

export default async function NewsletterUnsubscribePage({searchParams}:{searchParams:Promise<{token?:string}>}){
 const {token}=await searchParams;let changed=false
 if(token){const supabase=await createClient();const {data}=await supabase.rpc('unsubscribe_newsletter',{p_token_hash:hash(token)});changed=Boolean(data)}
 return <main><Header/><section className="productHero"><div className="shell newsletterResult"><p className="eyebrow">NEWSLETTER PREFERENCES</p><h1>{changed?'You are unsubscribed.':'This unsubscribe link is invalid or already used.'}</h1><p>{changed?'No further KAPORAL Market Letter emails will be sent to this subscription unless you explicitly subscribe again.':'If you still receive an email unexpectedly, use the unsubscribe link contained in that message.'}</p><Link className="outlineButton" href="/">Return to KAPORAL INTELLIGENCE</Link></div></section><Footer/></main>
}
