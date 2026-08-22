import { NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(){
  const checkedAt=new Date().toISOString()
  try{
    const supabase=await createClient()
    const {data,error}=await supabase
      .from('market_snapshots')
      .select('captured_at')
      .order('captured_at',{ascending:false})
      .limit(1)
      .maybeSingle()

    if(error) throw error

    const asOf=data?.captured_at ?? null
    const ageMs=asOf ? Date.now()-Date.parse(asOf) : Number.POSITIVE_INFINITY
    const marketFeed=asOf ? (ageMs<=20*60*1000?'fresh':'stale') : 'empty'

    return NextResponse.json({
      status:'ok',
      application:'kaporal-intelligence',
      database:'connected',
      marketFeed,
      marketAsOf:asOf,
      checkedAt
    },{headers:{'Cache-Control':'no-store'}})
  }catch{
    return NextResponse.json({
      status:'degraded',
      application:'kaporal-intelligence',
      database:'unavailable',
      marketFeed:'unknown',
      checkedAt
    },{status:503,headers:{'Cache-Control':'no-store'}})
  }
}
