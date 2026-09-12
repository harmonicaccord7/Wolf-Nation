import type { MetadataRoute } from 'next'
import { createClient } from '../lib/supabase/server'
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base='https://www.kaporalintelligence.com', now=new Date().toISOString()
  const routes=['','/markets','/events','/newsletter','/bitcoin','/crypto','/macro','/options','/africa','/business','/technology','/learn','/research','/track-record','/impact-map','/status','/about','/methodology','/contact','/disclosures','/corrections','/privacy','/terms']
  const db=await createClient()
  const [articles,series,events,issues]=await Promise.all([
    db.from('articles').select('slug,updated_at,published_at').eq('status','published').lte('published_at',now).order('published_at',{ascending:false}).limit(1000),
    db.from('data_series').select('code').eq('is_public',true).order('code').limit(1000),
    db.from('economic_events').select('slug,updated_at').in('status',['scheduled','cancelled']).order('scheduled_at',{ascending:false}).limit(1000),
    db.from('newsletter_issues').select('issue_key,published_at').eq('status','published').lte('published_at',now).order('published_at',{ascending:false}).limit(1000),
  ])
  const entries:MetadataRoute.Sitemap=[
    ...routes.map(route=>({url:base+route,changeFrequency:'daily' as const,priority:route?0.7:1})),
    ...['BTC','ETH','SOL',...(series.data??[]).map(s=>s.code)].map(code=>({url:base+'/data/'+code.toLowerCase(),changeFrequency:'daily' as const,priority:0.65})),
    ...(articles.data??[]).map(a=>({url:base+'/article/'+a.slug,lastModified:new Date(a.updated_at??a.published_at),priority:0.8})),
    ...(events.data??[]).map(e=>({url:base+'/events/'+e.slug,lastModified:new Date(e.updated_at),priority:0.7})),
    ...(issues.data??[]).map(i=>({url:base+'/newsletter/'+i.issue_key,lastModified:new Date(i.published_at),priority:0.7})),
  ]
  return [...new Map(entries.map(e=>[e.url,e])).values()]
}
