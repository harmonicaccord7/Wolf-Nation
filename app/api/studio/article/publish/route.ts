import { NextResponse } from 'next/server'
import { createClient } from '../../../../../lib/supabase/server'

export async function POST(req:Request){
 const supabase=await createClient(); const {data:auth}=await supabase.auth.getClaims(); const uid=auth?.claims?.sub
 if(!uid) return NextResponse.json({error:'Authentication required'},{status:401})
 const {data:profile}=await supabase.from('profiles').select('role,display_name').eq('id',uid).maybeSingle()
 if(!profile || !['editor','admin'].includes(profile.role)) return NextResponse.json({error:'Editor role required'},{status:403})
 const body=await req.json().catch(()=>({})); const articleId=String(body.articleId??'')
 if(!articleId) return NextResponse.json({error:'articleId is required'},{status:400})
 const {data:article,error}=await supabase.from('articles').update({status:'published'}).eq('id',articleId).select('id,slug,status,published_at').single()
 if(error) return NextResponse.json({error:error.message},{status:409})
 return NextResponse.json({ok:true,article,publishedBy:profile.display_name??'Human editor'})
}
