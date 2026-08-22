import { createClient } from '../supabase/server'

export async function getPublicTrackRecord(){
  const supabase=await createClient()
  const {data:predictions}=await supabase
    .from('predictions')
    .select('id,article_id,statement,probability,target_metric,target_condition,horizon_start,horizon_end,invalidation_condition,status,published_at')
    .not('published_at','is',null)
    .lte('published_at',new Date().toISOString())
    .order('published_at',{ascending:false})
    .limit(100)

  const ids=(predictions??[]).map((p:any)=>p.id)
  let resolutions:any[]=[]
  if(ids.length){
    const {data}=await supabase
      .from('prediction_resolutions')
      .select('id,prediction_id,resolved_at,outcome,score,evidence')
      .in('prediction_id',ids)
      .order('resolved_at',{ascending:false})
    resolutions=data??[]
  }
  const latestResolution=new Map<string,any>()
  for(const r of resolutions) if(!latestResolution.has(r.prediction_id)) latestResolution.set(r.prediction_id,r)

  const rows=(predictions??[]).map((p:any)=>({...p,resolution:latestResolution.get(p.id)??null}))
  const resolved=rows.filter((p:any)=>p.resolution)
  const numericScores=resolved.map((p:any)=>Number(p.resolution?.score)).filter((n:number)=>Number.isFinite(n))
  const meanScore=numericScores.length?numericScores.reduce((a:number,b:number)=>a+b,0)/numericScores.length:null
  const outcomeCounts=resolved.reduce((acc:Record<string,number>,p:any)=>{
    const key=String(p.resolution?.outcome??'unknown').toLowerCase(); acc[key]=(acc[key]??0)+1; return acc
  },{})
  return {rows,total:rows.length,resolved:resolved.length,open:rows.length-resolved.length,meanScore,outcomeCounts}
}

export async function getPublicImpactMaps(){
  const supabase=await createClient()
  const {data:articles}=await supabase
    .from('articles')
    .select('id,slug,headline,published_at')
    .eq('status','published')
    .not('published_at','is',null)
    .lte('published_at',new Date().toISOString())
  const articleMap=new Map((articles??[]).map((a:any)=>[a.id,a]))
  if(!articleMap.size) return []

  const {data:maps}=await supabase
    .from('impact_maps')
    .select('id,article_id,title,summary,version,created_at')
    .in('article_id',[...articleMap.keys()])
    .order('created_at',{ascending:false})
    .limit(40)
  if(!(maps??[]).length) return []

  const mapIds=(maps??[]).map((m:any)=>m.id)
  const [{data:nodes},{data:edges}]=await Promise.all([
    supabase.from('impact_nodes').select('id,impact_map_id,label,node_type,horizon,probability,severity,direction,x,y,metadata').in('impact_map_id',mapIds),
    supabase.from('impact_edges').select('id,impact_map_id,from_node_id,to_node_id,mechanism,strength,lag_label').in('impact_map_id',mapIds)
  ])
  return (maps??[]).map((m:any)=>({
    ...m,
    article:articleMap.get(m.article_id),
    nodes:(nodes??[]).filter((n:any)=>n.impact_map_id===m.id),
    edges:(edges??[]).filter((e:any)=>e.impact_map_id===m.id)
  }))
}
