import {createClient} from '../supabase/server'

export type PublicJournalArticle = {slug:string;headline:string;dek:string|null;published_at:string}

/** Public metadata only, including for signed-in staff with draft access. */
export async function getPublicJournalArticles(limit=12){
  const checkedAt=new Date().toISOString(),now=Date.parse(checkedAt)
  const unavailable={articles:[] as PublicJournalArticle[],unavailable:true,checkedAt}
  try{
    const db=await createClient()
    const result=await db.from('articles').select('slug,headline,dek,published_at,status')
      .eq('status','published').lte('published_at',checkedAt)
      .order('published_at',{ascending:false}).order('slug',{ascending:false})
      .limit(Math.max(1,Math.min(12,Math.trunc(limit)||12)))
    if(result.error||!Array.isArray(result.data))return unavailable
    const articles:PublicJournalArticle[]=[]
    for(const row of result.data){
      if(row.status!=='published'||typeof row.published_at!=='string'||!Number.isFinite(Date.parse(row.published_at))||Date.parse(row.published_at)>now)continue
      if(typeof row.slug!=='string'||!row.slug||typeof row.headline!=='string'||!row.headline)return unavailable
      articles.push({slug:row.slug,headline:row.headline,dek:typeof row.dek==='string'?row.dek:null,published_at:row.published_at})
    }
    return {articles,unavailable:false,checkedAt}
  }catch{return unavailable}
}
