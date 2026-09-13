import Link from 'next/link'
import { backgroundNotes, transmissionSources, type MarketBackground as Background } from '../../lib/events/background'

export function BackgroundNotes() {
  return <div className="backgroundNotes"><h2>Read this before a release</h2>{backgroundNotes.map(note => <p key={note}>{note}</p>)}</div>
}

export function MarketBackground({ item }: { item: Background }) {
  return <article className="marketBackground" id={item.key} aria-labelledby={'background-' + item.key}>
    <span className="eyebrow">THE BASICS</span><h2 id={'background-' + item.key}>{item.title}</h2><p className="backgroundDescription">{item.description}</p>
    <div className="backgroundDirections">{[item.higher, item.lower].map(direction => <section key={direction.label}><h3>{direction.label}</h3><p><b>Bitcoin &amp; crypto:</b> {direction.crypto}</p><p><b>Gold:</b> {direction.gold}</p></section>)}</div>
    <div className="pocketNote"><h3>What this can mean for your pocket</h3><p>{item.pocket}</p></div>
    <p><b>Why it can go the other way:</b> {item.exception}</p><p><b>What to check:</b> {item.watch}</p>
    <div className="backgroundSources" aria-label="Background sources">{item.sources.map(source => <a href={source.url} key={source.url} target="_blank" rel="noreferrer">{source.label} ↗</a>)}</div>
  </article>
}

export function BackgroundAttribution() {
  return <aside className="backgroundAttribution"><p>These possible market effects are KAPORAL educational interpretations. The linked agencies explain the measures; research describes past relationships. Neither predicts the next price move.</p><div className="backgroundSources">{transmissionSources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.label} ↗</a>)}</div><Link href="/events">Check upcoming releases →</Link></aside>
}
