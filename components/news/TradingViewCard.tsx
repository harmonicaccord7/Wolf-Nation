import { tradingViewPromotion } from '../../lib/tradingview'
export function TradingViewCard() {
  const promotion = tradingViewPromotion(process.env.TRADINGVIEW_PARTNER_URL)
  return <aside className="tradingViewCard" aria-label="Optional charting tool"><div><span>{promotion.referral ? 'PARTNER LINK' : 'CHARTING TOOLS'}</span><h2>Put the news beside the chart.</h2><p>Explore prices, watchlists and charts on TradingView.</p><small>{promotion.disclosure}</small></div><a href={promotion.url} rel={promotion.referral ? 'sponsored noopener noreferrer' : 'noopener noreferrer'} target="_blank">Explore TradingView ↗</a></aside>
}
