import Link from 'next/link'
import {Header} from '../../components/Header'
import {Footer} from '../../components/Footer'
import {NewsletterForm} from '../../components/NewsletterForm'
import {getPublishedNewsletterIssues} from '../../lib/data/newsletter'
export const dynamic='force-dynamic'
export const metadata={title:'KAPORAL Market Letter',description:'Source-labelled market and event briefings with a double-opt-in subscription.',alternates:{canonical:'/newsletter'}}

export default async function NewsletterPage(){
  const {issues,unavailable}=await getPublishedNewsletterIssues()
  return <main className="newsletterArchive"><Header/>
    <section className="newsletterHero"><div className="shell"><span className="eyebrow">KAPORAL MARKET LETTER</span><h1>Research you can<br/><em>check before you act.</em></h1><p>Upcoming events, market explanations and links to the original sources. Enter your email below and confirm it in your inbox.</p><div id="newsletter-signup"><NewsletterForm/></div></div></section>
    <section className="shell newsletterBody">
      <div className="sectionTitle"><div><span className="eyebrow">PUBLIC ARCHIVE</span><h2>Published editions</h2></div><p>Drafts remain private until the research and editorial checks are complete. Publication here does not confirm inbox delivery.</p></div>
      {unavailable?<div className="issueEmpty" role="status"><strong>Published editions are temporarily unavailable.</strong><p>We could not check the archive. This does not mean that it is empty. Please try again later.</p></div>
        :issues.length?<div className="issueGrid">{issues.map(issue=><article className="issueCard" key={issue.issue_key}><small><time dateTime={issue.published_at}>Published {new Date(issue.published_at).toLocaleDateString('en-GB',{dateStyle:'long',timeZone:'UTC'})}</time></small><h3>{issue.title}</h3><p>{issue.dek||'Source-labelled KAPORAL briefing.'}</p><Link href={`/newsletter/${encodeURIComponent(issue.issue_key)}`}>Read edition →</Link></article>)}</div>
          :<div className="issueEmpty"><strong>No newsletter edition has been published yet.</strong><p>Subscribe for the double-opt-in confirmation. An edition appears only after sources and human review are complete.</p><Link href="/news">Read Daily News while you wait →</Link></div>}
      <div className="newsletterRules"><h2>What each edition contains</h2><ul><li>Official event dates and a clear separation between prior, consensus, actual and revision.</li><li>Conditional mechanisms and decision options such as wait, stage or hold—not a personal buy/sell call.</li><li>Source links, observation time and an after-release comparison so the record is not rewritten.</li></ul></div>
    </section><Footer/>
  </main>
}
