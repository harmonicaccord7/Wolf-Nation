import { NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'

export const revalidate = 60

function serialize(rows:any[]){
  return rows.map(r=>({symbol:r.symbol,name:r.symbol==='BTC'?'Bitcoin':r.symbol==='ETH'?'Ethereum':r.symbol,price:r.price==null?undefined:Number(r.price),change24h:r.change_24h==null?undefined:Number(r.change_24h)}))
}

async function requestIngestion(){
  const base=process.env.NEXT_PUBLIC_SUPABASE_URL
  const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if(!base||!key) return false
  try{
    const res=await fetch(`${base}/functions/v1/market-ingest`,{method:'POST',headers:{'Content-Type':'application/json','apikey':key},body:JSON.stringify({trigger:'web-stale-check'}),cache:'no-store'})
    return res.ok
  }catch{return false}
}

export async function GET(){
  try{
    const supabase=await createClient()
    const {data:latest}=await supabase.from('market_snapshots').select('symbol,price,change_24h,captured_at,provider').in('symbol',['BTC','ETH']).order('captured_at',{ascending:false}).limit(8)
    const latestBySymbol=new Map<string,any>()
    for(const row of latest??[]) if(!latestBySymbol.has(row.symbol)) latestBySymbol.set(row.symbol,row)
    const rows=Array.from(latestBySymbol.values())
    const newest=rows[0]?.captured_at ? Date.parse(rows[0].captured_at) : 0
    const stale=Date.now()-newest>5*60*1000
    if(stale){
      const ingested=await requestIngestion()
      if(ingested){
        await new Promise(r=>setTimeout(r,300))
        const {data:fresh}=await supabase.from('market_snapshots').select('symbol,price,change_24h,captured_at,provider').in('symbol',['BTC','ETH']).order('captured_at',{ascending:false}).limit(8)
        const map=new Map<string,any>(); for(const row of fresh??[]) if(!map.has(row.symbol)) map.set(row.symbol,row)
        const freshRows=Array.from(map.values())
        if(freshRows.length) return NextResponse.json({status:'live',provider:freshRows[0].provider??'Verified provider',asOf:freshRows[0].captured_at,assets:serialize(freshRows)})
      }
    }
    if(rows.length) return NextResponse.json({status:stale?'stale':'live',provider:rows[0].provider??'Verified provider',asOf:rows[0].captured_at,assets:serialize(rows)})

    // Last-resort read-through: return live prices without writing unverified browser data into the research database.
    const res=await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true',{headers:{accept:'application/json'},next:{revalidate:60}})
    if(!res.ok) throw new Error(`market provider ${res.status}`)
    const d=await res.json()
    return NextResponse.json({status:'live',provider:'CoinGecko (read-through)',asOf:new Date().toISOString(),assets:[{symbol:'BTC',name:'Bitcoin',price:d.bitcoin?.usd,change24h:d.bitcoin?.usd_24h_change},{symbol:'ETH',name:'Ethereum',price:d.ethereum?.usd,change24h:d.ethereum?.usd_24h_change}]})
  }catch{
    return NextResponse.json({status:'degraded',provider:null,assets:[],message:'Verified market feed temporarily unavailable.'})
  }
}
