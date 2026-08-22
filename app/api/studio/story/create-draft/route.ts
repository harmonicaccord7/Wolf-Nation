import { NextResponse } from 'next/server'
import { createClient } from '../../../../../lib/supabase/server'

function slugify(value:string){return value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'').slice(0,80)}

export async function POST(req:Request){
 const supabase=await createClient()
 const {data:authData}=await supabase.auth.getClaims()
 const userId=authData?.claims?.sub
 if(!userId) return NextResponse.json({error:'Authentication required'},{status:401})
 const {data:profile}=await supabase.from('profiles').select('role').eq('id',userId).maybeSingle()
 if(!profile || !['editor','admin'].includes(profile.role)) return NextResponse.json({error:'Editor role required'},{status:403})
 const body=await req.json().catch(()=>({})); const storyId=String(body.storyId??'')
 const {data:story}=await supabase.from('story_candidates').select('id,title,thesis_seed').eq('id',storyId).maybeSingle()
 if(!story) return NextResponse.json({error:'Story not found'},{status:404})
 const {data:existing}=await supabase.from('articles').select('id,slug,status').eq('story_candidate_id',storyId).limit(1).maybeSingle()
 if(existing) return NextResponse.json({ok:true,article:existing,existing:true})
 const slug=`${slugify(story.title)}-${story.id.slice(0,8)}`
 const {data:article,error}=await supabase.from('articles').insert({story_candidate_id:story.id,headline:story.title,slug,dek:null,reader_level:'research',status:'researching',confidence:null,body:{version:1,blocks:[]},is_featured:false}).select('id,slug,status').single()
 if(error) return NextResponse.json({error:error.message},{status:500})
 await supabase.from('story_candidates').update({status:'researching'}).eq('id',story.id)
 return NextResponse.json({ok:true,article})
}
