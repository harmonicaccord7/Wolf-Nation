import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import {marketBackgrounds} from '../lib/events/background.ts'

// Exercise the public boundary even when staff RLS permits draft reads.
const source=readFileSync(new URL('../lib/data/journal.ts',import.meta.url),'utf8')
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
const published={slug:'synthetic-report',headline:'Synthetic reporting',dek:'Synthetic description',published_at:'2000-01-01T00:00:00Z',status:'published',body:'PRIVATE BODY',lead_author_id:'PRIVATE ID'}
function fixture(rows,options={}){
  const queries=[]
  const db={from(table){const query={table,filters:[],orders:[]},chain={select(fields){query.fields=fields;return chain},eq(key,value){query.filters.push({key,value});return chain},lte(key,value){query.filters.push({key,value});return chain},order(key,settings){query.orders.push({key,...settings});return chain},limit(value){query.limit=value;return chain},then(resolve,reject){queries.push(query);return(options.reject?Promise.reject(Error('Synthetic failure')):Promise.resolve({data:rows,error:options.error?{message:'Synthetic failure'}:null})).then(resolve,reject)}};return chain}}
  const module={exports:{}}
  vm.runInNewContext(compiled,{module,exports:module.exports,Date,Math,Number,Array,require:name=>{assert.equal(name,'../supabase/server');return {createClient:async()=>db}}})
  return {load:module.exports.getPublicJournalArticles,queries}
}
const f=fixture([published,{...published,slug:'draft',status:'draft'},{...published,slug:'approved',status:'approved'},{...published,slug:'review',status:'review'},{...published,slug:'future',published_at:'9999-01-01T00:00:00Z'},{...published,published_at:null},{...published,published_at:'invalid'}])
const data=await f.load(1000)
assert.equal(data.unavailable,false);assert.equal(data.articles.length,1)
assert.deepEqual(Object.keys(data.articles[0]).sort(),['dek','headline','published_at','slug'])
assert.equal(JSON.stringify(data).includes('PRIVATE'),false)
assert.equal(f.queries[0].table,'articles');assert.equal(f.queries[0].fields,'slug,headline,dek,published_at,status');assert.equal(f.queries[0].limit,12)
assert.deepEqual(f.queries[0].filters,[{key:'status',value:'published'},{key:'published_at',value:data.checkedAt}])
assert.deepEqual(f.queries[0].orders,[{key:'published_at',ascending:false},{key:'slug',ascending:false}])
const empty=await fixture([]).load();assert.equal(empty.unavailable,false);assert.equal(empty.articles.length,0)
for(const failed of [fixture(null),fixture([],{error:true}),fixture([],{reject:true}),fixture([{...published,headline:null}])]){const result=await failed.load();assert.equal(result.unavailable,true);assert.equal(result.articles.length,0)}
assert.equal(new Set(marketBackgrounds.map(item=>item.key)).size,10)
for(const item of marketBackgrounds){assert.ok(item.description&&item.pocket&&item.exception&&item.watch);assert.ok(item.higher.crypto&&item.higher.gold&&item.lower.crypto&&item.lower.gold);assert.ok(item.sources.length);assert.ok(item.sources.every(s=>new URL(s.url).protocol==='https:'))}
console.log('Journal QA passed: published-only bounded metadata, staff draft/future exclusion, outage distinction, no private body/identity, and ten source-backed explanations.')
