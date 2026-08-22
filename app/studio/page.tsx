import Link from 'next/link'
import { getStudioOverview } from '../../lib/data/content'
import { ArticleDraftForm, KScoreForm, StoryIntakeForm } from '../../components/StoryIntakeForm'

export default async function StudioPage(){
  const data = await getStudioOverview()
  if(!data.authorized){return <main className="studio-shell"><section className="studio-lock"><p className="eyebrow">KAPORAL RESEARCH OS</p><h1>Private newsroom workspace</h1><p>Authentication is active. This workspace is visible only to approved researchers, editors and administrators.</p><div className="lockActions"><Link href="/auth">Sign in</Link><Link href="/">Return to public intelligence</Link></div></section></main>}
  const canEdit=['editor','admin'].includes(data.profile.role)
  return <main className="studio-shell"><section className="studio-head"><div><p className="eyebrow">KAPORAL RESEARCH OS</p><h1>Newsroom Command Center</h1><p>{data.profile.display_name ?? 'Editor'} · {data.profile.role}</p></div><Link href="/">Public site ↗</Link></section>
    <section className="studio-kpis"><div><small>STORY QUEUE</small><b>{data.stories.length}</b></div><div><small>EDITORIAL PIPELINE</small><b>{data.articles.length}</b></div><div><small>REVIEW TASKS</small><b>{data.reviews.length}</b></div><div><small>MODE</small><b>{canEdit?'Editorial':'Research'}</b></div></section>
    <section className="studio-grid">
      <article className="studio-panel"><h2>Signal & story queue</h2>{data.stories.length?data.stories.map((s:any)=><div className="studio-row" key={s.id}><strong>{s.title}</strong><span>{s.status}</span></div>):<p>No story candidates yet.</p>}</article>
      <article className="studio-panel"><h2>Editorial pipeline</h2>{data.articles.length?data.articles.map((a:any)=><div className="studio-row" key={a.id}><strong>{a.headline}</strong><span>{a.status}</span></div>):<p>No articles yet.</p>}</article>
      <article className="studio-panel"><h2>Adversarial review</h2>{data.reviews.length?data.reviews.map((r:any)=><div className="studio-row" key={r.id}><strong>{r.reviewer_role}</strong><span>{r.decision ?? 'pending'}</span></div>):<p>No review tasks yet.</p>}</article>
      <article className="studio-panel"><h2>Agent desk</h2><div className="agent-pills"><span>Signal Scout</span><span>Niche Scout</span><span>Source Analyst</span><span>Macro</span><span>Crypto</span><span>Options</span><span>Africa</span><span>Business</span><span>Technology</span><span>Contrarian</span><span>Quant</span><span>Standards</span></div></article>
    </section>
    <section className="studio-tools"><StoryIntakeForm/><KScoreForm stories={data.stories.map((s:any)=>({id:s.id,title:s.title}))}/>{canEdit&&<ArticleDraftForm/>}</section>
  </main>
}
