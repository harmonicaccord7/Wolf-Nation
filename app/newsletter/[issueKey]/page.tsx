import Link from 'next/link'
import { cache } from 'react'
import { notFound } from 'next/navigation'
import { Header } from '../../../components/Header'
import { Footer } from '../../../components/Footer'
import { createClient } from '../../../lib/supabase/server'
export const dynamic='force-dynamic'
const getIssue=cache(async(issueKey:string)=>{
  const db=await createClient()
  const {data}=await db.from('newsletter_issues').select('issue_key,title,dek,issue_date,published_at,body,source_snapshot').eq('issue_key',issueKey).eq('status','published').lte('published_at',new Date().toISOString()).maybeSingle()
  return data
})
export async function generateMetadata({params}:{params:Promise<{issueKey:string}>}){const {issueKey}=await params,issue=await getIssue(issueKey);return{title:issue?.title??'Edition unavailable',alternates:{canonical:'/newsletter/'+issueKey},robots:{index:Boolean(issue),follow:true}}}
export default async function NewsletterIssue({params}:{params:Promise<{issueKey:string}>}) {
  const {issueKey}=await params,issue=await getIssue(issueKey);if(!issue)notFound()
  const blocks=Array.isArray(issue.body?.blocks)?issue.body.blocks:[]
  const sources=Array.isArray(issue.source_snapshot?.events)?issue.source_snapshot.events:[]
  return <main className="newsletterIssue"><Header/><section className="newsletterIssueHero"><div className="shell"><Link href="/newsletter" className="backLink">← Market letter archive</Link><span className="eyebrow">PUBLISHED EDITION · {issue.issue_date}</span><h1>{issue.title}</h1><p>{issue.dek}</p><small>Published {new Date(issue.published_at).toUTCString()}</small></div></section>
    <section className="shell newsletterIssueBody">{blocks.map((block:{type:string;text?:string;items?:string[]},index:number)=>block.type==='heading'?<h2 key={index}>{block.text}</h2>:block.type==='bullet_list'?<ul key={index}>{(block.items??[]).map((item:string,i:number)=><li key={i}>{item}</li>)}</ul>:<p key={index}>{block.text}</p>)}
      <div className="newsletterIssueSources"><h2>Edition sources</h2><p>Calendar snapshot checked {issue.source_snapshot?.checkedAt?new Date(issue.source_snapshot.checkedAt).toUTCString():'at the time of editorial review'}.</p><ul>{sources.map((source:{id?:string;title:string;sourceUrl:string},index:number)=><li key={source.id??index}><a href={source.sourceUrl} target="_blank" rel="noreferrer">{source.title} ↗</a></li>)}</ul></div>
    </section><Footer/></main>
}
