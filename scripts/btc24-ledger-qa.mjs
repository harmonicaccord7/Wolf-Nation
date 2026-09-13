import assert from 'node:assert/strict'
import fs from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
const db = new PGlite(), root = new URL('../supabase/migrations/', import.meta.url)
await db.exec(`
 create schema auth; create schema private;
 create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 create function public.test_now() returns timestamptz language sql stable as $$ select current_setting('test.clock')::timestamptz $$;
 select set_config('test.clock','2026-09-12T16:00:00Z',false);
 create table public.profiles(id uuid primary key,role text);
 create table public.model_runs(id uuid primary key default gen_random_uuid(),module_code text,input_snapshot jsonb);
 grant usage on schema public,private,auth to authenticated,service_role;
 grant select on public.profiles to authenticated;
 grant all on public.model_runs to service_role;
`)
await db.exec(fs.readFileSync(new URL('20260909074047_kaporal_signal_lab_foundation.sql', root), 'utf8'))
const name = fs.readdirSync(root).find(n => n.endsWith('_freeze_btc_research_ledger.sql'))
await db.exec(fs.readFileSync(new URL(name, root), 'utf8').replaceAll('clock_timestamp()', 'public.test_now()'))
const model=(await db.query(`insert into public.signal_model_versions(code,version,asset_class,methodology) values ('K-BTC-24H','fixture','crypto','{"artifact_hash":"fixture"}') returning id`)).rows[0].id
const candle=[1789257600,90000,92000,91000,91500,1000] // Sep 13 00:00; synthetic local fixture only.
assert.equal(new Date(candle[0]*1000).toISOString(),'2026-09-13T00:00:00.000Z')
const snapshot=(await db.query(`insert into public.model_runs(module_code,input_snapshot) values ('btc24-history','${JSON.stringify({hash:'a'.repeat(64),candles:[candle]})}') returning id`)).rows[0].id
const features={protocol:'btc24-v1',window_start:'2026-09-13T00:00:00Z',window_end:'2026-09-14T00:00:00Z',artifact_hash:'fixture',snapshot_hash:'a'.repeat(64),snapshot_id:snapshot,trade_action:'abstain-unvalidated',x:Array(8).fill(0)}
const insert=(f=features,source='2026-09-12T00:00:00Z')=>`insert into public.signal_predictions(model_version_id,symbol,asset_class,direction,horizon_hours,probability,opportunity_score,invalidation_text,features,source_as_of) values ('${model}','BTC-USD','crypto','bullish',24,.6,0,'Synthetic test only','${JSON.stringify(f)}','${source}') returning id`
let assertions=0
const denied=async sql=>{await assert.rejects(db.exec(sql));assertions++}
await db.exec('set role anon'); await denied('select * from public.signal_predictions')
await db.exec('reset role; set role authenticated'); await denied(insert())
await db.exec('reset role; set role service_role')
await denied(insert({...features,window_start:'2026-09-12T00:00:00Z',window_end:'2026-09-13T00:00:00Z'},'2026-09-11T00:00:00Z'))
await denied(insert({...features,window_end:'2026-09-15T00:00:00Z'}))
await denied(insert({...features,artifact_hash:'wrong'}))
const prediction=(await db.query(insert())).rows[0].id
await denied(insert())
await denied(`update public.signal_predictions set probability=.99 where id='${prediction}'`)
await denied(`delete from public.signal_predictions where id='${prediction}'`)
await denied(`delete from public.signal_model_versions where id='${model}'`)
await denied(`update public.model_runs set input_snapshot='{}' where id='${snapshot}'`)
await denied(`update public.signal_predictions set status='resolved' where id='${prediction}'`)
const notes=JSON.stringify({provider:'Coinbase Exchange',snapshot_id:snapshot,snapshot_hash:'a'.repeat(64),candle})
const outcome=(move=(91500/91000-1)*100)=>`insert into public.signal_outcomes(prediction_id,realized_move_pct,hit,resolution_price,resolved_at,notes) values ('${prediction}',${move},true,91500,'2026-09-14T00:00:00Z','${notes}')`
await denied(outcome())
await db.exec("select set_config('test.clock','2026-09-14T00:10:00Z',false)")
await denied(outcome(99))
await db.exec(outcome())
await db.exec(`update public.signal_predictions set status='resolved' where id='${prediction}'`)
assert.equal((await db.query(`select status from public.signal_predictions where id='${prediction}'`)).rows[0].status,'resolved');assertions++
await denied(`delete from public.signal_outcomes where prediction_id='${prediction}'`)
await denied(`update public.signal_outcomes set hit=false where prediction_id='${prediction}'`)
console.log('BTC immutable ledger QA passed: '+assertions+' assertions; local synthetic fixtures only.')
await db.close()
