import { NextResponse } from 'next/server'
import { createClient } from '../../../../../lib/supabase/server'

export const dynamic='force-dynamic'

const AGENTS:Record<string,string>={
  niche_scout:'Assess strategic importance, novelty, audience value and whether the story deserves research resources.',
  source_analyst:'Audit the source pack. Identify primary-source gaps, weak evidence, contradictions and specific documents or datasets still needed.',
  macro_analyst:'Analyze monetary, fiscal, rates, liquidity, FX, inflation and cross-asset transmission mechanisms.',
  crypto_analyst:'Analyze Bitcoin and crypto market structure, flows, regulation, adoption, liquidity and on-chain or derivatives implications when supported.',
  options_analyst:'Analyze volatility, options positioning, open interest, skew, term structure and expiry mechanics. Do not recommend personalized trades.',
  africa_analyst:'Analyze consequences for African economies, markets, currencies, trade, fintech, infrastructure and business conditions. Avoid treating Africa as one market.',
  business_analyst:'Analyze winners, losers, business-model consequences, financing conditions, supply chains and opportunity/risk mechanisms.',
  technology_analyst:'Analyze AI, semiconductors, cyber, energy systems, infrastructure and technology-policy implications.',
  contrarian_reviewer:'Attack the leading thesis. Find plausible alternative explanations, missing variables, base-rate errors and evidence that would invalidate it.',
  quant_reviewer:'Audit numerical claims, units, denominators, time windows, correlations, statistical assumptions and model uncertainty.',
  standards_reviewer:'Audit sourcing, fact-vs-inference separation, conflicts, wording, financial-advice risk, uncertainty disclosure and publication readiness.',
  visual_intelligence_editor:'Propose evidence-bearing charts, causal diagrams, maps and tables. Reject decorative graphics that do not help prove or explain the thesis.'
}

function stripFences(value:string){return value.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim()}

export async function POST(req:Request){
  const supabase=await createClient()
  const {data:authData}=await supabase.auth.getClaims()
  const userId=authData?.claims?.sub
  if(!userId) return NextResponse.json({error:'Authentication required'},{status:401})
  const {data:profile}=await supabase.from('profiles').select('role,display_name').eq('id',userId).maybeSingle()
  if(!profile || !['researcher','editor','admin'].includes(profile.role)) return NextResponse.json({error:'Research role required'},{status:403})

  const body=await req.json().catch(()=>({}))
  const storyId=String(body.storyId??'')
  const agent=String(body.agent??'')
  if(!storyId || !AGENTS[agent]) return NextResponse.json({error:'Valid storyId and agent are required'},{status:400})

  const [{data:story},{data:sourceLinks},{data:claims},{data:series}]=await Promise.all([
    supabase.from('story_candidates').select('id,title,thesis_seed,status,story_type,horizon,primary_region,primary_sector,raw_context').eq('id',storyId).maybeSingle(),
    supabase.from('story_sources').select('note,source:sources(id,url,title,publisher,source_type,published_at,reliability_score)').eq('story_candidate_id',storyId),
    supabase.from('story_claims').select('id,claim_text,claim_type,confidence,verification_status,evidence_note').eq('story_candidate_id',storyId),
    supabase.from('data_series').select('id,code,label,desk_slug,region,unit,frequency').eq('is_public',true).limit(40)
  ])
  if(!story) return NextResponse.json({error:'Story not found'},{status:404})

  const seriesIds=(series??[]).map((s:any)=>s.id)
  const {data:points}=seriesIds.length?await supabase.from('data_points').select('series_id,observed_at,value,provider').in('series_id',seriesIds).order('observed_at',{ascending:false}).limit(120):{data:[] as any[]}
  const latest=new Map<string,any>()
  for(const p of points??[]) if(!latest.has(p.series_id)) latest.set(p.series_id,p)
  const liveMetrics=(series??[]).flatMap((s:any)=>{const p=latest.get(s.id);return p?[{code:s.code,label:s.label,desk:s.desk_slug,region:s.region,unit:s.unit,frequency:s.frequency,value:p.value,observed_at:p.observed_at,provider:p.provider}]:[]})

  const sourcePack=(sourceLinks??[]).map((link:any)=>({id:link.source?.id,title:link.source?.title,publisher:link.source?.publisher,url:link.source?.url,type:link.source?.source_type,published_at:link.source?.published_at,reliability_score:link.source?.reliability_score,note:link.note}))
  const input={story,sourcePack,claims:claims??[],liveMetrics}
  const prompt=`You are the KAPORAL INTELLIGENCE ${agent.replaceAll('_',' ').toUpperCase()}.
Mandate: ${AGENTS[agent]}

NON-NEGOTIABLE RULES:
- Use only the evidence supplied below. Never invent a source, statistic, quote, interview, date or market observation.
- Separate verified fact, market data, editorial inference, scenario and uncertainty.
- If evidence is insufficient, say exactly what is missing.
- Treat forecasts as conditional and state invalidation conditions.
- Do not provide personalized investment instructions or tell a reader what to buy or sell.
- You may propose claims and next research actions. You may NOT decide to publish.
- Source references must use the supplied source IDs or metric codes.

Return ONLY valid JSON with this shape:
{"executive_summary":"","confidence":"low|medium|high","findings":[{"text":"","evidence_refs":["source-id-or-metric-code"],"classification":"fact|data|inference|scenario|uncertainty"}],"counterarguments":[""],"open_questions":[""],"next_actions":[""],"proposed_claims":[{"claim_text":"","claim_type":"factual|inference|scenario|forecast|question","confidence":"low|medium|high","evidence_note":""}],"visualizations":[{"title":"","type":"chart|table|map|causal_diagram","purpose":"","evidence_refs":[""]}],"publication_readiness":"not_ready|needs_review|research_complete","readiness_reason":""}

RESEARCH PACK:
${JSON.stringify(input)}`

  const startedAt=new Date().toISOString()
  const model=process.env.KAPORAL_RESEARCH_MODEL || 'openai/gpt-5.6-sol'
  const {data:run,error:runError}=await supabase.from('research_runs').insert({story_candidate_id:storyId,agent_name:agent,run_type:'story_analysis',model,status:'running',requested_by:userId,prompt_version:'v0.5-agent-contract-1',structured_output:{},started_at:startedAt}).select('id').single()
  if(runError) return NextResponse.json({error:runError.message},{status:500})

  const token=process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN
  if(!token){
    await supabase.from('research_runs').update({status:'failed',error:'AI Gateway credential unavailable',completed_at:new Date().toISOString()}).eq('id',run.id)
    return NextResponse.json({error:'AI Gateway is not configured for this deployment.'},{status:503})
  }

  try{
    const gateway=await fetch('https://ai-gateway.vercel.sh/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({model,messages:[{role:'user',content:prompt}],temperature:0.2})})
    const raw=await gateway.text()
    if(!gateway.ok) throw new Error(`AI Gateway ${gateway.status}: ${raw.slice(0,400)}`)
    const envelope=JSON.parse(raw)
    const text=String(envelope?.choices?.[0]?.message?.content??'')
    const structured=JSON.parse(stripFences(text))
    const completedAt=new Date().toISOString()
    await supabase.from('research_runs').update({status:'completed',output_summary:String(structured.executive_summary??'').slice(0,2000),structured_output:structured,completed_at:completedAt,model_metadata:{gateway:'vercel-ai-gateway',model,usage:envelope?.usage??null}}).eq('id',run.id)
    return NextResponse.json({ok:true,runId:run.id,agent,model,output:structured})
  }catch(error){
    const message=error instanceof Error?error.message:'Unknown agent failure'
    await supabase.from('research_runs').update({status:'failed',error:message,completed_at:new Date().toISOString()}).eq('id',run.id)
    return NextResponse.json({error:message},{status:502})
  }
}
