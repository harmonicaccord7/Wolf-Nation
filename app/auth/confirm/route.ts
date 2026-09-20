import type { EmailOtpType } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase/server'
import { safeAuthNext } from '../../../lib/auth/forms'

export const dynamic='force-dynamic'

export async function GET(request:NextRequest){
  const canonical=(process.env.NEXT_PUBLIC_SITE_URL||'https://www.kaporalintelligence.com').replace(/\/$/,'')
  const url=request.nextUrl
  const tokenHash=url.searchParams.get('token_hash')
  const type=url.searchParams.get('type') as EmailOtpType|null
  const code=url.searchParams.get('code')
  const next=type==='recovery'?'/auth/reset-password':safeAuthNext(url.searchParams.get('next'))
  const supabase=await createClient()
  let error:Error|null=null

  if(tokenHash&&type&&['signup','invite','magiclink','recovery','email_change','email'].includes(type)){
    const result=await supabase.auth.verifyOtp({type,token_hash:tokenHash})
    error=result.error
  }else if(code){
    const result=await supabase.auth.exchangeCodeForSession(code)
    error=result.error
  }else{
    error=new Error('Missing confirmation token')
  }

  const destination=new URL(error?(next==='/auth/reset-password'?'/auth/forgot-password?recovery=failed':'/auth?confirmation=failed'):next,canonical)
  if(!error) destination.searchParams.set('confirmed','1')
  const response=NextResponse.redirect(destination,303)
  response.headers.set('Cache-Control','no-store, max-age=0')
  response.headers.set('Referrer-Policy','no-referrer')
  return response
}
