import { NextResponse } from 'next/server'
import { newsletterAction } from '../../../../lib/newsletter'

export async function POST(request:Request){
 const body=await request.json().catch(()=>({})),email=String(body?.email??'').trim().toLowerCase()
 if(!email||email.length>254)return NextResponse.json({ok:false,error:'invalid_email'},{status:400,headers:{'Cache-Control':'no-store'}})
 const result=await newsletterAction('subscribe',{email,source:'website'})
 return NextResponse.json(result,{status:result.ok?200:503,headers:{'Cache-Control':'no-store'}})
}
