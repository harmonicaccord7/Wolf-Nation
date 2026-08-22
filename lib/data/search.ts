import { createClient } from '../supabase/server'
import { primaryNav,institutionalNav } from '../navigation'

export type PublicSearchResult={
  key:string; kind:'research'|'data'|'desk'|'page'; title:string; summary:string|null; href:string; meta:string|null
}

function cleanQuery(query:string){return query.trim().replace(/[,%()]/g,' ').replace(/\s+/g,' ').slice(0,100)}

export async function searchPublicIntelligence(query:string):Promise<PublicSearchResult[]>{
  const q=cleanQuery(query)
  if(q.length<2)return []
  const supabase=await createClient()
  const [{data:articles},{data:series},{data:pages}]=await Promise.all([
    supabase.from('articles').select('id,slug,headline,dek,confidence,reader_level,published_at').eq('status','published').not('published_at','is',null).lte('published_at',new Date().toISOString()).or(`headline.ilike.%${q}%,dek.ilike.%${q}%`).order('published_at',{ascending:false}).limit(20),
    supabase.from('data_series').select('id,code,label,description,category,frequency').eq('is_public',true).or(`code.ilike.%${q}%,label.ilike.%${q}%,description.ilike.%${q}%,category.ilike.%${q}%`).order('sort_order').limit(20),
    supabase.from('site_pages').select('slug,title,summary,eyebrow').eq('status','published').not('published_at','is',null).lte('published_at',new Date().toISOString()).or(`title.ilike.%${q}%,summary.ilike.%${q}%`).limit(12)
  ])

  const needle=q.toLowerCase()
  const nav=[...primaryNav,...institutionalNav]
    .filter(item=>item.label.toLowerCase().includes(needle)||item.href.slice(1).replaceAll('-',' ').includes(needle))
    .map(item=>({key:`desk:${item.href}`,kind:'desk' as const,title:item.label,summary:'Open the KAPORAL intelligence section.',href:item.href,meta:'Section'}))

  const research=(articles??[]).map((a:any)=>({key:`article:${a.id}`,kind:'research' as const,title:a.headline,summary:a.dek,href:`/article/${a.slug}`,meta:a.confidence?`${a.confidence} confidence`:a.reader_level}))
  const data=(series??[]).map((s:any)=>({key:`data:${s.id}`,kind:'data' as const,title:s.label,summary:s.description,href:`/data/${String(s.code).toLowerCase()}`,meta:[s.code,s.frequency].filter(Boolean).join(' · ')}))
  const institutional=(pages??[]).map((p:any)=>({key:`page:${p.slug}`,kind:'page' as const,title:p.title,summary:p.summary,href:`/${p.slug}`,meta:p.eyebrow??'Policy & methodology'}))
  const seen=new Set<string>()
  return [...research,...data,...nav,...institutional].filter(r=>seen.has(r.href)?false:(seen.add(r.href),true)).slice(0,50)
}
