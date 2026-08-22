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

async function getResearchIdentity(){
  const supabase=await createClient()
  const {data}=await supabase.auth.getClaims()
  const claims=data?.claims
  if(!claims?.sub) return {supabase,authorized:false as const}
  const {data:profile}=await supabase.from('profiles').select('id,role,display_name').eq('id',claims.sub).maybeSingle()
  if(!profile || !['researcher','editor','admin'].includes(profile.role)) return {supabase,authorized:false as const}
  return {supabase,authorized:true as const,profile}
}

export async function getStudioOverview() {
  const identity=await getResearchIdentity()
  if(!identity.authorized) return {authorized:false as const}
  const {supabase,profile}=identity
  const [{ data: stories }, { data: articles }, { data: reviews }, {data:runs}] = await Promise.all([
    supabase.from('story_candidates').select('id,title,status,story_type,detected_at,detected_by,primary_region,primary_sector').order('detected_at',{ascending:false}).limit(30),
    supabase.from('articles').select('id,headline,status,confidence,updated_at,story_candidate_id').order('updated_at',{ascending:false}).limit(30),
    supabase.from('review_tasks').select('id,reviewer_role,decision,completed_at,article_id').order('created_at',{ascending:false}).limit(30),
    supabase.from('research_runs').select('id,agent_name,run_type,status,model,story_candidate_id,article_id,started_at,completed_at,error').order('started_at',{ascending:false}).limit(30)
  ])
  return {authorized:true as const,profile,stories:stories??[],articles:articles??[],reviews:reviews??[],runs:runs??[]}
}

export async function getStoryWorkspace(id:string){
  const identity=await getResearchIdentity()
  if(!identity.authorized) return {authorized:false as const}
  const {supabase,profile}=identity
  const {data:story}=await supabase.from('story_candidates').select('id,title,thesis_seed,status,story_type,horizon,primary_region,primary_sector,detected_at,detected_by,raw_context').eq('id',id).maybeSingle()
  if(!story) return {authorized:true as const,profile,notFound:true as const}
  const [{data:kScores},{data:sourceLinks},{data:claims},{data:runs},{data:articles}]=await Promise.all([
    supabase.from('k_scores').select('*').eq('story_candidate_id',id).order('created_at',{ascending:false}).limit(5),
    supabase.from('story_sources').select('story_candidate_id,source_id,note,created_at,source:sources(id,url,title,publisher,source_type,published_at,accessed_at,reliability_score)').eq('story_candidate_id',id).order('created_at',{ascending:false}),
    supabase.from('story_claims').select('id,claim_text,claim_type,confidence,verification_status,evidence_note,created_at,updated_at').eq('story_candidate_id',id).order('created_at',{ascending:false}),
    supabase.from('research_runs').select('id,agent_name,run_type,status,model,output_summary,structured_output,started_at,completed_at,error,prompt_version').eq('story_candidate_id',id).order('started_at',{ascending:false}).limit(30),
    supabase.from('articles').select('id,headline,slug,status,confidence,reader_level,updated_at').eq('story_candidate_id',id).order('updated_at',{ascending:false})
  ])
  return {authorized:true as const,profile,story,kScores:kScores??[],sourceLinks:sourceLinks??[],claims:claims??[],runs:runs??[],articles:articles??[]}
}

export async function getArticleWorkspace(id:string){
  const identity=await getResearchIdentity()
  if(!identity.authorized) return {authorized:false as const}
  const {supabase,profile}=identity
  const {data:article}=await supabase.from('articles').select('id,headline,slug,dek,body,status,confidence,reader_level,story_candidate_id,updated_at,published_at').eq('id',id).maybeSingle()
  if(!article) return {authorized:true as const,profile,notFound:true as const}

  const evidenceSources=article.story_candidate_id
    ? supabase.from('story_sources').select('note,source:sources(id,url,title,publisher,source_type,published_at,reliability_score)').eq('story_candidate_id',article.story_candidate_id)
    : supabase.from('article_sources').select('claim,note,source:sources(id,url,title,publisher,source_type,published_at,reliability_score)').eq('article_id',id)
  const evidenceClaims=article.story_candidate_id
    ? supabase.from('story_claims').select('id,claim_text,claim_type,confidence,verification_status,created_at').eq('story_candidate_id',article.story_candidate_id)
    : supabase.from('claims').select('id,claim_text,claim_type,confidence,verification_status,created_at').eq('article_id',id)

  const [{data:reviews},sourceResult,claimResult,{data:predictions},{data:runs},{data:impactMap}]=await Promise.all([
    supabase.from('review_tasks').select('id,reviewer_role,decision,notes,required_changes,completed_at,created_at').eq('article_id',id).order('created_at',{ascending:false}),
    evidenceSources,
    evidenceClaims,
    supabase.from('predictions').select('id,statement,probability,target_metric,target_condition,horizon_start,horizon_end,invalidation_condition,status,published_at').eq('article_id',id).order('published_at',{ascending:false}),
    supabase.from('research_runs').select('id,agent_name,run_type,status,model,output_summary,started_at,completed_at,error').eq('article_id',id).order('started_at',{ascending:false}).limit(30),
    supabase.from('impact_maps').select('id,title,summary,version,created_at').eq('article_id',id).order('version',{ascending:false}).limit(1).maybeSingle()
  ])
  let impactNodes:any[]=[];let impactEdges:any[]=[]
  if(impactMap){
    const [{data:nodes},{data:edges}]=await Promise.all([
      supabase.from('impact_nodes').select('id,label,node_type,horizon,probability,severity,direction,x,y,metadata').eq('impact_map_id',impactMap.id).order('created_at',{ascending:true}),
      supabase.from('impact_edges').select('id,from_node_id,to_node_id,mechanism,strength,lag_label').eq('impact_map_id',impactMap.id)
    ])
    impactNodes=nodes??[];impactEdges=edges??[]
  }
  return {authorized:true as const,profile,article,reviews:reviews??[],sources:sourceResult.data??[],claims:claimResult.data??[],predictions:predictions??[],runs:runs??[],impactMap,impactNodes,impactEdges}
}
