import {Header} from '../components/Header'
import {Hero} from '../components/Hero'
import {MarketStrip} from '../components/MarketStrip'
import {SignalBoard} from '../components/SignalBoard'
import {EditorialGrid} from '../components/EditorialGrid'
import {ImpactMap} from '../components/ImpactMap'
import {DeskGrid} from '../components/DeskGrid'
import {OptionsAfrica} from '../components/OptionsAfrica'
import {Methodology} from '../components/Methodology'
import {Footer} from '../components/Footer'
import {EventPreview} from '../components/events/EventPreview'
import {getHomeContent} from '../lib/data/content'
import {getOverviewIntelligence} from '../lib/data/intelligence'
import {Suspense} from 'react'
import {NewsPreview} from '../components/news/NewsPreview'

export const metadata={alternates:{canonical:'/'}}

export default async function Home(){const[{articles},overview]=await Promise.all([getHomeContent(),getOverviewIntelligence()]);return <main><Header/><Hero overview={overview}/><MarketStrip/><Suspense fallback={<section className="shell newsPreview">Loading Daily News…</section>}><NewsPreview/></Suspense><SignalBoard overview={overview}/><Suspense fallback={<section className="shell eventPreview">Loading official event calendars…</section>}><EventPreview/></Suspense>{articles.length>0&&<EditorialGrid articles={articles as any}/>}<ImpactMap/><DeskGrid/><OptionsAfrica overview={overview}/><Methodology/><Footer/></main>}
