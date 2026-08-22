import Link from 'next/link'
import { Header } from '../components/Header'
import { Footer } from '../components/Footer'

export default function NotFound(){return <main className="intelligencePage"><Header/><section className="deskHero"><div className="shell deskHeroGrid"><div><span className="eyebrow">404 · NOT FOUND</span><h1>This intelligence route is not available.</h1><p>The page may have moved, the research may not be public, or the URL may be incorrect. Private newsroom material is never exposed through a missing public route.</p><div className="deskHeroActions"><Link className="goldButton" href="/">Return home</Link><Link className="glassButton" href="/search">Search KAPORAL</Link></div></div><aside><small>PUBLICATION RULE</small><strong>Missing does not become invented.</strong><span>KAPORAL returns an explicit unavailable state rather than substituting synthetic content.</span></aside></div></section><Footer/></main>}
