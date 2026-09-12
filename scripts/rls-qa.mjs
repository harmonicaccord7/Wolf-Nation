import assert from 'node:assert/strict'
import fs from 'node:fs'
import { PGlite } from '@electric-sql/pglite'

const db = new PGlite()
const reader = '11111111-1111-1111-1111-111111111111'
const editor = '22222222-2222-2222-2222-222222222222'
const researcher = '33333333-3333-3333-3333-333333333333'
let assertions = 0
async function denied(sql) { await assert.rejects(db.exec(sql)); assertions++ }
async function role(id) { await db.exec("reset role; set role authenticated; select set_config('request.jwt.claim.sub','" + id + "',false)") }
await db.exec(`
  create function gen_random_uuid() returns uuid language sql volatile as $$ select md5(random()::text || clock_timestamp()::text)::uuid $$;
  create schema auth;
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create table public.profiles(id uuid primary key, role text not null);
  create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz);
  create table public.newsletter_subscribers(id uuid primary key default gen_random_uuid(),email text,status text,confirmed_at timestamptz,consent_at timestamptz,unsubscribed_at timestamptz);
  grant usage on schema public,auth to anon,authenticated;
  grant usage on schema public,auth to service_role;
  grant all on public.newsletter_subscribers to service_role;
  grant select on auth.users to service_role;
  grant select on public.profiles to authenticated;
  alter table public.profiles enable row level security;
  create policy own_profile on public.profiles for select to authenticated using(id=auth.uid());
  insert into public.profiles values ('${reader}','reader'),('${editor}','editor'),('${researcher}','researcher');
  insert into auth.users values ('${reader}','off@example.test',now());
`)
const migrations = new URL('../supabase/migrations/', import.meta.url)
const workspaceMigration = fs.readdirSync(migrations).find(name => name.endsWith('_market_decision_workspace.sql'))
assert.ok(workspaceMigration)
await db.exec(fs.readFileSync(new URL(workspaceMigration, migrations), 'utf8'))
const policyMigration = fs.readdirSync(migrations).find(name => name.endsWith('_optimize_workspace_policies.sql'))
if (policyMigration) await db.exec(fs.readFileSync(new URL(policyMigration, migrations), 'utf8'))
await db.exec(`
 insert into public.economic_events(slug,kind,title,scheduled_at,provider,source_url,status) values
 ('scheduled-cpi','cpi','Consumer Price Index','2026-10-14T12:30:00Z','BLS','https://www.bls.gov','scheduled'),
 ('draft-cpi','cpi','Draft CPI','2026-10-15T12:30:00Z','BLS','https://www.bls.gov','draft');
 insert into public.watchlists(profile_id,name) values ('${reader}','Reader list'),('${editor}','Editor list');
 insert into public.newsletter_subscribers(email,status,confirmed_at,consent_at,unsubscribed_at) values
 ('eligible@example.test','confirmed',now(),now(),null),('pending@example.test','pending',null,now(),null),
 ('off@example.test','confirmed',now(),now(),null),('unsubscribed@example.test','confirmed',now(),now(),now()),
 ('legacy@example.test','active',null,now(),null);
 insert into public.reader_preferences(profile_id,newsletter_frequency) values ('${reader}','off');
`)
await db.exec('set role anon')
assert.deepEqual((await db.query('select slug from public.economic_events')).rows.map(r => r.slug), ['scheduled-cpi']); assertions++
for (const table of ['watchlists','reader_preferences','model_runs','newsletter_deliveries']) await denied('select * from public.' + table)
await denied("select public.queue_newsletter_issue(gen_random_uuid())")
await role(reader)
assert.deepEqual((await db.query('select name from public.watchlists')).rows.map(r => r.name), ['Reader list']); assertions++
await db.exec(`insert into public.watchlists(profile_id,name) values ('${reader}','My watchlist')`)
await denied(`insert into public.watchlists(profile_id,name) values ('${editor}','Stolen')`)
await db.exec(`update public.reader_preferences set timezone='Europe/Paris' where profile_id='${reader}'`)
assert.equal((await db.query('select timezone from public.reader_preferences')).rows[0].timezone, 'Europe/Paris'); assertions++
const list = (await db.query("select id from public.watchlists where name='My watchlist'")).rows[0].id
await db.exec(`insert into public.watchlist_items(watchlist_id,symbol) values ('${list}','BTC')`)
assert.equal((await db.query('select count(*)::int as n from public.watchlist_items')).rows[0].n, 1); assertions++
await db.exec("delete from public.watchlist_items where symbol='BTC'")
assert.equal((await db.query('select count(*)::int as n from public.watchlist_items')).rows[0].n, 0); assertions++
await denied("select public.queue_newsletter_issue(gen_random_uuid())")
await role(researcher)
await denied("insert into public.newsletter_issues(issue_key,title,issue_date,status) values ('bypass','Bad',current_date,'published')")
const issue = (await db.query(`insert into public.newsletter_issues(issue_key,title,issue_date,body,source_snapshot) values ('qa-issue','QA',current_date,'{"blocks":[{"type":"paragraph","text":"A complete source-labelled editorial draft for testing."}]}','{"events":[{"sourceUrl":"https://www.bls.gov"}],"sourceState":"live"}') returning id`)).rows[0].id
await db.exec(`update public.newsletter_issues set status='review' where id='${issue}'`)
await denied(`update public.newsletter_issues set status='published' where id='${issue}'`)
await denied(`update public.newsletter_issues set status='approved', review_notes='Forged human approval by a researcher.' where id='${issue}'`)
await denied("update public.economic_events set actual_value=999,source_claim_status='reviewed' where slug='scheduled-cpi'")
await role(editor)
await denied(`update public.newsletter_issues set status='approved' where id='${issue}'`)
await db.exec(`update public.newsletter_issues set status='approved',review_notes='Test fixture review: sources and claims checked.' where id='${issue}'`)
await denied(`update public.newsletter_issues set body='{"blocks":[]}' where id='${issue}'`)
await db.exec(`update public.newsletter_issues set status='published' where id='${issue}'`)
await denied(`update public.newsletter_issues set title='Silently rewritten' where id='${issue}'`)
await denied(`delete from public.newsletter_issues where id='${issue}'`)
assert.equal((await db.query(`select public.queue_newsletter_issue('${issue}') as n`)).rows[0].n, 1); assertions++
assert.equal((await db.query(`select public.queue_newsletter_issue('${issue}') as n`)).rows[0].n, 0); assertions++
await denied('select email from public.newsletter_subscribers')
await denied(`select * from public.claim_newsletter_deliveries('${issue}',3)`)
await denied("select public.unsubscribe_newsletter_delivery(repeat('a',64))")
await db.exec('reset role; set role service_role')
const claimed=(await db.query(`select * from public.claim_newsletter_deliveries('${issue}',3)`)).rows
assert.equal(claimed.length,1); assertions++
assert.equal(claimed[0].email,'eligible@example.test'); assertions++
assert.equal((await db.query(`select * from public.claim_newsletter_deliveries('${issue}',3)`)).rows.length,0); assertions++
assert.equal((await db.query(`select public.unsubscribe_newsletter_delivery('${claimed[0].unsubscribe_token}') as ok`)).rows[0].ok,true); assertions++
assert.equal((await db.query(`select public.newsletter_recipient_eligible('${claimed[0].delivery_id}') as ok`)).rows[0].ok,false); assertions++
await db.exec('reset role; set role anon')
assert.equal((await db.query('select count(*)::int as n from public.newsletter_issues')).rows[0].n, 1); assertions++
console.log('RLS QA passed: ' + assertions + ' assertions covering owner CRUD, isolation, publication transitions, immutability, consent/cadence suppression and queue idempotency.')
await db.close()
