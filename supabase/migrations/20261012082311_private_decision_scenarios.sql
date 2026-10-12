-- Private, immutable calculation cases. No billing, entitlement or model changes.
create or replace function public.decision_scenario_inputs_valid(value jsonb)
returns boolean language plpgsql immutable security invoker set search_path = '' as $$
declare key text;
begin
  if jsonb_typeof(value) is distinct from 'object'
    or not value ?& array['price','budget','feePercent','movePercent','stagedPrice','strike','premium','contractUnits']
    or value - array['price','budget','feePercent','movePercent','stagedPrice','strike','premium','contractUnits'] <> '{}'::jsonb
    then return false; end if;
  foreach key in array array['price','budget','feePercent','movePercent','stagedPrice','strike','premium','contractUnits'] loop
    if jsonb_typeof(value->key) is distinct from 'number' then return false; end if;
  end loop;
  return (value->>'price')::numeric between 0.00000001 and 1000000000
    and (value->>'budget')::numeric between 0.01 and 1000000000
    and (value->>'feePercent')::numeric between 0 and 10
    and (value->>'movePercent')::numeric between -100 and 1000
    and (value->>'stagedPrice')::numeric between 0.00000001 and 1000000000
    and (value->>'strike')::numeric between 0.00000001 and 1000000000
    and (value->>'premium')::numeric between 0.00000001 and 1000000000
    and (value->>'contractUnits')::numeric between 1 and 10000
    and (value->>'contractUnits')::numeric = trunc((value->>'contractUnits')::numeric);
end $$;
revoke all on function public.decision_scenario_inputs_valid(jsonb) from public,anon,authenticated,service_role;
grant execute on function public.decision_scenario_inputs_valid(jsonb) to authenticated;

create table public.decision_scenarios (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  save_key uuid not null,
  name text not null check (name=btrim(name) and length(name) between 1 and 80 and name !~ '[[:cntrl:]]'),
  asset text not null check (asset in ('BTC','ETH','SOL','GOLD','CUSTOM')),
  inputs jsonb not null check (pg_column_size(inputs)<=1024 and public.decision_scenario_inputs_valid(inputs)),
  reference_at timestamptz,
  reference_price numeric,
  reference_provider text,
  reference jsonb,
  calculation_version text not null default 'decision-lab-1.0' check (calculation_version='decision-lab-1.0'),
  created_at timestamptz not null default now(),
  unique(profile_id,save_key),
  check (reference_at is null or reference_at<=created_at),
  check (asset<>'CUSTOM' or reference_at is null),
  check ((reference_at is null)=(reference is null)),
  check ((reference_at is null)=(reference_price is null)),
  check ((reference_at is null)=(reference_provider is null))
);
create index decision_scenarios_owner_created on public.decision_scenarios(profile_id,created_at desc);
alter table public.decision_scenarios enable row level security;
revoke all on table public.decision_scenarios from public,anon,authenticated,service_role;
grant select,delete on table public.decision_scenarios to authenticated;
grant insert(profile_id,save_key,name,asset,inputs,reference_at,reference_price,reference_provider) on public.decision_scenarios to authenticated;
grant select on table public.decision_scenarios to service_role;
create policy decision_scenarios_own_read on public.decision_scenarios for select to authenticated using ((select auth.uid())=profile_id);
create policy decision_scenarios_own_create on public.decision_scenarios for insert to authenticated with check ((select auth.uid())=profile_id);
create policy decision_scenarios_own_remove on public.decision_scenarios for delete to authenticated using ((select auth.uid())=profile_id);

create or replace function public.pin_decision_scenario_reference()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare observed record; label text; previous public.decision_scenarios%rowtype;
begin
  -- Check identity before taking a per-owner quota lock or reading a reference.
  if auth.uid() is null or new.profile_id is distinct from auth.uid() then
    raise exception 'scenario_owner_required' using errcode='42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('decision_scenarios:'||new.profile_id::text,0));
  select * into previous from public.decision_scenarios where profile_id=new.profile_id and save_key=new.save_key;
  if found then
    -- Preserve idempotency when an upstream price has subsequently changed.
    new:=previous;
    return new;
  end if;
  if (select count(*) from public.decision_scenarios where profile_id=new.profile_id)>=50 then
    raise exception 'scenario_limit' using errcode='23514';
  end if;
  new.created_at:=now();
  new.calculation_version:='decision-lab-1.0';
  new.reference:=null;
  if new.reference_at is not null then
    if new.asset in ('BTC','ETH','SOL') then
      select price,provider,captured_at as as_of,id::text as source_id into observed
        from public.market_snapshots where symbol=new.asset and captured_at=new.reference_at and provider=new.reference_provider limit 1;
    elsif new.asset='GOLD' then
      select p.value as price,p.provider,p.observed_at as as_of,p.id::text as source_id into observed
        from public.data_points p join public.data_series s on s.id=p.series_id
        where s.code='GOLD' and s.is_public and p.observed_at=new.reference_at and p.provider=new.reference_provider limit 1;
    else raise exception 'reference_unavailable'; end if;
    if not found or observed.price is null or observed.price<=0 or observed.price is distinct from new.reference_price or observed.provider is null or length(observed.provider) not between 1 and 120 then
      raise exception 'reference_unavailable';
    end if;
    label:=case new.asset when 'BTC' then 'Bitcoin' when 'ETH' then 'Ethereum' when 'SOL' then 'Solana' when 'GOLD' then 'Gold futures reference' end;
    new.reference:=jsonb_build_object('symbol',new.asset,'label',label,'price',observed.price,'provider',observed.provider,'asOf',observed.as_of,'href','/data/'||lower(new.asset),'sourceId',observed.source_id);
  end if;
  return new;
end $$;
revoke all on function public.pin_decision_scenario_reference() from public,anon,authenticated,service_role;
create trigger pin_decision_scenario before insert on public.decision_scenarios for each row execute function public.pin_decision_scenario_reference();
comment on table public.decision_scenarios is 'Owner-only frozen user assumptions and stored public-price references. Not forecasts, trades, payment records or premium entitlements. Bounded to 50 per owner; editing creates a new copy.';
