export const tradingViewNewsUrl = 'https://www.tradingview.com/news/'
export const tradingViewWidgetScript = 'https://s3.tradingview.com/external-embedding/embed-widget-timeline.js'
export const tradingViewWidgetSettings = { feedMode: 'all_symbols', isTransparent: true, displayMode: 'adaptive', width: '100%', height: 550, colorTheme: 'light', locale: 'en' }
// The owner's share_your_love link is a personal referral, whose terms exclude
// automated distribution/bulk email. Keep it in the private review proposal.
// Enable commercial promotion only with a reviewed Partner Program link.
export function tradingViewPromotion(approvedPartnerUrl?: string) {
  try {
    const url = new URL(approvedPartnerUrl ?? '')
    if (url.protocol === 'https:' && ['www.tradingview.com', 'tradingview.com'].includes(url.hostname) && !url.username && !url.password && !url.port && url.searchParams.has('aff_id') && !url.searchParams.has('share_your_love')) return { url: url.href, referral: true, disclosure: 'Partner link. KAPORAL may receive a reward if you make an eligible purchase. Choose only the tools you need.' }
  } catch { /* Ordinary product link until a partner link is supplied and reviewed. */ }
  return { url: 'https://www.tradingview.com/', referral: false, disclosure: 'Optional charting tool. Plans, prices and available data are set by TradingView.' }
}
