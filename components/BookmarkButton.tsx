'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../lib/supabase/client'

export function BookmarkButton({articleId}:{articleId:string}){
 const [userId,setUserId]=useState<string|null>(null);const [saved,setSaved]=useState(false);const [busy,setBusy]=useState(false)
 useEffect(()=>{let alive=true;(async()=>{const supabase=createClient();const {data}=await supabase.auth.getUser();if(!alive||!data.user)return;setUserId(data.user.id);const {data:row}=await supabase.from('bookmarks').select('article_id').eq('profile_id',data.user.id).eq('article_id',articleId).maybeSingle();if(alive)setSaved(Boolean(row))})();return()=>{alive=false}},[articleId])
 async function toggle(){if(!userId){location.href='/auth';return}setBusy(true);const supabase=createClient();if(saved){const {error}=await supabase.from('bookmarks').delete().eq('profile_id',userId).eq('article_id',articleId);if(!error)setSaved(false)}else{const {error}=await supabase.from('bookmarks').insert({profile_id:userId,article_id:articleId});if(!error)setSaved(true)}setBusy(false)}
 return <button className={`bookmarkButton ${saved?'saved':''}`} onClick={toggle} disabled={busy}>{busy?'Working…':saved?'✓ Saved to research shelf':'＋ Save research'}</button>
}
