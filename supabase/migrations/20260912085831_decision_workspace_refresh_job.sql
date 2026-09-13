-- Applied 2026-09-12: private job authorization for factual refreshes and drafts.
-- It cannot approve financial conclusions or broadcast an edition.
do $$ begin
  if not exists(select 1 from vault.secrets where name='kaporal_workspace_job_token') then
    perform vault.create_secret(replace(gen_random_uuid()::text || gen_random_uuid()::text,'-',''),'kaporal_workspace_job_token','KAPORAL factual workspace refresh authentication');
  end if;
end $$;
create function private.authorize_workspace_refresh(token_input text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.role()) is distinct from 'service_role' then return false; end if;
  return length(token_input)=64 and exists(select 1 from vault.decrypted_secrets where name='kaporal_workspace_job_token' and decrypted_secret=token_input);
end $$;
revoke all on function private.authorize_workspace_refresh(text) from public, anon, authenticated;
grant execute on function private.authorize_workspace_refresh(text) to service_role;
create function public.authorize_workspace_refresh(token_input text) returns boolean
language sql security invoker set search_path = '' as $$ select private.authorize_workspace_refresh(token_input) $$;
revoke all on function public.authorize_workspace_refresh(text) from public, anon, authenticated;
grant execute on function public.authorize_workspace_refresh(text) to service_role;

create function public.sync_economic_events(events_json jsonb) returns integer
language plpgsql security invoker set search_path = '' as $$
declare affected integer;
begin
  if jsonb_typeof(events_json)<>'array' or jsonb_array_length(events_json)>1000 then raise exception 'Expected at most 1000 source events'; end if;
  insert into public.economic_events(slug,kind,title,scheduled_at,date_precision,timezone,provider,source_url,checked_at,provider_sequence,status,metadata)
  select e.slug,e.kind,e.title,e.scheduled_at,e.date_precision,e.timezone,e.provider,e.source_url,e.checked_at,e.provider_sequence,e.status,e.metadata
  from jsonb_to_recordset(events_json) as e(slug text,kind text,title text,scheduled_at timestamptz,date_precision text,timezone text,provider text,source_url text,checked_at timestamptz,provider_sequence integer,status text,metadata jsonb)
  where e.source_url like 'https://%'
  on conflict(slug) do update set title=excluded.title,scheduled_at=excluded.scheduled_at,date_precision=excluded.date_precision,timezone=excluded.timezone,provider=excluded.provider,source_url=excluded.source_url,checked_at=excluded.checked_at,provider_sequence=excluded.provider_sequence,status=excluded.status,metadata=public.economic_events.metadata || excluded.metadata
  where excluded.checked_at>=public.economic_events.checked_at and excluded.provider_sequence>=public.economic_events.provider_sequence;
  get diagnostics affected=row_count;
  return affected;
end $$;
revoke all on function public.sync_economic_events(jsonb) from public, anon;
grant execute on function public.sync_economic_events(jsonb) to authenticated, service_role;

-- This explicit service policy documents the intended access; no client can
-- select raw delivery tokens, even if a grant is accidentally broadened later.
create policy service_delivery_tokens on private.newsletter_delivery_tokens for all to service_role using(true) with check(true);

select cron.schedule('kaporal-decision-workspace-refresh','25 */6 * * *',$job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name='kaporal_project_url' limit 1) || '/functions/v1/decision-workspace-refresh',
    headers := jsonb_build_object('Content-Type','application/json','x-kaporal-job-token',(select decrypted_secret from vault.decrypted_secrets where name='kaporal_workspace_job_token' limit 1)),
    body := '{}'::jsonb, timeout_milliseconds := 60000
  );
$job$);
-- Enable only after the deployed worker passes a real source refresh.
select cron.alter_job(jobid,active:=false) from cron.job where jobname='kaporal-decision-workspace-refresh';
