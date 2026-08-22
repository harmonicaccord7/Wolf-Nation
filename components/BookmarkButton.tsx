'use client'
import { useEffect,useState } from 'react'
import Link from 'next/link'
import { createClient } from '../lib/supabase/client'

export function BookmarkButton({articleId}:{articleId:string}){
  const [userId,setUserId]=useState<string|null>(null)
  const [saved,setSaved]=useState(false)
  const [busy,setBusy]=useState(false)
  const [ready,setReady]=useState(false)
  const supabase=createClient()

  useEffect(()=>{let live=true;(async()=>{
    const {data:{user}}=await supabase.auth.getUser()
    if(!live)return
    if(!user){setReady(true);return}
    setUserId(user.id)
    const {data}=await supabase.from('bookmarks').select('article_id').eq('profile_id',user.id).eq('article_id',articleId).maybeSingle()
    if(live){setSaved(Boolean(data));setReady(true)}
  })();return()=>{live=false}},[articleId])

  if(!ready) return <span className="bookmarkPlaceholder" aria-hidden="true">Save research</span>
  if(!userId) return <Link className="bookmarkButton" href="/auth">Sign in to save</Link>

  async function toggle(){
    if(!userId||busy)return
    setBusy(true)
    if(saved){
      const {error}=await supabase.from('bookmarks').delete().eq('profile_id',userId).eq('article_id',articleId)
      if(!error)setSaved(false)
    }else{
      const {error}=await supabase.from('bookmarks').insert({profile_id:userId,article_id:articleId})
      if(!error)setSaved(true)
    }
    setBusy(false)
  }
  return <button className="bookmarkButton" type="button" onClick={toggle} disabled={busy} aria-pressed={saved}>{busy?'Working…':saved?'Saved ✓':'Save research'}</button>
}
