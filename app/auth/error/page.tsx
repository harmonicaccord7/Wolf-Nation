import Link from 'next/link'

export const dynamic='force-dynamic'
export const metadata={title:'Account confirmation problem',robots:{index:false,follow:false,noarchive:true,nosnippet:true}}

export default async function AuthErrorPage({searchParams}:{searchParams:Promise<{reason?:string;error_description?:string}>}){
  const params=await searchParams
  const expired=params.reason==='invalid_or_expired'||String(params.error_description??'').toLowerCase().includes('expired')
  return <main className="authShell authConfirmShell">
    <section><Link className="authBrand" href="/">KAPORAL INTELLIGENCE</Link><p className="eyebrow">SECURE ACCESS</p><h1>{expired?'That confirmation link has expired.':'We could not complete verification.'}</h1><p>Use the newest account email only. Confirmation links are one-time credentials and should never be reused, forwarded or opened from an old message.</p></section>
    <section className="authCard"><h2>Get back on track</h2><p>Return to account access and submit your registration again if necessary. If a new confirmation still fails, send the details to KAPORAL support.</p><div className="deskHeroActions"><Link className="goldButton" href="/auth">Sign in / Create account</Link><Link className="outlineButton" href="/contact">Contact support</Link></div></section>
  </main>
}
