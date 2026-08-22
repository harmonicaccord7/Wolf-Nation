import { NextResponse } from 'next/server'
import { createClient } from '../../../../../lib/supabase/server'

function blocksFromText(text:string){return text.split(/\n\s*\n/).map(t=>t.trim()).filter(Boolean).map(text=>({type:'paragraph',text}))}

export async function POST(req:Request){
 const supabase=await createClient(); const {data:auth}=await supabase.auth.getClaims(); const uid=auth?.claims?.sub
 if(!uid) return NextResponse.json({error:'Authentication required'},{status:401})
 const {data:profile}=await supabase.from('profiles').select('role').eq('id',uid).maybeSingle()
 if(!profile || !['editor','admin'].includes(profile.role)) return NextResponse.json({error:'Editor role required'},{status:403})
 const body=await req.json().catch(()=>({})); const articleId=String(body.articleId??'')
 const headline=String(body.headline??'').trim(); const dek=String(body.dek??'').trim(); const text=String(body.bodyText??'').trim(); const confidence=body.confidence?String(body.confidence):null; const readerLevel=String(body.readerLevel??'research')
 if(!articleId||!headline) return NextResponse.json({error:'articleId and headline are required'},{status:400})
 const {data:article,error}=await supabase.from('articles').update({headline,dek:dek||null,body:{version:1,blocks:blocksFromText(text)},confidence,reader_level:readerLevel,status:'review',updated_at:new Date().toISOString()}).eq('id',articleId).select('id,status,updated_at').single()
 if(error) return NextResponse.json({error:error.message},{status:500})
 return NextResponse.json({ok:true,article})
}
