import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Header } from '../../components/Header'
import { Footer } from '../../components/Footer'
import { AccountActions } from '../../components/AccountActions'
import { createClient } from '../../lib/supabase/server'

export const metadata={title:'My Account',description:'Manage your KAPORAL INTELLIGENCE reader account and saved research.'}

export default async function AccountPage(){
  const supabase=await createClient()
  const {data:{user}}=await supabase.auth.getUser()
  if(!user) redirect('/auth')

  const [{data:profile},{data:bookmarks}]=await Promise.all([
    supabase.from('profiles').select('id,display_name,role,created_at').eq('id',user.id).maybeSingle(),
    supabase.from('bookmarks').select('article_id,created_at').eq('profile_id',user.id).order('created_at',{ascending:false})
  ])
  const ids=(bookmarks??[]).map((b:any)=>b.article_id)
  let articles:any[]=[]
  if(ids.length){
    const {data}=await supabase.from('articles').select('id,slug,headline,dek,confidence,reader_level,published_at').in('id',ids).eq('status','published')
    const byId=new Map((data??[]).map((a:any)=>[a.id,a]))
    articles=ids.flatMap((id:string)=>byId.has(id)?[byId.get(id)]:[])
  }
  const role=profile?.role??'reader'
  const isResearcher=['researcher','editor','admin'].includes(role)
  return <main className="intelligencePage"><Header/>
    <section className="deskHero"><div className="shell deskHeroGrid"><div><span className="eyebrow">READER ACCOUNT</span><h1>{profile?.display_name||user.email?.split('@')[0]||'Reader'}</h1><p>{user.email} · {role}</p></div><aside><small>ACCOUNT ACCESS</small><strong>{isResearcher?'Research OS enabled':'Reader workspace'}</strong><span>{isResearcher?'Your approved role includes access to the private Studio.':'Save investigations and manage your reading workspace here.'}</span></aside></div></section>
    <section className="shell liveSection"><div className="accountTop"><div><span className="eyebrow">SAVED RESEARCH</span><h2>Your bookmarks</h2></div><div className="accountActions">{isResearcher&&<Link className="goldButton" href="/studio">Open Studio</Link>}<AccountActions/></div></div>
      {articles.length?<div className="researchCardGrid">{articles.map((a:any)=><Link href={`/article/${a.slug}`} className="researchCard" key={a.id}><small>{a.confidence??a.reader_level}</small><h3>{a.headline}</h3><p>{a.dek||'Saved KAPORAL investigation.'}</p></Link>)}</div>:<div className="emptyResearch"><strong>No saved investigations yet.</strong><p>Open a published investigation and choose “Save research” to add it to this private reader workspace.</p><Link className="goldButton" href="/research">Browse research</Link></div>}
    </section><Footer/></main>
}
