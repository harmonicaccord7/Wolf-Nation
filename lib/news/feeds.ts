export type NewsCategory = 'finance' | 'business' | 'energy' | 'geopolitics'
export type NewsFeed = { slug: string; name: string; url: string; category: NewsCategory; articleHosts: string[] }

// Only publisher-provided feeds. No user-supplied fetch targets or copied articles.
export const newsFeeds: NewsFeed[] = [
  { slug: 'ecb', name: 'European Central Bank', url: 'https://www.ecb.europa.eu/rss/press.html', category: 'finance', articleHosts: ['www.ecb.europa.eu'] },
  { slug: 'wto', name: 'WTO news', url: 'https://www.wto.org/library/rss/latest_news_e.xml', category: 'business', articleHosts: ['www.wto.org'] },
  { slug: 'eia', name: 'U.S. Energy Information Administration', url: 'https://www.eia.gov/rss/todayinenergy.xml', category: 'energy', articleHosts: ['www.eia.gov'] },
  { slug: 'un-geneva', name: 'UN Geneva', url: 'https://www.ungeneva.org/news-media/press-items-list/rss.xml', category: 'geopolitics', articleHosts: ['www.ungeneva.org'] },
]

export const categoryLabels: Record<NewsCategory, string> = { finance: 'Finance', business: 'Business & trade', energy: 'Energy', geopolitics: 'Geopolitics' }
export type NewsItem = { id: string; feed_slug: string; title: string; url: string; category: NewsCategory; published_at: string; first_seen_at: string; last_seen_at: string }
export type FeedState = { slug: string; name: string; source_url: string; category: NewsCategory; last_checked_at: string | null; last_success_at: string | null; latest_published_at: string | null; status: 'pending' | 'healthy' | 'error' }

export function feedIsFresh(feed: FeedState, now: number) {
  const checked = Date.parse(feed.last_success_at ?? '')
  return feed.status === 'healthy' && Number.isFinite(checked) && now >= checked && now - checked < 26 * 3600_000
}

export const pocketContexts: Record<NewsCategory, { text: string; guide: string; label: string }> = {
  finance: { text: 'Interest-rate changes can affect new loans, variable-rate debt and savings returns. Check which decision applies in your country.', guide: 'fomc', label: 'How rates reach your budget' },
  business: { text: 'Trade conditions can affect imported goods, business costs and job opportunities. Check the products and countries involved.', guide: 'geopolitics', label: 'How trade changes can reach your bills' },
  energy: { text: 'Energy supply and prices can affect fuel, heating and transport bills. Taxes, exchange rates and local suppliers change the effect.', guide: 'oil', label: 'How energy reaches everyday costs' },
  geopolitics: { text: 'Conflict or disrupted trade routes can affect food, fuel and deliveries. Check whether the report identifies a real supply disruption.', guide: 'geopolitics', label: 'How global events can reach your pocket' },
}
