import {NextResponse} from 'next/server'
import {createClient} from '../../../../lib/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(){
  const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser()
  if(!user) return NextResponse.json({error:'Authentication required'},{status:401,headers:{'cache-control':'no-store'}})
  const [{data:preferences,error:preferencesError},{data:watchlists,error:watchlistsError}]=await Promise.all([
    supabase.from('reader_preferences').select('timezone,newsletter_frequency,event_alerts,preferred_assets').eq('profile_id',user.id).maybeSingle(),
    supabase.from('watchlists').select('id,name,watchlist_items(id,symbol,event_id)').eq('profile_id',user.id).order('created_at',{ascending:true}),
  ])
  if(preferencesError || watchlistsError) return NextResponse.json({error:'Reader workspace is not available yet.'},{status:503,headers:{'cache-control':'no-store'}})
  return NextResponse.json({preferences,watchlists:watchlists??[]},{headers:{'cache-control':'no-store'}})
}

export async function POST(request:Request){
  const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser()
  if(!user) return NextResponse.json({error:'Authentication required'},{status:401,headers:{'cache-control':'no-store'}})
  const body=await request.json().catch(()=>null) as {timezone?:unknown;newsletterFrequency?:unknown;eventAlerts?:unknown;preferredAssets?:unknown;symbol?:unknown;eventId?:unknown}|null
  if(!body) return NextResponse.json({error:'Invalid JSON'},{status:400,headers:{'cache-control':'no-store'}})
  if(body.symbol || body.eventId){
    const symbol=typeof body.symbol==='string' && /^[A-Z0-9._-]{1,20}$/.test(body.symbol)?body.symbol:null
    const eventId=typeof body.eventId==='string' && /^[0-9a-f-]{36}$/i.test(body.eventId)?body.eventId:null
    if(!symbol && !eventId) return NextResponse.json({error:'Provide a valid symbol or event id.'},{status:400,headers:{'cache-control':'no-store'}})
    let {data:list}=await supabase.from('watchlists').select('id').eq('profile_id',user.id).eq('name','My watchlist').maybeSingle()
    if(!list){const created=await supabase.from('watchlists').insert({profile_id:user.id,name:'My watchlist'}).select('id').single();if(created.error)return NextResponse.json({error:'Could not create watchlist.'},{status:503,headers:{'cache-control':'no-store'}});list=created.data}
    const result=await supabase.from('watchlist_items').insert({watchlist_id:list.id,symbol,event_id:eventId})
    if(result.error && result.error.code!=='23505') return NextResponse.json({error:'Could not save watchlist item.'},{status:503,headers:{'cache-control':'no-store'}})
    return NextResponse.json({ok:true},{headers:{'cache-control':'no-store'}})
  }
  const frequency=['weekly','weekday','material_event','off'].includes(String(body.newsletterFrequency))?String(body.newsletterFrequency):'weekly'
  const timezone=typeof body.timezone==='string' && body.timezone.length<80?body.timezone:'UTC'
  const assets=Array.isArray(body.preferredAssets)?body.preferredAssets.filter((item):item is string=>typeof item==='string' && /^[A-Z0-9._-]{1,20}$/.test(item)).slice(0,20):['BTC','ETH','GOLD']
  const result=await supabase.from('reader_preferences').upsert({profile_id:user.id,timezone,newsletter_frequency:frequency,event_alerts:Boolean(body.eventAlerts),preferred_assets:assets,updated_at:new Date().toISOString()})
  if(result.error)return NextResponse.json({error:'Could not save preferences.'},{status:503,headers:{'cache-control':'no-store'}})
  return NextResponse.json({ok:true},{headers:{'cache-control':'no-store'}})
}
