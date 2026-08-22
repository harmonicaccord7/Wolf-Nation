import { redirect } from 'next/navigation'
import { Header } from '../../components/Header'
import { Footer } from '../../components/Footer'
import { AccountActions } from '../../components/AccountActions'
import { createClient } from '../../lib/supabase/server'

export default async function AccountPage(){
 const supabase=await createClient();const {data:auth}=await supabase.auth.getClaims();const uid=auth?.claims?.sub
 if(!uid) redirect('/auth')
 const [{data:profile},{data:bookmarks}]=await Promise.all([
  supabase.from('profiles').select('display_name,role,created_at').eq('id',uid).maybeSingle(),
  supabase.from('bookmarks').select('created_at,article:articles(id,slug,headline,dek,reader_level,confidence,published_at)').eq('profile_id',uid).order('created_at',{ascending:false})
 ])
 return <main><Header/><section className="productHero accountHero"><div className="shell"><div className="accountHeader"><div><p className="eyebrow">READER ACCOUNT</p><h1>{profile?.display_name??'KAPORAL reader'}</h1><p>Save research, return to investigations, and keep your reading shelf separate from the private newsroom.</p></div><AccountActions/></div><div className="ledgerKpis"><div><small>SAVED RESEARCH</small><b>{bookmarks?.length??0}</b></div><div><small>ACCOUNT ROLE</small><b>{profile?.role??'reader'}</b></div><div><small>MEMBER SINCE</small><b>{profile?.created_at?new Date(profile.created_at).getFullYear():'—'}</b></div></div></div></section><section className="shell productSection"><div className="sectionTitle"><div><span className="eyebrow">YOUR RESEARCH SHELF</span><h2>Saved investigations.</h2></div><p>Bookmarks are private to your account.</p></div>{bookmarks?.length?<div className="savedGrid">{bookmarks.map((b:any)=><a key={`${b.article?.id}-${b.created_at}`} href={`/article/${b.article?.slug}`} className="savedCard"><small>{b.article?.reader_level??'research'} · {b.article?.confidence??'confidence pending'}</small><h3>{b.article?.headline}</h3><p>{b.article?.dek??'Open the investigation.'}</p><span>Saved {new Date(b.created_at).toLocaleDateString('en-GB')}</span></a>)}</div>:<div className="emptyResearch"><h3>Your shelf is empty.</h3><p>Open a published investigation and use “Save research” to keep it here.</p><a className="goldButton" href="/research">Browse research</a></div>}</section><Footer/></main>
}
