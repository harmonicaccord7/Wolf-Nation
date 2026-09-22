'use client'
import { useEffect, useState } from 'react'
import { categoryLabels, type FeedState, type NewsItem } from '../../lib/news/feeds'
import { NewsCard } from './NewsCard'
import { NewsFreshness } from './NewsFreshness'

export function NewsExplorer({ headlines, feeds, unavailable, viewedAt }: { headlines: NewsItem[]; feeds: FeedState[]; unavailable: boolean; viewedAt: string }) {
  const [query, setQuery] = useState(''), [category, setCategory] = useState('all'), [period, setPeriod] = useState('7'), [limit, setLimit] = useState(18)
  const [clock, setClock] = useState(Date.parse(viewedAt))
  useEffect(() => { const timer = setInterval(() => setClock(Date.now()), 60_000); return () => clearInterval(timer) }, [])
  const queryText = query.trim().toLowerCase(), today = new Date(clock).toISOString().slice(0, 10)
  const selected = headlines.filter(item => (category === 'all' || item.category === category) && (period === 'today' ? item.published_at.slice(0, 10) === today : Date.parse(item.published_at) >= clock - Number(period) * 86400_000) && (!queryText || (item.title + ' ' + feeds.find(feed => feed.slug === item.feed_slug)?.name).toLowerCase().includes(queryText)))
  return <>
    <NewsFreshness feeds={feeds} unavailable={unavailable} now={clock}/>
    <div className="newsFilters"><label>Search news<input type="search" value={query} onChange={event => { setQuery(event.target.value); setLimit(18) }} placeholder="Search a topic or publisher"/></label><label>Topic<select value={category} onChange={event => { setCategory(event.target.value); setLimit(18) }}><option value="all">All topics</option>{Object.entries(categoryLabels).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label><label>Published<select value={period} onChange={event => { setPeriod(event.target.value); setLimit(18) }}><option value="today">Today (UTC)</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option></select></label></div>
    <p className="newsResultCount" role="status">{selected.length} {selected.length === 1 ? 'headline' : 'headlines'}{headlines.length === 200 ? ' within the latest 200 source items' : ''}. Dates shown in UTC.</p>
    {selected.length ? <div className="newsGrid">{selected.slice(0, limit).map(item => <NewsCard key={item.id} item={item} publisher={feeds.find(feed => feed.slug === item.feed_slug)?.name ?? item.feed_slug}/>)}</div> : <div className="newsEmpty"><strong>{period === 'today' ? 'No matching headlines published today are available in these feeds.' : 'No headlines match these filters.'}</strong><p>Try a wider date range or another topic. Older headlines are not relabelled as new.</p></div>}
    {selected.length > limit && <button className="newsLoadMore" onClick={() => setLimit(value => value + 18)}>Show more headlines</button>}
  </>
}
