import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { parseNewsFeed, parseWorldBankNews, articleUrl, readFeedBody, fetchNewsFeed, fetchNewsSource } from '../lib/news/parse-feed.ts'
import { newsFeeds, feedIsFresh } from '../lib/news/feeds.ts'
import { newPasswordError, safeAuthNext } from '../lib/auth/forms.ts'
const newsWorker=readFileSync('supabase/functions/daily-news-refresh/index.ts','utf8')
assert.match(newsWorker,/status:\s*'success'/)
assert.doesNotMatch(newsWorker,/status:\s*'completed'/)
assert.match(newsWorker,/Ingestion audit completion failed/)
const now=Date.parse('2026-09-13T12:00:00Z'),feed=newsFeeds[0]
const item=(title='Test headline',url='https://www.ecb.europa.eu/press/test.html',date='Sat, 12 Sep 2026 10:00:00 GMT')=>`<item><title>${title}</title><link>${url}</link><pubDate>${date}</pubDate></item>`
const rss=items=>`<?xml version="1.0"?><rss version="2.0"><channel>${items}</channel></rss>`
let parsed=parseNewsFeed(rss(item('Rates &amp; growth')+item('Rates &amp; growth')),feed,now)
assert.equal(parsed.rows.length,1);assert.equal(parsed.rows[0].title,'Rates & growth')
assert.equal(parsed.rows[0].published_at,'2026-09-12T10:00:00.000Z')
assert.equal(parseNewsFeed(rss(item('Timezone test','https://www.ecb.europa.eu/x','Wed, 09 Sep 2026 15:26:07 CEST')),feed,now).rows[0].published_at,'2026-09-09T13:26:07.000Z')
assert.equal(articleUrl('http://www.ecb.europa.eu/x?utm_source=feed&a=1#section',feed),'https://www.ecb.europa.eu/x?a=1')
for(const url of ['javascript:alert(1)','https://www.ecb.europa.eu.attacker.test/x','https://name:pass@www.ecb.europa.eu/x','https://127.0.0.1/x','https://www.ecb.europa.eu:8080/x'])assert.equal(articleUrl(url,feed),null)
for(const xml of [rss(item('Undated','https://www.ecb.europa.eu/x','')),rss(item('Future','https://www.ecb.europa.eu/x','Wed, 16 Sep 2026 10:00:00 GMT')),'<html>Not XML news</html>','<!DOCTYPE rss [<!ENTITY x "x">]>'+rss(item()),rss(item()).slice(0,-6)])assert.throws(()=>parseNewsFeed(xml,feed,now))
assert.equal(parseNewsFeed(`<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Atom title</title><link rel="alternate" href="https://www.ecb.europa.eu/x"/><published>2026-09-12T10:00:00Z</published><updated>2026-09-13T10:00:00Z</updated></entry></feed>`,feed,now).rows[0].published_at,'2026-09-12T10:00:00.000Z')
assert.equal(await readFeedBody(new Response(rss(item()))),rss(item()))
let redirects=0
assert.equal(await fetchNewsFeed(feed,async()=>++redirects===1?new Response(null,{status:302,headers:{location:'/rss/new'}}):new Response(rss(item()))),rss(item()))
await assert.rejects(()=>fetchNewsFeed(feed,async()=>new Response(null,{status:302,headers:{location:'https://127.0.0.1/private'}})),/Unapproved/)
await assert.rejects(()=>readFeedBody(new Response('x'.repeat(1500001))))
const worldBankFeed=newsFeeds.find(source=>source.slug==='world-bank-africa')
assert.ok(worldBankFeed)
const worldBankFixture=JSON.stringify({value:[
  {title:'Africa investment update',publishUrl:'https://www.worldbank.org/en/news/press-release/2026/09/12/africa-investment',contentDate:'2026-09-12T09:00:00Z',regions:['Sub-Saharan Africa']},
  {title:'Wrong region',publishUrl:'https://www.worldbank.org/en/news/press-release/2026/09/12/wrong-region',contentDate:'2026-09-12T08:00:00Z',regions:['Europe and Central Asia']},
  {title:'Wrong host',publishUrl:'https://example.com/news',contentDate:'2026-09-12T07:00:00Z',regions:['Sub-Saharan Africa']},
]})
const worldBankParsed=parseWorldBankNews(worldBankFixture,worldBankFeed,now)
assert.equal(worldBankParsed.rows.length,1)
assert.equal(worldBankParsed.rows[0].category,'africa')
assert.equal(worldBankParsed.rows[0].title,'Africa investment update')
let worldBankRequest
const fetchedWorldBank=await fetchNewsSource(worldBankFeed,async(_url,options)=>{worldBankRequest=options;return new Response(JSON.stringify({value:[{title:'Current Africa update',publishUrl:'https://www.worldbank.org/en/news/press-release/current-africa-update',contentDate:new Date(Date.now()-3600_000).toISOString(),regions:['Sub-Saharan Africa']}]}),{headers:{'content-type':'application/json'}})})
assert.equal(fetchedWorldBank.rows.length,1)
assert.equal(worldBankRequest.method,'POST')
assert.match(worldBankRequest.body,/Sub-Saharan Africa/)
for(const invalid of ['not json',JSON.stringify({}),JSON.stringify({value:[{title:'Other region',publishUrl:'https://www.worldbank.org/en/news/x',contentDate:'2026-09-12T08:00:00Z',regions:['South Asia']}]})])assert.throws(()=>parseWorldBankNews(invalid,worldBankFeed,now))
const northFeed=newsFeeds.find(source=>source.slug==='world-bank-north-africa')
assert.ok(northFeed)
const northItem={title:'Tunisia water update',publishUrl:'https://www.worldbank.org/en/news/press-release/2026/09/12/tunisia-water',contentDate:'2026-09-12T09:00:00Z',countries:['Tunisia'],regions:[]}
const northFixture=JSON.stringify({value:[northItem,
  {...northItem,title:'Egypt update',publishUrl:'https://www.worldbank.org/en/news/press-release/egypt-update',countries:['Egypt']},
  {...northItem,publishUrl:'https://www.worldbank.org/en/news/wrong-country',countries:['Pakistan'],regions:['Middle East, North Africa, Afghanistan & Pakistan']},
  {...northItem,publishUrl:'https://www.worldbank.org/en/news/missing-country',countries:[]},
  {...northItem,publishUrl:'https://example.com/wrong-host'},
  {...northItem,publishUrl:'https://www.worldbank.org/en/news/future',contentDate:'2026-09-14T09:00:00Z'},
  {...northItem,publishUrl:'https://www.worldbank.org/en/news/old',contentDate:'2026-06-01T09:00:00Z'},
]})
const northParsed=parseWorldBankNews(northFixture,northFeed,now)
assert.equal(northParsed.rows.length,2);assert.equal(northParsed.rejected,5)
assert.equal(northParsed.rows[0].feed_slug,'world-bank-north-africa')
assert.equal(northParsed.rows[0].published_at,'2026-09-12T09:00:00.000Z')
assert.deepEqual(Object.keys(northParsed.rows[0]).sort(),['category','feed_slug','last_seen_at','published_at','title','url'])
let northRequest
const fetchedNorth=await fetchNewsSource(northFeed,async(_url,options)=>{northRequest=JSON.parse(options.body);return new Response(JSON.stringify({value:[{...northItem,contentDate:new Date(Date.now()-3600_000).toISOString()}]}))})
assert.equal(fetchedNorth.rows.length,1)
assert.match(northRequest.filter,/countries\/any/)
for(const country of ['Algeria','Egypt','Libya','Morocco','Tunisia'])assert.ok(northRequest.filter.includes("s eq '"+country+"'"))
assert.doesNotMatch(northRequest.filter,/regions\/any|Pakistan/)
for(const scope of [undefined,{field:'countries',values:[]}]) {
  assert.throws(()=>parseWorldBankNews(northFixture,{...northFeed,worldBankScope:scope},now),/geographic scope/)
  await assert.rejects(()=>fetchNewsSource({...northFeed,worldBankScope:scope},async()=>{throw new Error('must not fetch')}),/geographic scope/)
}
assert.equal(parseNewsFeed(rss(item('Africa&amp;#039;s &amp;#x2014; &lt;b&gt;railway&lt;/b&gt;')),feed,now).rows[0].title,"Africa's — railway")
assert.equal(parseNewsFeed(rss(item('Invalid &amp;#99999999; entity')),feed,now).rows[0].title,'Invalid &#99999999; entity')
assert.equal(feedIsFresh({status:'healthy',last_success_at:'2026-09-13T10:00:00Z'},now),true)
assert.equal(feedIsFresh({status:'error',last_success_at:'2026-09-13T10:00:00Z'},now),false)
assert.equal(feedIsFresh({status:'healthy',last_success_at:'2026-09-11T10:00:00Z'},now),false)
assert.equal(newPasswordError('long unique password','long unique password'),null)
assert.ok(newPasswordError('short','short'));assert.ok(newPasswordError('long unique password','different'))
for(const path of ['//evil.test','/\\evil.test','https://evil.test','/account?next=//evil.test'])assert.equal(safeAuthNext(path),'/account')
assert.equal(safeAuthNext('/auth/reset-password'),'/auth/reset-password')
const db=new PGlite()
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;grant usage on schema public to anon,authenticated,service_role;
create table public.newsletter_subscribers(id uuid primary key default gen_random_uuid(),email text not null unique,status text not null,source text,consent_at timestamptz,unsubscribed_at timestamptz,created_at timestamptz not null default now(),confirm_token_hash text,confirm_expires_at timestamptz,confirmed_at timestamptz,unsubscribe_token_hash text,last_confirmation_sent_at timestamptz,last_delivery_status text,last_delivery_error text,last_delivery_attempt_at timestamptz);`)
for(const suffix of ['daily_source_news.sql','add_world_bank_africa_news.sql','add_afdb_africa_news.sql','add_world_bank_north_africa_news.sql','newsletter_identity_protection.sql'])await db.exec(readFileSync('supabase/migrations/'+readdirSync('supabase/migrations').find(name=>name.endsWith(suffix)),'utf8'))
assert.equal((await db.query("select status,last_success_at,latest_published_at from public.news_feeds where slug='world-bank-north-africa'")).rows[0].status,'pending')
await db.exec("update public.news_feeds set status='healthy',last_success_at='2026-09-13T10:00:00Z',latest_published_at='2026-09-12T00:00:00Z' where slug='world-bank-north-africa'")
const before=(await db.query("select status,last_success_at,latest_published_at from public.news_feeds where slug='world-bank-north-africa'")).rows[0]
await db.exec(readFileSync('supabase/migrations/'+readdirSync('supabase/migrations').find(name=>name.endsWith('add_world_bank_north_africa_news.sql')),'utf8'))
assert.deepEqual((await db.query("select status,last_success_at,latest_published_at from public.news_feeds where slug='world-bank-north-africa'")).rows[0],before,'Re-registration must preserve observed freshness')
await db.exec(`insert into public.daily_news(feed_slug,title,url,category,published_at) values('ecb','Visible test','https://www.ecb.europa.eu/visible','finance',now()-interval '1 day'),('ecb','Future test','https://www.ecb.europa.eu/future','finance',now()+interval '1 day');set role anon;`)
assert.equal((await db.query('select * from public.daily_news')).rows.length,1)
assert.equal((await db.query("select count(*)::int as n from public.news_feeds where slug in ('world-bank-africa','world-bank-north-africa')")).rows[0].n,2)
await assert.rejects(()=>db.exec("update public.news_feeds set status='healthy' where slug='world-bank-north-africa'"))
await assert.rejects(()=>db.exec("insert into public.daily_news(feed_slug,title,url,category,published_at) values('ecb','No','https://www.ecb.europa.eu/no','finance',now())"))
await assert.rejects(()=>db.query('select public.reserve_newsletter_confirmation($1,$2,$3,$4,$5)',['test@example.com','qa','a'.repeat(64),'b'.repeat(64),false]))
await db.exec('reset role')
const reserve=async(email,hash='a',resend=false)=>(await db.query('select public.reserve_newsletter_confirmation($1,$2,$3,$4,$5) as result',[email,'qa',hash.repeat(64),'b'.repeat(64),resend])).rows[0].result
assert.equal((await reserve(' Test@Example.com ')).send,true)
assert.equal((await reserve('test@example.com','c')).delivery,'cooldown')
await db.exec("update public.newsletter_subscribers set last_confirmation_sent_at=now(),last_delivery_attempt_at=now()-interval '11 minutes'")
assert.equal((await reserve('TEST@EXAMPLE.COM','d')).status,'already_pending')
assert.equal((await db.query('select confirm_token_hash from public.newsletter_subscribers')).rows[0].confirm_token_hash,'a'.repeat(64))
assert.equal((await reserve('test@example.com','c',true)).send,true)
await db.exec("update public.newsletter_subscribers set status='confirmed',confirmed_at=now()")
assert.equal((await reserve('test@example.com','d',true)).status,'already_confirmed')
assert.equal((await db.query('select count(*)::int as n from public.newsletter_subscribers')).rows[0].n,1)
assert.equal((await db.query('select confirm_token_hash from public.newsletter_subscribers')).rows[0].confirm_token_hash,'c'.repeat(64))
await db.exec("update public.newsletter_subscribers set status='active'")
assert.equal((await reserve('test@example.com')).status,'already_confirmed')
await db.exec("update public.newsletter_subscribers set status='bounced'")
assert.equal((await reserve('test@example.com')).status,'delivery_blocked')
await db.exec("update public.newsletter_subscribers set status='unsubscribed',unsubscribed_at=now(),last_delivery_attempt_at=now()-interval '11 minutes'")
assert.equal((await reserve('test@example.com')).send,true)
assert.equal((await db.query('select status from public.newsletter_subscribers')).rows[0].status,'pending')
await assert.rejects(()=>db.exec("insert into public.newsletter_subscribers(email,status) values('TEST@EXAMPLE.COM','pending')"))
await db.close()
console.log('PASS: news parser/date/source validation; public news RLS; password validation/redirects; normalized, atomic newsletter deduplication, retry and consent protections.')
