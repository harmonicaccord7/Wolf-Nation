import Link from 'next/link'
import { categoryLabels, pocketContexts, type NewsItem } from '../../lib/news/feeds'

export function newsDate(value: string) { return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(value)) + ' UTC' }
export function NewsCard({ item, publisher, compact = false }: { item: NewsItem; publisher: string; compact?: boolean }) {
  const context = pocketContexts[item.category], Heading = compact ? 'h3' : 'h2'
  return <article className="newsCard"><span className="newsCategory">{categoryLabels[item.category]}</span><div className="newsMeta">{publisher}<br/><time dateTime={item.published_at}>{newsDate(item.published_at)}</time></div><Heading><a href={item.url} target="_blank" rel="noreferrer">{item.title} ↗</a></Heading>{!compact && <div className="newsPocket"><p><strong>General pocket guide</strong><br/>{context.text}</p><Link href={'/learn/market-events#' + context.guide}>{context.label} →</Link></div>}</article>
}
