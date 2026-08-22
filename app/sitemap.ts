import type { MetadataRoute } from 'next'
import { createClient } from '../lib/supabase/server'

export default async function sitemap():Promise<MetadataRoute.Sitemap>{
 const base='https://www.kaporalintelligence.com'
 const staticRoutes=['','/markets','/bitcoin','/crypto','/macro','/options','/africa','/business','/technology','/learn','/research','/track-record','/impact-map','/about','/methodology','/disclosures','/corrections','/privacy','/terms']
 const supabase=await createClient()
 const {data:articles}=await supabase.from('articles').select('slug,updated_at,published_at').eq('status','published').lte('published_at',new Date().toISOString()).order('published_at',{ascending:false}).limit(1000)
 return [
  ...staticRoutes.map((route,i)=>({url:`${base}${route}`,lastModified:new Date(),changeFrequency:i===0?'hourly' as const:'daily' as const,priority:i===0?1:0.7})),
  ...(articles??[]).map(a=>({url:`${base}/article/${a.slug}`,lastModified:new Date(a.updated_at??a.published_at??Date.now()),changeFrequency:'weekly' as const,priority:0.8}))
 ]
}
