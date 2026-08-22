'use client'
import { useEffect, useState } from 'react'

type Asset = { symbol:string; name:string; price?:number; change24h?:number }
type Feed = { status:'live'|'stale'|'degraded'|'loading'; provider?:string|null; asOf?:string; assets:Asset[]; message?:string }

function fmtPrice(v?:number){
  if(v == null || Number.isNaN(v)) return '—'
  return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:v>=1000?0:2}).format(v)
}

function fmtAsOf(value?:string){
  if(!value) return ''
  const date=new Date(value)
  if(Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',timeZoneName:'short'}).format(date)
}

export function MarketStrip(){
  const [feed,setFeed]=useState<Feed>({status:'loading',assets:[]})
  useEffect(()=>{
    let alive=true
    fetch('/api/market/overview',{cache:'no-store'}).then(r=>r.json()).then(d=>alive&&setFeed(d)).catch(()=>alive&&setFeed({status:'degraded',assets:[],message:'Verified market feed temporarily unavailable.'}))
    return ()=>{alive=false}
  },[])

  const statusText = feed.status==='live'
    ? `Live · ${feed.provider ?? 'verified provider'}${feed.asOf?` · ${fmtAsOf(feed.asOf)}`:''}`
    : feed.status==='stale'
      ? `Last verified snapshot · ${feed.provider ?? 'verified provider'}${feed.asOf?` · ${fmtAsOf(feed.asOf)}`:''}`
      : feed.status==='degraded'
        ? (feed.message ?? 'Verified market feed temporarily unavailable.')
        : 'Connecting verified live data.'

  return <section className="marketRail" aria-label="Live market rail">
    <div className="shell marketStrip">
      {feed.status==='loading' && <div className="marketItem"><small>LIVE DATA</small><b>Connecting…</b><span className="flat">Verified feeds only</span></div>}
      {feed.assets.map(a=><div className="marketItem" key={a.symbol}><small>{a.name}</small><b>{fmtPrice(a.price)}</b><span className={(a.change24h??0)>=0?'up':'down'}>{a.change24h==null?'—':`${a.change24h>=0?'+':''}${a.change24h.toFixed(2)}%`}</span></div>)}
      <div className="marketItem"><small>MACRO</small><b>Provider-ready</b><span className="flat">FRED / rates next</span></div>
      <div className="marketItem"><small>AFRICA</small><b>Provider-ready</b><span className="flat">Regional feeds next</span></div>
    </div>
    <div className="shell demoNote" role="status" aria-live="polite">{statusText}</div>
  </section>
}
