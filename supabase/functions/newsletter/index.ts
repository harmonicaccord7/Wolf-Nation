import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";

const H={"Content-Type":"application/json","Cache-Control":"no-store"};
const encoder=new TextEncoder();
const CANONICAL_SITE="https://www.kaporalintelligence.com";
const DEFAULT_FROM="KAPORAL INTELLIGENCE <intelligence@kaporalintelligence.com>";

function json(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:H})}
function validEmail(v:string){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)&&v.length<=254}
function randomToken(){const b=new Uint8Array(32);crypto.getRandomValues(b);return Array.from(b,x=>x.toString(16).padStart(2,"0")).join("")}
async function sha256(value:string){const digest=await crypto.subtle.digest("SHA-256",encoder.encode(value));return Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,"0")).join("")}
function envValue(name:string,fallback=""){let value=Deno.env.get(name)?.trim()??"";const prefix=new RegExp(`^${name}\\s*=\\s*`,`i`);value=value.replace(prefix,"").trim();if((value.startsWith('"')&&value.endsWith('"'))||(value.startsWith("'")&&value.endsWith("'")))value=value.slice(1,-1).trim();return value||fallback}
function safeSite(){const configured=envValue("SITE_URL",CANONICAL_SITE).replace(/\/$/,"");return /localhost|127\.0\.0\.1/i.test(configured)?CANONICAL_SITE:configured}
function sanitizeProviderDetail(value:string){return value.replace(/Bearer\s+[A-Za-z0-9._-]+/gi,"Bearer [redacted]").slice(0,500)}

async function sendConfirmation(email:string,token:string,unsubscribeToken:string){
  const apiKey=envValue("RESEND_API_KEY");
  const from=envValue("NEWSLETTER_FROM_EMAIL",DEFAULT_FROM);
  const site=safeSite();
  if(!apiKey)return {sent:false,reason:"provider_not_configured",detail:"RESEND_API_KEY is not available to the newsletter function"};
  const confirm=`${site}/newsletter/confirm?token=${encodeURIComponent(token)}`;
  const unsubscribe=`${site}/newsletter/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;
  const response=await fetch("https://api.resend.com/emails",{
    method:"POST",
    headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json"},
    body:JSON.stringify({
      from,to:[email],subject:"Confirm your KAPORAL Market Letter subscription",
      text:`Confirm your KAPORAL Market Letter subscription:\n\n${confirm}\n\nIf you did not request this, no action is required.\n\nUnsubscribe: ${unsubscribe}`,
      html:`<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#132433"><p style="font-size:12px;letter-spacing:.14em;color:#9b7a37;font-weight:700">KAPORAL INTELLIGENCE</p><h1 style="font-size:26px">Confirm your Market Letter subscription</h1><p>Confirm that you want to receive the KAPORAL Market Letter.</p><p style="margin:28px 0"><a href="${confirm}" style="background:#d9b76a;color:#132433;text-decoration:none;padding:13px 18px;border-radius:8px;font-weight:700">Continue to confirmation</a></p><p>If you did not request this, no action is required.</p><p style="font-size:12px;color:#667681">You can unsubscribe at any time: <a href="${unsubscribe}">unsubscribe</a>.</p></div>`
    })
  });
  if(!response.ok){const detail=sanitizeProviderDetail(await response.text().catch(()=>""));return {sent:false,reason:`email_http_${response.status}`,detail}}
  return {sent:true,reason:"sent",detail:null};
}

Deno.serve(async(req:Request)=>{
  if(req.method!=="POST")return json({error:"POST required"},405);
  const body=await req.json().catch(()=>({}));
  const action=String(body?.action??"");
  if(action==="health")return json({ok:true,service:"newsletter",resendConfigured:Boolean(envValue("RESEND_API_KEY")),senderConfigured:Boolean(envValue("NEWSLETTER_FROM_EMAIL")),effectiveSender:envValue("NEWSLETTER_FROM_EMAIL",DEFAULT_FROM),siteUrl:safeSite(),productionSite:safeSite()===CANONICAL_SITE});
  const url=Deno.env.get("SUPABASE_URL")!;
  const secret=(JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")??"{}").default??Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
  if(!secret)return json({error:"Service credential unavailable"},500);
  const db=createClient(url,secret,{auth:{persistSession:false}});
  try{
    if(action==="subscribe"){
      const email=String(body?.email??"").trim().toLowerCase(),source=String(body?.source??"website").slice(0,80);
      if(!validEmail(email))return json({ok:false,error:"invalid_email"},400);
      const {data:existing}=await db.from("newsletter_subscribers").select("status,last_confirmation_sent_at").eq("email",email).maybeSingle();
      if(existing?.status==="confirmed")return json({ok:true,status:"already_confirmed"});
      if(existing?.last_confirmation_sent_at&&Date.now()-Date.parse(existing.last_confirmation_sent_at)<10*60e3)return json({ok:true,status:"pending",delivery:"recently_sent"});
      const confirmToken=randomToken(),unsubscribeToken=randomToken(),confirmHash=await sha256(confirmToken),unsubscribeHash=await sha256(unsubscribeToken),expires=new Date(Date.now()+48*3600e3).toISOString();
      const {error}=await db.from("newsletter_subscribers").upsert({email,status:"pending",source,consent_at:new Date().toISOString(),confirm_token_hash:confirmHash,confirm_expires_at:expires,unsubscribe_token_hash:unsubscribeHash,unsubscribed_at:null},{onConflict:"email"});
      if(error)throw error;
      const delivery=await sendConfirmation(email,confirmToken,unsubscribeToken),attemptedAt=new Date().toISOString();
      await db.from("newsletter_subscribers").update({last_confirmation_sent_at:delivery.sent?attemptedAt:null,last_delivery_attempt_at:attemptedAt,last_delivery_status:delivery.reason,last_delivery_error:delivery.sent?null:delivery.detail}).eq("email",email);
      return json({ok:true,status:"pending",delivery:delivery.reason});
    }
    if(action==="confirm"){
      const token=String(body?.token??"");if(token.length<40)return json({ok:false,status:"invalid"},400);const hash=await sha256(token);
      const {data,error}=await db.from("newsletter_subscribers").update({status:"confirmed",confirmed_at:new Date().toISOString(),confirm_token_hash:null,confirm_expires_at:null}).eq("confirm_token_hash",hash).eq("status","pending").gt("confirm_expires_at",new Date().toISOString()).select("id").maybeSingle();if(error)throw error;return json({ok:Boolean(data),status:data?"confirmed":"invalid_or_expired"},data?200:400);
    }
    if(action==="unsubscribe"){
      const token=String(body?.token??"");if(token.length<40)return json({ok:false,status:"invalid"},400);const hash=await sha256(token);
      const {data,error}=await db.from("newsletter_subscribers").update({status:"unsubscribed",unsubscribed_at:new Date().toISOString()}).eq("unsubscribe_token_hash",hash).neq("status","unsubscribed").select("id").maybeSingle();if(error)throw error;return json({ok:true,status:data?"unsubscribed":"already_or_invalid"});
    }
    return json({error:"unknown_action"},400);
  }catch(e){console.error("newsletter",e);return json({ok:false,error:"newsletter_operation_failed"},500)}
});
