import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";

const H={"Content-Type":"application/json","Cache-Control":"no-store"};
const encoder=new TextEncoder();
const DEFAULT_FROM='KAPORAL INTELLIGENCE <intelligence@kaporalintelligence.com>';
const DEFAULT_TO='globalsupport@kaporalintelligence.com';

function json(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:H})}
function envJson(name:string){try{return JSON.parse(Deno.env.get(name)??"{}")}catch{return{}}}
function envValue(name:string,fallback=""){let value=Deno.env.get(name)?.trim()??"";const prefix=new RegExp(`^${name}\\s*=\\s*`,`i`);value=value.replace(prefix,"").trim();if((value.startsWith('"')&&value.endsWith('"'))||(value.startsWith("'")&&value.endsWith("'")))value=value.slice(1,-1).trim();return value||fallback}
function emailOk(v:string){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)&&v.length<=254}
async function sha(value:string){const b=await crypto.subtle.digest('SHA-256',encoder.encode(value));return Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('')}

Deno.serve(async(req:Request)=>{
  if(req.method!=="POST")return json({error:'POST required'},405);
  const body=await req.json().catch(()=>({}));
  if(String(body?.action??'')==='health')return json({ok:true,service:'support-contact',resendConfigured:Boolean(envValue('RESEND_API_KEY')),effectiveSender:envValue('NEWSLETTER_FROM_EMAIL',DEFAULT_FROM),destination:envValue('SUPPORT_TO_EMAIL',DEFAULT_TO)});

  const apikey=req.headers.get('apikey');
  if(!apikey||![...Object.values(envJson('SUPABASE_PUBLISHABLE_KEYS')),...Object.values(envJson('SUPABASE_SECRET_KEYS'))].includes(apikey))return json({error:'Unauthorized'},401);
  const url=Deno.env.get('SUPABASE_URL')!,secret=envJson('SUPABASE_SECRET_KEYS').default??Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!secret)return json({error:'Server configuration unavailable'},500);
  const db=createClient(url,secret,{auth:{persistSession:false}});
  const name=String(body?.name??'').trim().slice(0,120),email=String(body?.email??'').trim().toLowerCase().slice(0,254),subject=String(body?.subject??'Website enquiry').trim().slice(0,160),message=String(body?.message??'').trim().slice(0,5000),website=String(body?.website??'').trim();
  if(website)return json({ok:true,status:'received'});
  if(name.length<2||!emailOk(email)||subject.length<2||message.length<10)return json({ok:false,error:'Please complete all fields with a valid email address.'},400);
  const forwarded=String(req.headers.get('x-client-ip')??req.headers.get('x-forwarded-for')??'').split(',')[0].trim(),ipHash=forwarded?await sha(`${forwarded}|kaporal-contact`):null;
  const since=new Date(Date.now()-15*60_000).toISOString();
  if(ipHash){const {count}=await db.from('contact_messages').select('id',{count:'exact',head:true}).gte('created_at',since).eq('metadata->>ip_hash',ipHash);if((count??0)>=4)return json({ok:false,error:'Too many messages were submitted from this connection. Please wait 15 minutes and try again.'},429)}
  const {data:row,error}=await db.from('contact_messages').insert({name,email,subject,message,metadata:{ip_hash:ipHash,source:'website',delivery_status:'pending'}}).select('id').single();
  if(error)return json({ok:false,error:'Unable to save your message right now.'},500);

  const apiKey=envValue('RESEND_API_KEY'),from=envValue('NEWSLETTER_FROM_EMAIL',DEFAULT_FROM),to=envValue('SUPPORT_TO_EMAIL',DEFAULT_TO);
  let delivered=false,httpStatus:number|null=null;
  if(apiKey){const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({from,to:[to],reply_to:email,subject:`KAPORAL Support — ${subject}`,text:`New website message\n\nName: ${name}\nEmail: ${email}\nSubject: ${subject}\n\n${message}\n\nReference: ${row.id}`})});delivered=r.ok;httpStatus=r.status}
  await db.from('contact_messages').update({metadata:{ip_hash:ipHash,source:'website',delivery_status:delivered?'sent':apiKey?'provider_error':'provider_not_configured',delivery_http_status:httpStatus}}).eq('id',row.id);
  return json({ok:true,status:'received',reference:row.id,delivery:delivered?'sent':'stored'});
});
