-- KAPORAL decision workspace v0.1. Applied 2026-09-12.
-- Additive workspace. Publication is enforced in PostgreSQL as well as in the UI.

create table if not exists public.economic_events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  kind text not null check (kind in ('cpi','pce','fomc','payrolls','ppi','gdp')),
  title text not null,
  scheduled_at timestamptz not null,
  date_precision text not null default 'minute' check (date_precision in ('minute','date')),
  timezone text not null default 'America/New_York',
  provider text not null,
  source_url text not null,
  checked_at timestamptz not null default now(),
  provider_sequence integer not null default 0,
  status text not null default 'scheduled' check (status in ('scheduled','cancelled','draft')),
  reference_period text,
  unit text,
  prior_value numeric,
  consensus_value numeric,
  actual_value numeric,
  revised_prior_value numeric,
  release_notes text,
  source_claim_status text not null default 'unreviewed' check (source_claim_status in ('unreviewed','reviewed')),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  review_notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists economic_events_schedule_idx on public.economic_events(scheduled_at, status);
create index if not exists economic_events_kind_idx on public.economic_events(kind, scheduled_at);

create table if not exists public.event_scenarios (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.economic_events(id) on delete cascade,
  scenario_key text not null check (scenario_key in ('above_consensus','in_line','below_consensus','decision_unclear')),
  title text not null,
  observation text not null,
  possible_mechanism text not null,
  asset_impacts jsonb not null default '{}'::jsonb,
  decision_options jsonb not null default '[]'::jsonb,
  invalidation text not null,
  evidence_urls jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft','review','published','archived')),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(event_id, scenario_key)
);
create index if not exists event_scenarios_public_idx on public.event_scenarios(event_id, status);

create table if not exists public.watchlists (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null default 'My watchlist',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(profile_id, name)
);
create table if not exists public.watchlist_items (
  id uuid primary key default gen_random_uuid(),
  watchlist_id uuid not null references public.watchlists(id) on delete cascade,
  symbol text,
  event_id uuid references public.economic_events(id) on delete cascade,
  created_at timestamptz not null default now(),
  check ((symbol is not null and event_id is null) or (symbol is null and event_id is not null)),
  unique(watchlist_id, symbol),
  unique(watchlist_id, event_id)
);
create table if not exists public.reader_preferences (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  timezone text not null default 'UTC',
  newsletter_frequency text not null default 'weekly' check (newsletter_frequency in ('weekly','weekday','material_event','off')),
  event_alerts boolean not null default true,
  preferred_assets jsonb not null default '["BTC","ETH","GOLD"]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.newsletter_issues (
  id uuid primary key default gen_random_uuid(),
  issue_key text not null unique,
  title text not null,
  dek text,
  body jsonb not null default '{}'::jsonb,
  issue_date date not null,
  issue_kind text not null default 'weekly' check (issue_kind in ('weekly','weekday','material_event')),
  status text not null default 'draft' check (status in ('draft','review','approved','published','archived')),
  source_snapshot jsonb not null default '{}'::jsonb,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  review_notes text,
  approved_at timestamptz,
  approved_by uuid references public.profiles(id),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.newsletter_deliveries (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.newsletter_issues(id) on delete cascade,
  subscriber_id uuid references public.newsletter_subscribers(id) on delete cascade,
  recipient_hash text not null,
  status text not null default 'queued' check (status in ('queued','sending','sent','failed','suppressed')),
  attempts integer not null default 0,
  provider_message_id text,
  last_error text,
  queued_at timestamptz not null default now(),
  sent_at timestamptz,
  next_attempt_at timestamptz not null default now(),
  lease_expires_at timestamptz,
  first_attempt_at timestamptz,
  unique(issue_id, recipient_hash)
);
create index if not exists newsletter_delivery_queue_idx on public.newsletter_deliveries(status, queued_at);

create table if not exists public.model_runs (
  id uuid primary key default gen_random_uuid(),
  module_code text not null,
  model_version text not null,
  run_type text not null check (run_type in ('baseline_backtest','forward_ledger','research_snapshot')),
  universe text not null,
  period_start date,
  period_end date,
  as_of timestamptz not null,
  status text not null default 'completed' check (status in ('running','completed','abstained','failed')),
  input_snapshot jsonb not null default '{}'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  results jsonb not null default '[]'::jsonb,
  abstention_reason text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists model_runs_module_idx on public.model_runs(module_code, as_of desc);

alter table public.economic_events enable row level security;
alter table public.event_scenarios enable row level security;
alter table public.watchlists enable row level security;
alter table public.watchlist_items enable row level security;
alter table public.reader_preferences enable row level security;
alter table public.newsletter_issues enable row level security;
alter table public.newsletter_deliveries enable row level security;
alter table public.model_runs enable row level security;

drop policy if exists public_read_economic_events on public.economic_events;
create policy public_read_economic_events on public.economic_events for select to anon, authenticated using (status in ('scheduled','cancelled') and (source_claim_status='reviewed' or (prior_value is null and consensus_value is null and actual_value is null and revised_prior_value is null)));
drop policy if exists public_read_event_scenarios on public.event_scenarios;
create policy public_read_event_scenarios on public.event_scenarios for select to anon, authenticated using (status = 'published' and reviewed_at is not null);

do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='economic_events' and policyname='staff_manage_economic_events') then
    create policy staff_manage_economic_events on public.economic_events for all to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('researcher','editor','admin'))) with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('researcher','editor','admin')));
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='event_scenarios' and policyname='staff_manage_event_scenarios') then
    create policy staff_manage_event_scenarios on public.event_scenarios for all to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('researcher','editor','admin'))) with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('researcher','editor','admin')));
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='newsletter_issues' and policyname='public_read_published_newsletter_issues') then
    create policy public_read_published_newsletter_issues on public.newsletter_issues for select to anon, authenticated using (status='published' and published_at is not null and published_at<=now());
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='newsletter_issues' and policyname='staff_manage_newsletter_issues') then
    create policy staff_manage_newsletter_issues on public.newsletter_issues for all to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('researcher','editor','admin'))) with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('researcher','editor','admin')));
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='newsletter_deliveries' and policyname='staff_manage_newsletter_deliveries') then
    create policy staff_manage_newsletter_deliveries on public.newsletter_deliveries for all to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('editor','admin'))) with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('editor','admin')));
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='model_runs' and policyname='staff_read_model_runs') then
    create policy staff_read_model_runs on public.model_runs for select to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('researcher','editor','admin')));
    create policy staff_insert_model_runs on public.model_runs for insert to authenticated with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('researcher','editor','admin')));
  end if;
end $$;

drop policy if exists owner_manage_watchlists on public.watchlists;
create policy owner_manage_watchlists on public.watchlists for all to authenticated using (profile_id=auth.uid()) with check (profile_id=auth.uid());
drop policy if exists owner_manage_watchlist_items on public.watchlist_items;
create policy owner_manage_watchlist_items on public.watchlist_items for all to authenticated using (exists(select 1 from public.watchlists w where w.id=watchlist_id and w.profile_id=auth.uid())) with check (exists(select 1 from public.watchlists w where w.id=watchlist_id and w.profile_id=auth.uid()));
drop policy if exists owner_manage_reader_preferences on public.reader_preferences;
create policy owner_manage_reader_preferences on public.reader_preferences for all to authenticated using (profile_id=auth.uid()) with check (profile_id=auth.uid());

revoke all on public.economic_events, public.event_scenarios, public.newsletter_issues, public.watchlists, public.watchlist_items, public.reader_preferences, public.newsletter_deliveries, public.model_runs from anon, authenticated;
grant select on public.economic_events, public.event_scenarios, public.newsletter_issues to anon, authenticated;
grant insert, update on public.economic_events, public.event_scenarios, public.newsletter_issues to authenticated;
grant select, insert, update, delete on public.watchlists, public.watchlist_items, public.reader_preferences to authenticated;
grant select, insert on public.model_runs to authenticated;
grant select on public.newsletter_deliveries to authenticated;
grant all on public.economic_events, public.event_scenarios, public.newsletter_issues, public.watchlists, public.watchlist_items, public.reader_preferences, public.newsletter_deliveries, public.model_runs to service_role;

create schema if not exists private;
grant usage on schema private to authenticated, service_role;

-- Email-confirmed signups have no session when the browser first tries to insert
-- a profile. Create it at the trusted Auth insert boundary instead. Roles are
-- always reader; arbitrary signup metadata can never grant editorial access.
create function private.create_reader_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if TG_TABLE_SCHEMA<>'auth' or TG_TABLE_NAME<>'users' or TG_OP<>'INSERT' then raise exception 'Auth insert trigger only'; end if;
  insert into public.profiles(id,role) values(new.id,'reader') on conflict(id) do nothing;
  return new;
end $$;
revoke all on function private.create_reader_profile() from public, anon, authenticated;
create trigger kaporal_create_reader_profile after insert on auth.users for each row execute function private.create_reader_profile();
insert into public.profiles(id,role) select id,'reader' from auth.users on conflict(id) do nothing;

-- Invoker trigger: roles come from the protected profiles table, never user metadata.
create or replace function private.guard_newsletter_publication() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare actor_role text; content_changed boolean;
begin
  select role into actor_role from public.profiles where id=(select auth.uid());
  if TG_OP='INSERT' then
    if new.status<>'draft' then raise exception 'Issues must start as drafts'; end if;
    new.reviewed_at:=null; new.reviewed_by:=null; new.approved_at:=null; new.approved_by:=null; new.published_at:=null; new.review_notes:=null;
    return new;
  end if;
  content_changed := (new.title,new.dek,new.body,new.source_snapshot,new.issue_key,new.issue_date,new.issue_kind) is distinct from (old.title,old.dek,old.body,old.source_snapshot,old.issue_key,old.issue_date,old.issue_kind);
  if old.status in ('published','archived') then
    if content_changed or new.status not in ('published','archived') or new.published_at is distinct from old.published_at or new.review_notes is distinct from old.review_notes then raise exception 'Published editions are immutable; create a correction edition'; end if;
    if new.status<>old.status and coalesce(actor_role,'') not in ('editor','admin') then raise exception 'Editor required'; end if;
    new.reviewed_at:=old.reviewed_at; new.reviewed_by:=old.reviewed_by; new.approved_at:=old.approved_at; new.approved_by:=old.approved_by;
    return new;
  end if;
  if content_changed and new.status<>'draft' then raise exception 'Return to draft before changing reviewed content'; end if;
  if new.status='draft' then
    new.reviewed_at:=null; new.reviewed_by:=null; new.approved_at:=null; new.approved_by:=null; new.published_at:=null; new.review_notes:=null;
  elsif new.status='review' and old.status in ('draft','review') then
    new.reviewed_at:=null; new.reviewed_by:=null; new.approved_at:=null; new.approved_by:=null; new.published_at:=null;
  elsif new.status='approved' and old.status='review' then
    if coalesce(actor_role,'') not in ('editor','admin') then raise exception 'Editor required'; end if;
    if length(trim(coalesce(new.review_notes,'')))<20 then raise exception 'Record an editorial review of sources and financial claims'; end if;
    if jsonb_typeof(new.body->'blocks') is distinct from 'array' or jsonb_array_length(new.body->'blocks')=0 then raise exception 'Issue body is empty'; end if;
    if jsonb_typeof(new.source_snapshot->'events') is distinct from 'array' or jsonb_array_length(new.source_snapshot->'events')=0 or new.source_snapshot->>'sourceState' is distinct from 'live' then raise exception 'Complete source snapshot required'; end if;
    new.reviewed_at:=now(); new.reviewed_by:=auth.uid(); new.approved_at:=now(); new.approved_by:=auth.uid(); new.published_at:=null;
  elsif new.status='published' and old.status='approved' then
    if coalesce(actor_role,'') not in ('editor','admin') or old.approved_by is null then raise exception 'Approved issue and editor required'; end if;
    new.reviewed_at:=old.reviewed_at; new.reviewed_by:=old.reviewed_by; new.review_notes:=old.review_notes; new.approved_at:=old.approved_at; new.approved_by:=old.approved_by; new.published_at:=now();
  else raise exception 'Invalid editorial transition';
  end if;
  new.updated_at:=now(); return new;
end $$;
revoke all on function private.guard_newsletter_publication() from public, anon, authenticated;
create trigger newsletter_publication_guard before insert or update on public.newsletter_issues for each row execute function private.guard_newsletter_publication();

create or replace function private.guard_event_publication() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare actor_role text; payload_changed boolean;
begin
  select role into actor_role from public.profiles where id=(select auth.uid());
  if TG_TABLE_NAME='event_scenarios' then
    if TG_OP='INSERT' and new.status<>'draft' then raise exception 'Scenarios must start as drafts'; end if;
    if TG_OP='UPDATE' and old.status in ('published','archived') then
      if (to_jsonb(new)-'status'-'updated_at') is distinct from (to_jsonb(old)-'status'-'updated_at') or new.status not in ('published','archived') then raise exception 'Published scenario is immutable'; end if;
    end if;
    if new.status in ('published','archived') then
      if coalesce(actor_role,'') not in ('editor','admin') then raise exception 'Editor required'; end if;
      if TG_OP='UPDATE' and old.status='review' and new.status='published' then
        if length(trim(coalesce(new.review_notes,'')))<20 or jsonb_array_length(new.evidence_urls)=0 then raise exception 'Sources and editorial review required'; end if;
        new.reviewed_at:=now(); new.reviewed_by:=auth.uid();
      elsif TG_OP='INSERT' or old.status not in ('published','archived') then raise exception 'Scenario must pass review before publication'; end if;
    else new.reviewed_at:=null; new.reviewed_by:=null;
    end if;
  else
    payload_changed := TG_OP='INSERT';
    if TG_OP='UPDATE' then payload_changed := (new.prior_value,new.consensus_value,new.actual_value,new.revised_prior_value,new.source_claim_status,new.metadata->'value_sources',new.reference_period,new.unit) is distinct from (old.prior_value,old.consensus_value,old.actual_value,old.revised_prior_value,old.source_claim_status,old.metadata->'value_sources',old.reference_period,old.unit); end if;
    if new.prior_value is not null or new.consensus_value is not null or new.actual_value is not null or new.revised_prior_value is not null then
      if payload_changed then
        if coalesce(actor_role,'') not in ('editor','admin') or new.source_claim_status<>'reviewed' or length(trim(coalesce(new.review_notes,'')))<20 or new.metadata->'value_sources' is null or new.reference_period is null or new.unit is null then raise exception 'Numeric release claims need an editor, units, reference period and value sources'; end if;
        new.reviewed_at:=now(); new.reviewed_by:=auth.uid();
      end if;
    end if;
  end if;
  new.updated_at:=now(); return new;
end $$;
revoke all on function private.guard_event_publication() from public, anon, authenticated;
create trigger event_publication_guard before insert or update on public.event_scenarios for each row execute function private.guard_event_publication();
create trigger event_values_guard before insert or update on public.economic_events for each row execute function private.guard_event_publication();

-- No subscriber addresses are exposed to the signed-in application. The narrow
-- definer helper checks the editor again and returns only the inserted row count.
create or replace function private.queue_newsletter_issue(target_issue uuid) returns integer
language plpgsql security definer set search_path = '' as $$
declare edition public.newsletter_issues; inserted_count integer;
begin
  if not exists(select 1 from public.profiles where id=(select auth.uid()) and role in ('editor','admin')) then raise exception 'Editor required'; end if;
  select * into edition from public.newsletter_issues where id=target_issue for update;
  if edition.status is distinct from 'published' or edition.published_at is null or edition.published_at>now() or edition.approved_by is null then raise exception 'Published approved issue required'; end if;
  insert into public.newsletter_deliveries(issue_id,subscriber_id,recipient_hash)
  select edition.id,s.id,s.id::text from public.newsletter_subscribers s
  left join auth.users u on lower(u.email)=lower(s.email) and u.email_confirmed_at is not null
  left join public.reader_preferences p on p.profile_id=u.id
  where s.status='confirmed' and s.confirmed_at is not null and s.consent_at is not null and s.unsubscribed_at is null
    and coalesce(p.newsletter_frequency,'weekly')=edition.issue_kind
    and (edition.issue_kind<>'material_event' or coalesce(p.event_alerts,false))
  on conflict(issue_id,recipient_hash) do nothing;
  get diagnostics inserted_count=row_count; return inserted_count;
end $$;
revoke all on function private.queue_newsletter_issue(uuid) from public, anon, authenticated;
grant execute on function private.queue_newsletter_issue(uuid) to authenticated;
create or replace function public.queue_newsletter_issue(target_issue uuid) returns integer
language sql security invoker set search_path = '' as $$ select private.queue_newsletter_issue(target_issue) $$;
revoke all on function public.queue_newsletter_issue(uuid) from public, anon;
grant execute on function public.queue_newsletter_issue(uuid) to authenticated;

create index on public.economic_events(reviewed_by);
create index on public.event_scenarios(reviewed_by);
create index on public.newsletter_issues(reviewed_by);
create index on public.newsletter_issues(approved_by);
create index on public.newsletter_deliveries(subscriber_id);
create index on public.model_runs(created_by);
create index on public.watchlist_items(event_id);

-- Delivery tokens never enter an exposed table or staff response. Keeping the
-- token stable also keeps retries byte-for-byte identical at the provider.
create table private.newsletter_delivery_tokens (
  delivery_id uuid primary key references public.newsletter_deliveries(id) on delete cascade,
  token text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text,'-','')
);
alter table private.newsletter_delivery_tokens enable row level security;
revoke all on private.newsletter_delivery_tokens from public, anon, authenticated;
grant all on private.newsletter_delivery_tokens to service_role;

create function public.newsletter_recipient_eligible(target_delivery uuid) returns boolean
language sql security invoker set search_path = '' as $$
  select exists(select 1 from public.newsletter_deliveries d
    join public.newsletter_issues i on i.id=d.issue_id
    join public.newsletter_subscribers s on s.id=d.subscriber_id
    left join auth.users u on lower(u.email)=lower(s.email) and u.email_confirmed_at is not null
    left join public.reader_preferences p on p.profile_id=u.id
    where d.id=target_delivery and i.status='published' and i.approved_by is not null and i.published_at<=now()
      and s.status='confirmed' and s.confirmed_at is not null and s.consent_at is not null and s.unsubscribed_at is null
      and coalesce(p.newsletter_frequency,'weekly')=i.issue_kind
      and (i.issue_kind<>'material_event' or coalesce(p.event_alerts,false)))
$$;
revoke all on function public.newsletter_recipient_eligible(uuid) from public, anon, authenticated;
grant execute on function public.newsletter_recipient_eligible(uuid) to service_role;

create function public.claim_newsletter_deliveries(target_issue uuid, batch_size integer default 3)
returns table(delivery_id uuid,issue_key text,title text,body jsonb,email text,unsubscribe_token text,attempt integer)
language plpgsql security invoker set search_path = '' as $$
begin
  if batch_size<1 or batch_size>10 then raise exception 'Batch size must be 1–10'; end if;
  -- Expired ambiguous sends cannot be retried outside the provider's 24h
  -- idempotency window. Leave them for reconciliation, never resend blindly.
  update public.newsletter_deliveries d set status='failed',last_error='reconciliation_required',next_attempt_at='infinity'
    where d.issue_id=target_issue and d.status in ('sending','failed') and d.first_attempt_at<now()-interval '23 hours';
  update public.newsletter_deliveries d set status='suppressed',last_error='consent_or_cadence_changed'
    where d.issue_id=target_issue and d.status in ('queued','failed') and not public.newsletter_recipient_eligible(d.id);
  return query with candidates as (
    select d.id from public.newsletter_deliveries d
    where d.issue_id=target_issue and ((d.status in ('queued','failed') and d.next_attempt_at<=now()) or (d.status='sending' and d.lease_expires_at<now()))
      and d.attempts<5 and (d.first_attempt_at is null or d.first_attempt_at>=now()-interval '23 hours')
      and public.newsletter_recipient_eligible(d.id)
    order by d.queued_at,d.id for update skip locked limit batch_size
  ), claimed as (
    update public.newsletter_deliveries d set status='sending',attempts=d.attempts+1,lease_expires_at=now()+interval '5 minutes',first_attempt_at=coalesce(d.first_attempt_at,now())
    from candidates c where d.id=c.id returning d.id,d.issue_id,d.subscriber_id,d.attempts
  ), tokens as (
    insert into private.newsletter_delivery_tokens as nt(delivery_id) select c.id from claimed c
    on conflict on constraint newsletter_delivery_tokens_pkey do update set delivery_id=excluded.delivery_id returning nt.delivery_id,nt.token
  ) select c.id,i.issue_key,i.title,i.body,s.email,t.token,c.attempts
    from claimed c join public.newsletter_issues i on i.id=c.issue_id join public.newsletter_subscribers s on s.id=c.subscriber_id join tokens t on t.delivery_id=c.id;
end $$;
revoke all on function public.claim_newsletter_deliveries(uuid,integer) from public, anon, authenticated;
grant execute on function public.claim_newsletter_deliveries(uuid,integer) to service_role;

create function public.unsubscribe_newsletter_delivery(token_input text) returns boolean
language plpgsql security invoker set search_path = '' as $$
declare subscriber uuid;
begin
  if length(token_input)<>64 then return false; end if;
  select d.subscriber_id into subscriber from private.newsletter_delivery_tokens t join public.newsletter_deliveries d on d.id=t.delivery_id where t.token=token_input;
  if subscriber is null then return false; end if;
  update public.newsletter_subscribers set status='unsubscribed',unsubscribed_at=coalesce(unsubscribed_at,now()) where id=subscriber;
  update public.newsletter_deliveries set status='suppressed',last_error='unsubscribed' where subscriber_id=subscriber and status in ('queued','failed');
  return true;
end $$;
revoke all on function public.unsubscribe_newsletter_delivery(text) from public, anon, authenticated;
grant execute on function public.unsubscribe_newsletter_delivery(text) to service_role;
