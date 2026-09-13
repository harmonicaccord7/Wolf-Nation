'use client'
import Link from 'next/link'
import {useEffect,useState} from 'react'
import {observationStamp,type Freshness} from '../lib/data/freshness'
type Asset={symbol:string;name:string;value:number|null;unit:string|null;change24h:number|null;provider:string|null;asOf:string|null;href:string;freshness:Freshness}
function value(v:number|null,u:string|null){if(v===null)return '—';return Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(v)+(u==='%'?'%':u==='USD/oz'?' USD/oz':u==='USD'?' USD':u==='USD/barrel'?' USD/bbl':'')}
export function MarketStrip(){
 const [assets,setAssets]=useState<Asset[]>([]),[status,setStatus]=useState('loading')
 useEffect(()=>{let alive=true;const load=()=>fetch('/api/market/overview',{cache:'no-store'}).then(async r=>{if(!r.ok)throw new Error();return r.json()}).then(d=>{if(alive){setAssets(d.assets??[]);setStatus(d.status)}}).catch(()=>alive&&setStatus('degraded'));load();const timer=setInterval(load,120000);return()=>{alive=false;clearInterval(timer)}},[])
 return <section className="marketRail" aria-label="Market observations"><div className="shell marketStrip">{status==='loading'&&<p>Loading market observations…</p>}{assets.map(a=><Link className="marketItem" href={a.href} key={a.symbol} title={`${a.provider??'Unavailable'} · ${observationStamp(a.asOf)} · ${a.freshness.label}`}><small>{a.name}</small><b>{value(a.value,a.unit)}</b><span className={a.change24h==null?'flat':a.change24h>=0?'up':'down'}>{a.change24h==null?a.freshness.label:`${a.change24h>=0?'+':''}${a.change24h.toFixed(2)}% / 24h`}</span><time>{observationStamp(a.asOf)}</time></Link>)}</div><div className="shell demoNote" role="status">{status==='degraded'?'Feed check failed. Displayed observations, if any, retain their original timestamps.':'Market snapshots and published indicators update at different intervals. Select an asset to inspect its history and source.'}</div></section>
}
