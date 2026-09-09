import type { EmailOtpType } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase/server'

export const dynamic='force-dynamic'

function safeNext(value:string|null){
  if(!value||!value.startsWith('/')||value.startsWith('//')) return '/account'
  return value
}

export async function GET(request:NextRequest){
  const canonical=(process.env.NEXT_PUBLIC_SITE_URL||'https://www.kaporalintelligence.com').replace(/\/$/,'')
  const url=request.nextUrl
  const tokenHash=url.searchParams.get('token_hash')
  const type=url.searchParams.get('type') as EmailOtpType|null
  const code=url.searchParams.get('code')
  const next=safeNext(url.searchParams.get('next'))
  const supabase=await createClient()
  let error:Error|null=null

  if(tokenHash&&type){
    const result=await supabase.auth.verifyOtp({type,token_hash:tokenHash})
    error=result.error
  }else if(code){
    const result=await supabase.auth.exchangeCodeForSession(code)
    error=result.error
  }else{
    error=new Error('Missing confirmation token')
  }

  const destination=new URL(error?'/auth?confirmation=failed':next,canonical)
  if(!error) destination.searchParams.set('confirmed','1')
  return NextResponse.redirect(destination,303)
}
