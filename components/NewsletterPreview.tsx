import Link from 'next/link'
import { getPublishedNewsletterIssues } from '../lib/data/newsletter'
import { newsDate } from './news/NewsCard'
import styles from './NewsletterPreview.module.css'

export async function NewsletterPreview() {
  const data = await getPublishedNewsletterIssues(1)
  const issue = data.issues[0]
  return <section className={`shell ${styles.preview}`} aria-labelledby="home-market-letter-heading">
    <div className={styles.intro}>
      <p className={styles.eyebrow}>KAPORAL MARKET LETTER</p>
      <h2 id="home-market-letter-heading">Your market briefing,<br/>in one place.</h2>
      <p>Upcoming releases, plain-English explanations and original sources. Read approved editions on the website or subscribe for email delivery.</p>
      <p className={styles.emailOnly}>Email only. No password or website account required.</p>
      <div className={styles.actions}><Link className="goldButton" href="/newsletter#newsletter-signup">Subscribe to the Market Letter →</Link><Link href="/newsletter">Browse newsletter editions →</Link></div>
      <p className={styles.note}>Confirm your email before receiving editions. Unsubscribe at any time. Publication is separate from inbox delivery.</p>
    </div>
    <div className={styles.edition}>
      {data.unavailable ? <><p className={styles.eyebrow}>PUBLICATION STATUS</p><h3>Edition status is temporarily unavailable.</h3><p>We could not check the public archive. This does not mean that no editions exist. Open the newsletter page to try again.</p></>
        : issue ? <><p className={styles.eyebrow}>LATEST PUBLISHED EDITION</p><time dateTime={issue.published_at}>Published {newsDate(issue.published_at)}</time><h3>{issue.title}</h3><p>{issue.dek ?? 'Source-labelled KAPORAL market and event research.'}</p><Link href={`/newsletter/${encodeURIComponent(issue.issue_key)}`}>Read the latest edition →</Link></>
          : <><p className={styles.eyebrow}>PUBLICATION STATUS</p><h3>No edition has been published yet.</h3><p>Drafts stay private until editorial approval. Subscribing confirms your email; it does not mean that a newsletter edition has already been sent.</p><Link href="/news">Read Daily News while you wait →</Link></>}
    </div>
  </section>
}
