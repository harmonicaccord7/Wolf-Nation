type Block = {type?:string;text?:string;level?:number;items?:string[];label?:string;value?:string}
export function ArticleBody({body}:{body:any}){
 const blocks:Array<Block>=Array.isArray(body?.blocks)?body.blocks:[]
 if(!blocks.length) return <p className="articleEmpty">Research body is being structured.</p>
 return <div className="articleBody">{blocks.map((b,i)=>{
   if(b.type==='heading') return b.level===3?<h3 key={i}>{b.text}</h3>:<h2 key={i}>{b.text}</h2>
   if(b.type==='bullet_list') return <ul key={i}>{(b.items??[]).map((x,j)=><li key={j}>{x}</li>)}</ul>
   if(b.type==='callout') return <aside key={i} className="researchCallout"><small>{b.label??'RESEARCH NOTE'}</small><p>{b.text}</p></aside>
   if(b.type==='metric') return <div key={i} className="inlineMetric"><small>{b.label}</small><b>{b.value}</b></div>
   return <p key={i}>{b.text}</p>
 })}</div>
}
