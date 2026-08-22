import { createClient } from '../supabase/server'

export async function getHomeContent() {
  const supabase = await createClient()
  const [{ data: articles }, { data: signals }, { data: desks }] = await Promise.all([
    supabase.from('articles').select('id,slug,headline,dek,confidence,reader_level,published_at,is_featured').order('published_at',{ascending:false}).limit(8),
    supabase.from('signals').select('code,label,value,unit,regime,score,direction,region,as_of,provider').order('as_of',{ascending:false}).limit(12),
    supabase.from('desks').select('slug,name,description,is_featured,sort_order').order('sort_order')
  ])
  return { articles: articles ?? [], signals: signals ?? [], desks: desks ?? [] }
}

export async function getStudioOverview() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (!claims?.sub) return { authorized:false as const }
  const { data: profile } = await supabase.from('profiles').select('role,display_name').eq('id',claims.sub).maybeSingle()
  if (!profile || !['researcher','editor','admin'].includes(profile.role)) return { authorized:false as const }
  const [{ data: stories }, { data: articles }, { data: reviews }] = await Promise.all([
    supabase.from('story_candidates').select('id,title,status,story_type,detected_at').order('detected_at',{ascending:false}).limit(20),
    supabase.from('articles').select('id,headline,status,confidence,updated_at').order('updated_at',{ascending:false}).limit(20),
    supabase.from('review_tasks').select('id,reviewer_role,decision,completed_at,article_id').order('created_at',{ascending:false}).limit(20)
  ])
  return { authorized:true as const, profile, stories:stories??[], articles:articles??[], reviews:reviews??[] }
}
