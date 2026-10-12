import assert from 'node:assert/strict'
import fs from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { parseScenarioDraft,savedScenario,SCENARIO_VERSION } from '../lib/tools/decision-scenarios.ts'
import { simulateDecision } from '../lib/tools/decision-simulation.ts'
const a='11111111-1111-1111-1111-111111111111',b='22222222-2222-2222-2222-222222222222',key='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const input={price:100,budget:1000,feePercent:0,movePercent:20,stagedPrice:95,strike:100,premium:5,contractUnits:100}
const draft={saveKey:key,name:'BTC before CPI',asset:'BTC',inputs:input,referenceAt:'2026-10-10T00:00:00Z',referencePrice:100,referenceProvider:'CoinGecko'}
assert.ok(parseScenarioDraft(draft,'2026-10-12T00:00:00Z'))
for(const update of [{profile_id:b},{asset:'__proto__'},{name:' '},{name:'x'.repeat(81)},{name:'bad\nname'},{saveKey:'bad'},{referenceAt:'2999-01-01T00:00:00Z'},{asset:'CUSTOM'},{referenceProvider:''},{referencePrice:NaN}])assert.equal(parseScenarioDraft({...draft,...update},'2026-10-12T00:00:00Z'),null)
for(const values of [{...input,price:'100'},{...input,extra:1},Object.fromEntries(Object.entries(input).filter(([k])=>k!=='premium')),...[NaN,Infinity,-1,0].map(price=>({...input,price}))])assert.equal(parseScenarioDraft({...draft,inputs:values}),null)
const db=new PGlite(),rest=row=>JSON.parse(JSON.stringify(row))
await db.exec([
"create function gen_random_uuid() returns uuid language sql volatile as $$ select md5(random()::text||clock_timestamp()::text)::uuid $$;",
"create schema auth; create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;",
"create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;",
"grant usage on schema public,auth to anon,authenticated,service_role;",
"create table public.profiles(id uuid primary key); insert into public.profiles values ('"+a+"'),('"+b+"');",
"create table public.market_snapshots(id uuid primary key default gen_random_uuid(),symbol text,price numeric,provider text,captured_at timestamptz);",
"create table public.data_series(id uuid primary key default gen_random_uuid(),code text,is_public boolean);",
"create table public.data_points(id bigint generated always as identity,series_id uuid,value numeric,provider text,observed_at timestamptz);",
"grant select on public.market_snapshots,public.data_series,public.data_points to authenticated;",
"insert into public.market_snapshots(symbol,price,provider,captured_at) values ('BTC',100,'CoinGecko','2026-10-10T00:00:00Z');",
"insert into public.data_series(code,is_public) values ('GOLD',true);",
"insert into public.data_points(series_id,value,provider,observed_at) select id,2000,'Yahoo Finance','2026-10-08T00:00:00Z' from public.data_series;"
].join('\n'))
const migration=fs.readdirSync('supabase/migrations').find(p=>p.endsWith('_private_decision_scenarios.sql'))
assert.ok(migration);await db.exec(fs.readFileSync('supabase/migrations/'+migration,'utf8'))
async function role(id){await db.exec("reset role; set role authenticated; select set_config('request.jwt.claim.sub','"+id+"',false)")}
async function save(owner,name='BTC before CPI',nonce=key,asset='BTC',reference='2026-10-10T00:00:00Z',values=input,price=asset==='GOLD'?2000:reference?100:null,provider=reference?(asset==='GOLD'?'Yahoo Finance':'CoinGecko'):null){
  return rest((await db.query('insert into public.decision_scenarios(profile_id,save_key,name,asset,inputs,reference_at,reference_price,reference_provider) values ($1,$2,$3,$4,$5,$6,$7,$8) returning *',[owner,nonce,name,asset,values,reference,price,provider])).rows[0])
}
await db.exec('set role anon');await assert.rejects(db.exec('select * from public.decision_scenarios'))
await role(a);const first=await save(a),dto=savedScenario(first)
assert.ok(dto);assert.equal(dto.reference.price,100);assert.equal(dto.reference.provider,'CoinGecko');assert.equal(dto.calculationVersion,SCENARIO_VERSION)
assert.ok(!Object.hasOwn(dto,'profile_id')&&!Object.hasOwn(dto,'save_key'));assert.deepEqual(simulateDecision(dto.inputs),simulateDecision(input))
await assert.rejects(save(a),e=>e.code==='23505')
await assert.rejects(save(b),/scenario_owner_required/)
await assert.rejects(db.query('insert into public.decision_scenarios(profile_id,save_key,name,asset,inputs,reference) values ($1,gen_random_uuid(),$2,$3,$4,$5)',[a,'forged','BTC',input,{price:999}]))
await assert.rejects(db.exec("update public.decision_scenarios set profile_id='"+b+"'"))
await assert.rejects(db.exec("update public.decision_scenarios set inputs='{}'"))
await assert.rejects(db.query('insert into public.decision_scenarios(profile_id,save_key,name,asset,inputs,created_at) values ($1,gen_random_uuid(),$2,$3,$4,$5)',[a,'Past','CUSTOM',input,'2000-01-01']))
await assert.rejects(save(a,'Unavailable','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','BTC','2020-01-01T00:00:00Z'),/reference_unavailable/)
await assert.rejects(save(a,'Forged price','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','BTC','2026-10-10T00:00:00Z',input,999),/reference_unavailable/)
await assert.rejects(save(a,'Forged provider','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','BTC','2026-10-10T00:00:00Z',input,100,'Invented provider'),/reference_unavailable/)
await assert.rejects(save(a,'Bad numbers','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','CUSTOM',null,{...input,budget:0}))
await assert.rejects(save(a,'Extra key','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','CUSTOM',null,{...input,model_probability:.9}))
const gold=await save(a,'Gold','cccccccc-cccc-cccc-cccc-cccccccccccc','GOLD','2026-10-08T00:00:00Z')
assert.equal(savedScenario(gold).reference.label,'Gold futures reference')
await role(b);assert.equal((await db.query('select count(*)::int n from public.decision_scenarios')).rows[0].n,0)
assert.equal((await db.query('delete from public.decision_scenarios where id=$1 returning id',[first.id])).rows.length,0)
const other=await save(b);assert.notEqual(first.id,other.id)
await db.exec('reset role');await db.exec("update public.market_snapshots set price=150 where symbol='BTC'")
await role(a);const original=rest((await db.query('select * from public.decision_scenarios where id=$1',[first.id])).rows[0])
assert.equal(savedScenario(original).reference.price,100);assert.equal(savedScenario(original).reference.asOf,dto.reference.asOf)
assert.equal(savedScenario({...original,calculation_version:'future-unknown'}),null)
assert.equal(savedScenario({...original,reference:{...original.reference,href:'javascript:alert(1)'}}),null)
assert.equal(savedScenario({...original,inputs:{...input,model_probability:.9}}),null)
for(let i=2;i<50;i++)await save(a,'Case '+i,'00000000-0000-0000-0000-'+String(i).padStart(12,'0'),'CUSTOM',null)
assert.equal((await db.query('select count(*)::int n from public.decision_scenarios')).rows[0].n,50)
await assert.rejects(save(a,'Over limit','dddddddd-dddd-dddd-dddd-dddddddddddd','CUSTOM',null),/scenario_limit/)
await assert.rejects(save(a),e=>e.code==='23505')
assert.equal((await db.query('delete from public.decision_scenarios where id=$1 returning id',[first.id])).rows.length,1)
await save(a,'Room after delete','eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee','CUSTOM',null)
await db.exec('reset role')
assert.equal((await db.query("select relrowsecurity from pg_class where oid='public.decision_scenarios'::regclass")).rows[0].relrowsecurity,true)
assert.equal((await db.query("select prosecdef from pg_proc where oid='public.pin_decision_scenario_reference()'::regprocedure")).rows[0].prosecdef,false)
await db.close()
console.log('Saved-scenario QA passed: closed inputs, owner isolation, no anonymous access or forged sources, frozen source/calculation reproduction, idempotency, bounded storage, deletion and invoker-only RLS.')
