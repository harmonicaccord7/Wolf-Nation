import { createHash, randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'

function hash(value:string){return createHash('sha256').update(value).digest('hex')}
function escapeHtml(value:string){return value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c] as string))}

export async function POST(req:Request){
 const body=await req.json().catch(()=>({}));const email=String(body.email??'').trim().toLowerCase();const honeypot=String(body.website??'').trim()
 if(honeypot) return NextResponse.json({ok:true,message:'Check your inbox to confirm.'})
 if(!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({error:'Enter a valid email address.'},{status:400})
 const confirmToken=randomBytes(32).toString('hex');const unsubscribeToken=randomBytes(32).toString('hex');const expires=new Date(Date.now()+48*60*60*1000).toISOString();const supabase=await createClient()
 const {data:requestStatus,error}=await supabase.rpc('request_newsletter_subscription',{p_email:email,p_source:'website_footer',p_confirm_hash:hash(confirmToken),p_unsubscribe_hash:hash(unsubscribeToken),p_expires_at:expires})
 if(error) return NextResponse.json({error:'Subscription request could not be saved.'},{status:500})
 if(requestStatus==='already_confirmed') return NextResponse.json({ok:true,state:'confirmed',message:'This email is already confirmed for The KAPORAL Market Letter.'})
 const resendKey=process.env.RESEND_API_KEY;const from=process.env.NEWSLETTER_FROM_EMAIL
 if(!resendKey||!from) return NextResponse.json({ok:true,state:'pending_email_configuration',message:'Your subscription request is saved. Confirmation email delivery is being configured.'})
 const base=process.env.NEXT_PUBLIC_SITE_URL||new URL(req.url).origin;const confirmUrl=`${base}/newsletter/confirm?token=${encodeURIComponent(confirmToken)}`;const unsubscribeUrl=`${base}/newsletter/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`
 const emailRes=await fetch('https://api.resend.com/emails',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${resendKey}`},body:JSON.stringify({from,to:[email],subject:'Confirm The KAPORAL Market Letter',html:`<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto"><h2>KAPORAL INTELLIGENCE</h2><p>Confirm your subscription to The KAPORAL Market Letter.</p><p><a href="${escapeHtml(confirmUrl)}" style="display:inline-block;padding:12px 18px;background:#b58a35;color:#08131f;text-decoration:none;border-radius:999px;font-weight:700">Confirm subscription</a></p><p>This link expires in 48 hours.</p><p style="font-size:12px;color:#667">Independent research & education — not financial advice.</p><p style="font-size:11px"><a href="${escapeHtml(unsubscribeUrl)}">Unsubscribe</a></p></div>`,tags:[{name:'category',value:'newsletter_confirmation'}]})})
 if(!emailRes.ok) return NextResponse.json({ok:true,state:'pending_delivery_error',message:'Your request is saved, but the confirmation email could not be delivered yet.'})
 return NextResponse.json({ok:true,state:'pending',message:'Check your inbox and confirm within 48 hours.'})
}
