import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getArticleWorkspace } from '../../../../lib/data/content'
import { ArticleReviewClient } from '../../../../components/ArticleReviewClient'

export default async function ArticleWorkspacePage({params}:{params:Promise<{id:string}>}){
 const {id}=await params; const data=await getArticleWorkspace(id)
 if(!data.authorized) return <main className="studio-shell"><section className="studio-lock"><p className="eyebrow">KAPORAL RESEARCH OS</p><h1>Private editorial workspace</h1><p>Sign in with an approved research account.</p><div className="lockActions"><Link href="/auth">Sign in</Link><Link href="/">Public site</Link></div></section></main>
 if('notFound' in data && data.notFound) notFound()
 return <main className="studio-shell researchWorkspace"><header className="studio-head"><div><p className="eyebrow">KAPORAL RESEARCH OS · EDITORIAL REVIEW</p><h1>{data.article.headline}</h1><p>{data.article.status} · {data.article.reader_level} · {data.article.confidence??'confidence pending'}</p></div><div className="workspaceActions"><Link href={data.article.story_candidate_id?`/studio/story/${data.article.story_candidate_id}`:'/studio'}>← Research pack</Link><Link href="/studio">Command center</Link></div></header>
  <ArticleReviewClient article={data.article} reviews={data.reviews as any[]} role={data.profile.role} sources={data.sources as any[]} claims={data.claims as any[]} predictions={data.predictions as any[]}/>
 </main>
}
