create index if not exists data_series_provider_idx on public.data_series(provider_id);
create index if not exists research_runs_requested_by_idx on public.research_runs(requested_by);
create index if not exists story_claims_created_by_idx on public.story_claims(created_by);
create index if not exists story_sources_added_by_idx on public.story_sources(added_by);
create index if not exists story_sources_source_idx on public.story_sources(source_id);
