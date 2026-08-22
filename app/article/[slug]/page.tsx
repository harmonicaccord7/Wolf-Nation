import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '../../../lib/supabase/server'
import { ArticleBody } from '../../../components/ArticleBody'
import { BookmarkButton } from '../../../components/BookmarkButton'

export default async function ArticlePage({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params; const supabase=await createClient()
 const {data:article}=await supabase.from('articles').select('id,headline,dek,body,confidence,reader_level,published_at,updated_at,disclaimer_variant,story_candidate_id').eq('slug',slug).maybeSingle()
 if(!article) notFound()
 const [{data:articleClaims},{data:articleLinks},{data:predictions},{data:corrections},{data:map}]=await Promise.all([
   supabase.from('claims').select('id,claim_text,claim_type,confidence,verification_status').eq('article_id',article.id),
   supabase.from('article_sources').select('claim,note,source:sources(id,title,publisher,url,source_type,published_at,reliability_score)').eq('article_id',article.id),
   supabase.from('predictions').select('statement,probability,target_metric,target_condition,horizon_start,horizon_end,invalidation_condition,status').eq('article_id',article.id),
   supabase.from('corrections').select('correction_text,reason,corrected_at').eq('article_id',article.id).order('corrected_at',{ascending:false}),
   supabase.from('impact_maps').select('id,title,summary').eq('article_id',article.id).order('version',{ascending:false}).limit(1).maybeSingle()
 ])
 let storyClaims:any[]=[]; let storyLinks:any[]=[]
 if(article.story_candidate_id){
   const [cr,sr]=await Promise.all([
    supabase.from('story_claims').select('id,claim_text,claim_type,confidence,verification_status').eq('story_candidate_id',article.story_candidate_id),
    supabase.from('story_sources').select('note,source:sources(id,title,publisher,url,source_type,published_at,reliability_score)').eq('story_candidate_id',article.story_candidate_id)
   ])
   storyClaims=cr.data??[]; storyLinks=sr.data??[]
 }
 const claims=storyClaims.length?storyClaims:(articleClaims??[])
 const links=storyLinks.length?storyLinks:(articleLinks??[])
 let nodes:any[]=[]; let edges:any[]=[]
 if(map){ const [nr,er]=await Promise.all([supabase.from('impact_nodes').select('id,label,node_type,horizon,probability,severity,direction,x,y').eq('impact_map_id',map.id),supabase.from('impact_edges').select('from_node_id,to_node_id,mechanism,strength,lag_label').eq('impact_map_id',map.id)]);nodes=nr.data??[];edges=er.data??[] }
 return <main className="investigation"><header className="investigationNav"><Link href="/">← KAPORAL INTELLIGENCE</Link><span>Independent research & education · Not financial advice</span></header><article>
   <section className="investigationHero"><div className="investigationMeta"><span>INVESTIGATION</span><span>{article.reader_level}</span><span>{article.confidence?`${article.confidence} confidence`:'confidence pending'}</span>{article.published_at&&<span>{new Date(article.published_at).toLocaleDateString('en-GB')}</span>}</div><h1>{article.headline}</h1>{article.dek&&<p>{article.dek}</p>}<div className="heroSave"><BookmarkButton articleId={article.id}/></div><div className="evidenceBar"><span>FACTS</span><span>DATA</span><span>INFERENCE</span><span>CONTRARIAN REVIEW</span><span>UNCERTAINTY</span></div></section>
   <section className="investigationLayout"><div className="investigationMain"><ArticleBody body={article.body}/>
     {map&&<section className="articleSection"><p className="eyebrow">KAPORAL IMPACT MAP</p><h2>{map.title}</h2>{map.summary&&<p>{map.summary}</p>}<div className="miniImpactGraph">{nodes.length?nodes.map(n=><div key={n.id} className={`miniNode ${n.direction??''}`}><small>{n.horizon??n.node_type}</small><b>{n.label}</b><span>{n.probability==null?'probability pending':`${n.probability}% probability`}</span></div>):<p>Impact graph is being built.</p>}</div>{edges.length>0&&<small className="graphFoot">{edges.length} causal links documented in the model.</small>}</section>}
     {predictions?.length? <section className="articleSection"><p className="eyebrow">PREDICTION LEDGER</p><h2>Forward statements we can later score.</h2><div className="predictionList">{predictions.map((p:any,i)=><article key={i}><b>{p.probability==null?'—':`${p.probability}%`}</b><div><strong>{p.statement}</strong><p>{p.invalidation_condition?`Invalidation: ${p.invalidation_condition}`:'Invalidation condition pending.'}</p></div><span>{p.status}</span></article>)}</div><Link className="ledgerLink" href="/track-record">Open full public track record ↗</Link></section>:null}
     {corrections?.length?<section className="articleSection correctionBox"><p className="eyebrow">CORRECTIONS</p>{corrections.map((c:any,i)=><p key={i}><strong>{new Date(c.corrected_at).toLocaleDateString('en-GB')}:</strong> {c.correction_text}</p>)}</section>:null}
   </div><aside className="investigationAside"><div className="asideCard"><small>YOUR RESEARCH SHELF</small><BookmarkButton articleId={article.id}/></div><div className="asideCard"><small>OUR RULE</small><h3>Explain. Don’t command.</h3><p>This publication does not provide personalized financial advice. Verify sources, assumptions and suitability before making any financial decision.</p></div><div className="asideCard"><small>CLAIM CHECK</small><h3>{claims.length} structured claims</h3>{claims.slice(0,8).map((c:any)=><div className="claimRow" key={c.id}><span>{c.verification_status}</span><p>{c.claim_text}</p></div>)}</div><div className="asideCard"><small>SOURCES</small><h3>{links.length} linked sources</h3>{links.map((l:any,i)=><a className="sourceRow" key={i} href={l.source?.url} target="_blank" rel="noreferrer"><b>{l.source?.publisher??'Source'}</b><span>{l.source?.title??l.claim??'Evidence'}</span></a>)}</div></aside></section>
   <footer className="investigationFoot"><Link href="/">KAPORAL INTELLIGENCE</Link><p>Published research is a time-stamped assessment, not a certainty. Markets and business conditions can change rapidly.</p></footer>
 </article></main>
}
