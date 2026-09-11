-- KAPORAL decision workspace v0.1.
-- Additive only: no existing public data or publication gate is changed here.

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
  status text not null default 'draft' check (status in ('draft','review','approved','published','archived')),
  source_snapshot jsonb not null default '{}'::jsonb,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  approved_at timestamptz,
  approved_by uuid references public.profiles(id),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.newsletter_deliveries (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.newsletter_issues(id) on delete cascade,
  subscriber_id uuid,
  recipient_hash text not null,
  status text not null default 'queued' check (status in ('queued','sending','sent','failed','suppressed')),
  attempts integer not null default 0,
  provider_message_id text,
  last_error text,
  queued_at timestamptz not null default now(),
  sent_at timestamptz,
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
create policy public_read_economic_events on public.economic_events for select to anon, authenticated using (status = 'scheduled');
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

grant select on public.economic_events, public.event_scenarios, public.newsletter_issues to anon, authenticated;
grant select, insert, update, delete on public.watchlists, public.watchlist_items, public.reader_preferences to authenticated;
grant select on public.model_runs to authenticated;
