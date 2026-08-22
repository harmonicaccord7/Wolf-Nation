-- KAPORAL v0.5: story-level evidence and auditable agent runs.
create table if not exists public.story_sources (
  story_candidate_id uuid not null references public.story_candidates(id) on delete cascade,
  source_id uuid not null references public.sources(id) on delete cascade,
  note text,
  added_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (story_candidate_id,source_id)
);

create table if not exists public.story_claims (
  id uuid primary key default gen_random_uuid(),
  story_candidate_id uuid not null references public.story_candidates(id) on delete cascade,
  claim_text text not null,
  claim_type text not null default 'factual',
  confidence confidence_level not null default 'medium',
  verification_status text not null default 'unverified',
  evidence_note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.research_runs add column if not exists status text not null default 'completed';
alter table public.research_runs add column if not exists requested_by uuid references auth.users(id) on delete set null;
alter table public.research_runs add column if not exists prompt_version text;
alter table public.research_runs add column if not exists error text;
alter table public.research_runs add column if not exists model_metadata jsonb not null default '{}'::jsonb;

alter table public.story_sources enable row level security;
alter table public.story_claims enable row level security;

do $$ begin
 if not exists (select 1 from pg_policies where schemaname='public' and tablename='story_sources' and policyname='research_team_manage_story_sources') then
  create policy research_team_manage_story_sources on public.story_sources for all
   using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('researcher','editor','admin')))
   with check (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('researcher','editor','admin')));
 end if;
 if not exists (select 1 from pg_policies where schemaname='public' and tablename='story_claims' and policyname='research_team_manage_story_claims') then
  create policy research_team_manage_story_claims on public.story_claims for all
   using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('researcher','editor','admin')))
   with check (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('researcher','editor','admin')));
 end if;
 if not exists (select 1 from pg_policies where schemaname='public' and tablename='research_runs' and policyname='research_team_update_runs') then
  create policy research_team_update_runs on public.research_runs for update
   using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('researcher','editor','admin')))
   with check (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('researcher','editor','admin')));
 end if;
end $$;

create index if not exists story_claims_story_idx on public.story_claims(story_candidate_id,created_at desc);
create index if not exists story_sources_story_idx on public.story_sources(story_candidate_id,created_at desc);
create index if not exists research_runs_story_status_idx on public.research_runs(story_candidate_id,status,started_at desc);
