import { notFound } from 'next/navigation'
import { Header } from '../Header'
import { Footer } from '../Footer'
import { getPublicPage } from '../../lib/data/intelligence'

type Block={type?:string;text?:string}
export async function InstitutionalPage({slug}:{slug:string}){
  const page=await getPublicPage(slug)
  if(!page) notFound()
  const blocks=Array.isArray(page.body)?page.body as Block[]:[]
  const legalDraft=slug==='privacy'||slug==='terms'
  return <main className="institutionalPage"><Header/><section className="institutionalHero"><div className="shell"><span className="eyebrow">{page.eyebrow}</span><h1>{page.title}</h1><p>{page.summary}</p>{legalDraft&&<div className="legalDraftNotice"><b>Pre-launch legal draft</b><span>Final Dutch/EU legal review is required before full commercial launch.</span></div>}</div></section><article className="institutionalBody">{blocks.map((b,i)=>b.type==='heading'?<h2 key={i}>{b.text}</h2>:<p key={i}>{b.text}</p>)}<div className="institutionalStamp">Published institutional content · Last updated {new Intl.DateTimeFormat('en-GB',{dateStyle:'long'}).format(new Date(page.updated_at))}</div></article><Footer/></main>
}
