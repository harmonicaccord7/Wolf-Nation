import assert from 'node:assert/strict'
import fs from 'node:fs'
import {PGlite} from '@electric-sql/pglite'

const db=new PGlite()
await db.exec(`create function gen_random_uuid() returns uuid language sql volatile as $$ select md5(random()::text || clock_timestamp()::text)::uuid $$; create schema auth; create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$; create role anon nologin; create role authenticated nologin; create table public.profiles(id uuid primary key, role text not null); grant usage on schema public to anon,authenticated; insert into public.profiles values ('11111111-1111-1111-1111-111111111111','reader'),('22222222-2222-2222-2222-222222222222','editor');`)
await db.exec(fs.readFileSync(new URL('../supabase/migrations/20260911210903_market_decision_workspace.sql',import.meta.url),'utf8'))
await db.exec(`insert into public.economic_events(slug,kind,title,scheduled_at,provider,source_url,status) values ('scheduled-cpi','cpi','Consumer Price Index','2026-10-14T12:30:00Z','BLS','https://www.bls.gov','scheduled'),('draft-cpi','cpi','Draft CPI','2026-10-15T12:30:00Z','BLS','https://www.bls.gov','draft'); insert into public.watchlists(profile_id,name) values ('11111111-1111-1111-1111-111111111111','Reader list'),('22222222-2222-2222-2222-222222222222','Editor list');`)
await db.exec(`set role anon`)
const publicEvents=await db.query("select slug from public.economic_events order by slug")
assert.deepEqual(publicEvents.rows.map(row=>row.slug),['scheduled-cpi'])
let anonWrite=false;try{await db.exec("insert into public.watchlists(profile_id) values ('11111111-1111-1111-1111-111111111111')")}catch{anonWrite=true}assert.equal(anonWrite,true)
await db.exec(`reset role; set role authenticated; select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false)`)
const own=await db.query("select name from public.watchlists order by name")
assert.deepEqual(own.rows.map(row=>row.name),['Reader list'])
console.log('RLS QA passed: anon draft isolation/write denial and per-user watchlist isolation')
await db.close()
