import { NextResponse } from 'next/server'
import { newsletterAction } from '../../../../lib/newsletter'

export const dynamic='force-dynamic'

export async function POST(request:Request){
  const body=await request.json().catch(()=>({}))
  const token=String(body?.token??'')
  if(token.length<40)return NextResponse.json({ok:false,error:'invalid_token'},{status:400,headers:{'Cache-Control':'no-store'}})
  const result=await newsletterAction('confirm',{token})
  return NextResponse.json(result,{status:result.ok?200:400,headers:{'Cache-Control':'no-store'}})
}
