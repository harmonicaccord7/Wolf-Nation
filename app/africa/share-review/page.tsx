import Link from 'next/link'
import {notFound} from 'next/navigation'
import {Header} from '../../../components/Header'
import {Footer} from '../../../components/Footer'
import {ShareReview} from '../../../components/africa/ShareReview'
import {countryBySlug} from '../../../lib/africa/countries'
import styles from '../../../components/africa/CountryPage.module.css'
export const metadata={title:'Africa Share & IPO Review — company ratios and cost scenarios',description:'A free, local-only worksheet for African shares and IPO research: entered company ratios, whole lots, fees, losses and source notes.',alternates:{canonical:'/africa/share-review'}}
export default async function ShareReviewPage({searchParams}:{searchParams:Promise<{country?:string|string[]}>}){
  const requested=(await searchParams).country
  const country=requested===undefined?countryBySlug('cameroon'):typeof requested==='string'?countryBySlug(requested):null
  if(!country)notFound()
  return <main className="intelligencePage"><Header/><section className="deskHero"><div className="shell deskHeroGrid"><div><span className="eyebrow">FREE AFRICA RESEARCH TOOL</span><h1>Africa Share &amp; IPO Review</h1><p>Read the company. Check the price. Test the downside. Use your own figures to compare valuation ratios and the cash consequences of a share purchase.</p><div className="deskHeroActions"><Link className="glassButton" href="/africa">Open Africa country workspaces</Link><Link className="glassButton" href="/tools/decision-lab">Open Decision Lab</Link></div></div><aside><small>YOUR FIGURES · YOUR DECISION</small><strong>No account or payment needed</strong><span>Manual source notes and hypothetical scenarios. No live issuer feed, trading instruction or validated Africa prediction is claimed.</span></aside></div></section><section className={'shell '+styles.section}><ShareReview initialCountry={country.slug} cutoffDate={new Date().toISOString().slice(0,10)}/></section><Footer/></main>
}
