import assert from 'node:assert/strict'
import fs from 'node:fs'
import {PGlite} from '@electric-sql/pglite'
import {simulateCurrency,currencyInputError} from '../lib/tools/currency-simulation.ts'
import {africaCountries} from '../lib/africa/countries.ts'
const base={budgetUsd:1000,entryRate:600,exitRate:600,localReturnPercent:10,inflationPercent:5,years:1,feePercent:0}
const near=(a,b)=>assert.ok(Math.abs(a-b)<Math.max(1,Math.abs(b))*1e-10,`${a} != ${b}`)
let result=simulateCurrency(base);near(result.finalUsd,1100);near(result.realLocalReturnPercent,(1.1/1.05-1)*100)
result=simulateCurrency({...base,exitRate:720});near(result.finalUsd,916.6666666666667);assert.ok(result.profitUsd<0)
result=simulateCurrency({...base,feePercent:1});near(result.finalUsd,1000*.99*1.1*.99);near(result.feesLocal,6000+594000*1.1*.01)
result=simulateCurrency({...base,localReturnPercent:0,years:2});near(result.realLocalReturnPercent,(1/1.05**2-1)*100)
result=simulateCurrency({...base,localReturnPercent:-100});near(result.finalUsd,0);near(result.realLocalReturnPercent,-100)
for(const update of [{budgetUsd:0},{entryRate:0},{exitRate:NaN},{exitRate:1e-300},{feePercent:11},{localReturnPercent:-101},{inflationPercent:-100},{years:0},{years:21}]){assert.ok(currencyInputError({...base,...update}));assert.throws(()=>simulateCurrency({...base,...update}))}
assert.equal(africaCountries.length,9);assert.equal(new Set(africaCountries.map(c=>c.slug)).size,9);assert.equal(new Set(africaCountries.map(c=>c.code)).size,9)
for(const country of africaCountries){assert.equal(new URL(country.exchangeUrl).protocol,'https:');assert.equal(country.questions.length,3);assert.match(country.code,/^[A-Z]{3}$/);assert.match(country.currency,/^[A-Z]{3}$/)}
const db=new PGlite()
await db.exec(`create table public.data_series(code text primary key,label text,desk_slug text,provider_id text,provider_series_code text,category text,region text,country_code text,unit text,frequency text,source_url text,description text,is_public boolean,sort_order integer,metadata jsonb); alter table public.data_series enable row level security;`)
for(const [suffix,indicator,unit] of [['GDP_GROWTH','NY.GDP.MKTP.KD.ZG','%'],['INFLATION','FP.CPI.TOTL.ZG','%'],['FX_USD','PA.NUS.FCRF','LCU per USD'],['RESERVES','FI.RES.TOTL.CD','USD']])await db.query('insert into public.data_series values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)',[`NGA_${suffix}`,`Nigeria — ${suffix}`,'africa','world-bank',indicator,'macro','Africa','NGA',unit,'annual',`https://api.worldbank.org/v2/country/NGA/indicator/${indicator}`,'Nigeria official annual indicator',true,1,{}])
const sql=fs.readFileSync('supabase/migrations/20261011171512_add_botswana_macro_series.sql','utf8');await db.exec(sql);await db.exec(sql)
const registered=(await db.query("select * from public.data_series where country_code='BWA'")).rows
assert.equal(registered.length,4)
for(const row of registered){assert.equal(row.provider_id,'world-bank');assert.ok(row.is_public);assert.match(row.source_url,/\/BWA\/indicator\//);assert.match(row.label,/Botswana/);assert.equal(row.metadata.currency,'BWP')}
assert.equal((await db.query("select relrowsecurity from pg_class where oid='public.data_series'::regclass")).rows[0].relrowsecurity,true)
await db.close()
console.log('Africa QA passed: nominal/USD/real purchasing power, FX loss, conversion fees, invalid input, nine distinct country routes, idempotent Botswana registration and unchanged RLS.')
