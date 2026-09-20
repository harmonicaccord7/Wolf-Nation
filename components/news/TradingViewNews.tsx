'use client'
import { useEffect, useRef, useState } from 'react'
import { tradingViewNewsUrl, tradingViewWidgetScript, tradingViewWidgetSettings } from '../../lib/tradingview'
export function TradingViewNews() {
  const container = useRef<HTMLDivElement>(null), [failed, setFailed] = useState(false)
  useEffect(() => {
    const element = container.current; if (!element) return
    let script: HTMLScriptElement | null = null
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting) || script) return
      script = document.createElement('script'); script.src = tradingViewWidgetScript; script.type = 'text/javascript'; script.async = true
      script.textContent = JSON.stringify(tradingViewWidgetSettings)
      script.onerror = () => setFailed(true)
      element.appendChild(script); observer.disconnect()
    }, { rootMargin: '250px' })
    const frames = new MutationObserver(() => { const frame = element.querySelector('iframe'); if (frame) frame.title = 'TradingView Top Stories news' })
    frames.observe(element, { childList: true, subtree: true }); observer.observe(element)
    return () => { observer.disconnect(); frames.disconnect(); if (script) script.onerror = null; element.replaceChildren() }
  }, [])
  return <section className="tradingViewNews" aria-labelledby="tradingview-news-heading"><span className="eyebrow">FROM TRADINGVIEW</span><h2 id="tradingview-news-heading">Market headlines, at a glance.</h2><p>TradingView’s Top Stories covers its available stock and crypto news. Its selection may differ from the news panel in your personal chart.</p><div className="tradingview-widget-container"><div className="tradingview-widget-container__widget" ref={container}/><div className="tradingview-widget-copyright"><a href={tradingViewNewsUrl} rel="noopener noreferrer" target="_blank"><span className="blue-text">Top stories</span></a><span className="trademark"> by TradingView</span></div></div>{failed && <p role="status">The TradingView panel could not load in this browser. The source headlines above are still available.</p>}<p className="tradingViewFallback"><a href={tradingViewNewsUrl} target="_blank" rel="noreferrer">Open news on TradingView ↗</a> · <a href="https://www.tradingview.com/privacy-policy/" target="_blank" rel="noreferrer">TradingView privacy</a></p></section>
}
