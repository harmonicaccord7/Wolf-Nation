import Link from 'next/link'

export default function NotFound(){return <main className="errorScreen"><div><p className="eyebrow">404 · KAPORAL INTELLIGENCE</p><h1>That intelligence page does not exist.</h1><p>The link may be outdated, the research may not be published, or the route may have moved.</p><div className="heroButtons"><Link className="goldButton" href="/">Go to homepage</Link><Link className="outlineButton" href="/research">Browse research</Link></div></div></main>}
