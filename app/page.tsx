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
import {getHomeContent} from '../lib/data/content'
import {getOverviewIntelligence} from '../lib/data/intelligence'

export default async function Home(){const[{articles,signals},overview]=await Promise.all([getHomeContent(),getOverviewIntelligence()]);return <main><Header/><Hero overview={overview}/><MarketStrip/><SignalBoard signals={signals as any}/><EditorialGrid articles={articles as any}/><ImpactMap/><DeskGrid/><OptionsAfrica overview={overview}/><Methodology/><Footer/></main>}
