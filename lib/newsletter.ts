export type NewsletterResult={ok:boolean;status?:string;delivery?:string;error?:string}

export async function newsletterAction(action:'subscribe'|'confirm'|'unsubscribe',payload:Record<string,unknown>):Promise<NewsletterResult>{
 const base=process.env.NEXT_PUBLIC_SUPABASE_URL
 if(!base)return {ok:false,error:'newsletter_not_configured'}
 try{
  const response=await fetch(`${base}/functions/v1/newsletter`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...payload}),cache:'no-store'})
  const data=await response.json().catch(()=>({}))
  return {ok:Boolean(data?.ok),status:data?.status,delivery:data?.delivery,error:data?.error}
 }catch{return {ok:false,error:'newsletter_unavailable'}}
}
