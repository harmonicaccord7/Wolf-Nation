import { NextRequest, NextResponse } from 'next/server'

export const runtime='nodejs'

export async function POST(request:NextRequest){
  const contentLength=Number(request.headers.get('content-length')||0)
  if(contentLength>20_000) return NextResponse.json({ok:false,error:'Message payload is too large.'},{status:413})

  const url=process.env.NEXT_PUBLIC_SUPABASE_URL
  const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if(!url||!key) return NextResponse.json({ok:false,error:'Support is temporarily unavailable.'},{status:503})

  const body=await request.json().catch(()=>null)
  if(!body||typeof body!=='object') return NextResponse.json({ok:false,error:'Invalid request.'},{status:400})

  const forwarded=request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||request.headers.get('x-real-ip')||''
  try{
    const response=await fetch(`${url}/functions/v1/support-contact`,{
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':key,'x-client-ip':forwarded},
      body:JSON.stringify(body),
      cache:'no-store'
    })
    const data=await response.json().catch(()=>({ok:false,error:'Support service returned an unreadable response.'}))
    return NextResponse.json(data,{status:response.status,headers:{'Cache-Control':'no-store'}})
  }catch{
    return NextResponse.json({ok:false,error:'Unable to reach support right now. Please try again shortly.'},{status:502,headers:{'Cache-Control':'no-store'}})
  }
}
