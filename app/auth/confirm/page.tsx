import type { EmailOtpType } from '@supabase/supabase-js'
import Link from 'next/link'
import { AuthConfirmButton } from '../../../components/AuthConfirmButton'

export const dynamic='force-dynamic'
export const metadata={title:'Confirm your account',robots:{index:false,follow:false,noarchive:true,nosnippet:true}}

const allowedTypes=new Set<EmailOtpType>(['email','signup','invite','magiclink','recovery','email_change'])
function safeNext(value?:string){return value&&value.startsWith('/')&&!value.startsWith('//')?value:'/account'}

export default async function ConfirmAccountPage({searchParams}:{searchParams:Promise<{token_hash?:string;type?:string;next?:string}>}){
  const params=await searchParams
  const tokenHash=String(params.token_hash??'')
  const type=allowedTypes.has(params.type as EmailOtpType)?params.type as EmailOtpType:null
  const next=safeNext(params.next)
  const usable=tokenHash.length>=32&&Boolean(type)

  return <main className="authShell authConfirmShell">
    <section>
      <Link className="authBrand" href="/" aria-label="KAPORAL INTELLIGENCE home"><span className="brandLogoFrame authLogoFrame" aria-hidden="true"><img className="brandLogo" src="/brand/kaporal-intelligence-logo.svg?v=20260822-svg1" alt=""/></span><span>KAPORAL INTELLIGENCE</span></Link>
      <p className="eyebrow">EMAIL VERIFICATION</p>
      <h1>{usable?'Confirm this account.':'Confirmation link unavailable.'}</h1>
      <p>{usable?'For security, opening an email does not automatically consume the verification token. Press the button to finish creating the account. This also avoids email scanners consuming a one-time link before you do.':'The verification data is missing or malformed. Request a new account confirmation email and use only the newest message.'}</p>
    </section>
    <section className="authCard">
      {usable?<><h2>Finish secure registration</h2><p>Confirming will verify your email address and create your KAPORAL reader session on this device.</p><AuthConfirmButton tokenHash={tokenHash} type={type!} next={next}/><p className="authFine">If you did not request this account, close this page. No account is confirmed until you press the button.</p></>:<><h2>Request a fresh link</h2><p>Older Supabase confirmation links, including links that point to localhost, should be discarded.</p><Link className="goldButton big" href="/auth">Return to account access</Link></>}
    </section>
  </main>
}
