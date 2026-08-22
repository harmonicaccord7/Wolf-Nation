import { NextResponse } from 'next/server'
import { createClient } from '../../../../../lib/supabase/server'

const roles=['contrarian','quant','standards','editor_in_chief']
const decisions=['pass','revise','hold','reject']

export async function POST(req:Request){
 const supabase=await createClient(); const {data:auth}=await supabase.auth.getClaims(); const uid=auth?.claims?.sub
 if(!uid) return NextResponse.json({error:'Authentication required'},{status:401})
 const {data:profile}=await supabase.from('profiles').select('role').eq('id',uid).maybeSingle()
 if(!profile || !['editor','admin'].includes(profile.role)) return NextResponse.json({error:'Editor role required'},{status:403})
 const body=await req.json().catch(()=>({})); const articleId=String(body.articleId??''); const reviewerRole=String(body.reviewerRole??''); const decision=String(body.decision??''); const notes=String(body.notes??'').trim()
 if(!articleId||!roles.includes(reviewerRole)||!decisions.includes(decision)) return NextResponse.json({error:'Invalid review payload'},{status:400})
 const {data:review,error}=await supabase.from('review_tasks').insert({article_id:articleId,reviewer_role:reviewerRole,decision,notes:notes||null,required_changes:decision==='pass'?[]:[notes||'Revision required'],completed_at:new Date().toISOString()}).select('id,reviewer_role,decision,completed_at').single()
 if(error) return NextResponse.json({error:error.message},{status:500})
 return NextResponse.json({ok:true,review})
}
