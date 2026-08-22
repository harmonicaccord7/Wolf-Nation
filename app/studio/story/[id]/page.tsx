import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getStoryWorkspace } from '../../../../lib/data/content'
import { ResearchWorkspaceClient } from '../../../../components/ResearchWorkspaceClient'

export default async function StoryWorkspacePage({params}:{params:Promise<{id:string}>}){
 const {id}=await params
 const data=await getStoryWorkspace(id)
 if(!data.authorized) return <main className="studio-shell"><section className="studio-lock"><p className="eyebrow">KAPORAL RESEARCH OS</p><h1>Private research workspace</h1><p>Sign in with an approved researcher, editor or administrator account.</p><div className="lockActions"><Link href="/auth">Sign in</Link><Link href="/">Public site</Link></div></section></main>
 if('notFound' in data && data.notFound) notFound()
 const score=data.kScores?.[0]
 return <main className="studio-shell researchWorkspace"><header className="studio-head"><div><p className="eyebrow">KAPORAL RESEARCH OS · STORY WORKSPACE</p><h1>{data.story.title}</h1><p>{data.story.story_type} · {data.story.primary_region??'Global'} · {data.story.primary_sector??'Cross-asset'} · detected by {data.story.detected_by}</p></div><div className="workspaceActions"><Link href="/studio">← Command center</Link><Link href="/">Public site ↗</Link></div></header>
  <section className="storyThesis"><div><small>THESIS SEED</small><p>{data.story.thesis_seed||'No thesis seed yet.'}</p></div><div><small>K-SCORE</small><b>{score?.total_score==null?'—':Math.round(Number(score.total_score))}</b><span>{score?.total_score>=80?'Flagship candidate':score?.total_score>=65?'Standard analysis':score?.total_score>=45?'Watchlist':'Not scored / low priority'}</span></div><div><small>STATUS</small><b>{data.story.status}</b><span>{data.story.horizon??'horizon pending'}</span></div></section>
  <ResearchWorkspaceClient storyId={data.story.id} role={data.profile.role} sources={data.sourceLinks as any[]} claims={data.claims as any[]} runs={data.runs as any[]} articles={data.articles as any[]}/>
 </main>
}
