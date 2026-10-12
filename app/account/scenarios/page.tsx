import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Header } from '../../../components/Header'
import { Footer } from '../../../components/Footer'
import { ScenarioLibrary } from '../../../components/tools/ScenarioLibrary'
import { getSavedScenarios } from '../../../lib/data/decision-scenarios'
export const dynamic='force-dynamic'
export const revalidate=0
export const metadata={title:'My saved decision scenarios',description:'Your private KAPORAL scenario workspace.'}
export default async function SavedScenariosPage(){
  const result=await getSavedScenarios()
  if(!result.authenticated)redirect('/auth')
  return <main className="intelligencePage"><Header/><section className="deskHero"><div className="shell deskHeroGrid"><div><span className="eyebrow">PRIVATE READER WORKSPACE</span><h1>Your saved decision scenarios.</h1><p>Reopen your assumptions, inspect their original source dates and compare a new case. No payment is enabled.</p><div className="deskHeroActions"><Link className="goldButton" href="/tools/decision-lab">Open Decision Lab</Link><Link className="glassButton" href="/account">My account</Link></div></div></div></section><div className="shell"><ScenarioLibrary initialScenarios={result.scenarios} initialError={result.error}/></div><Footer/></main>
}
