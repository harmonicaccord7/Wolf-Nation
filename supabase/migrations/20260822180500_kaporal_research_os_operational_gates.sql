-- KAPORAL v0.5: scheduled Signal Scout + editor review updates.
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='review_tasks' and policyname='editor_update_reviews') then
    create policy editor_update_reviews on public.review_tasks for update
      using (exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('editor','admin')))
      with check (exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('editor','admin')));
  end if;
end $$;

create unique index if not exists story_candidates_signal_fingerprint_idx on public.story_candidates ((raw_context->>'fingerprint')) where detected_by='signal_scout' and raw_context ? 'fingerprint';

create or replace function public.run_signal_scout() returns integer language plpgsql security definer set search_path=public as $$
declare r record; delta_abs numeric; delta_pct numeric; threshold_hit boolean; fp text; inserted_count integer := 0;
begin
  for r in
    select s.id,s.code,s.label,s.unit,s.region,s.desk_slug,l.observed_at latest_at,l.value latest_value,p.observed_at previous_at,p.value previous_value
    from public.data_series s
    join lateral (select observed_at,value from public.data_points d where d.series_id=s.id and d.value is not null order by observed_at desc limit 1) l on true
    join lateral (select observed_at,value from public.data_points d where d.series_id=s.id and d.value is not null and d.observed_at<l.observed_at order by observed_at desc limit 1) p on true
    where s.is_public=true
  loop
    delta_abs:=r.latest_value-r.previous_value;
    delta_pct:=case when r.previous_value=0 then null else (delta_abs/abs(r.previous_value))*100 end;
    threshold_hit:=case when r.unit='%' then abs(delta_abs)>=0.25 when r.unit='ratio' then abs(delta_abs)>=0.15 when r.unit ilike '%contracts%' then coalesce(abs(delta_pct),0)>=10 else coalesce(abs(delta_pct),0)>=2.5 end;
    if threshold_hit then
      fp:=md5(r.code||'|'||r.latest_at::text||'|'||r.previous_at::text);
      begin
        insert into public.story_candidates(title,thesis_seed,detected_at,detected_by,status,story_type,horizon,primary_region,primary_sector,raw_context)
        values(r.label||' moved materially — investigate consequences','Automated signal only. Verify the underlying data, identify the mechanism, test alternative explanations, and determine whether the move is decision-relevant.',now(),'signal_scout','idea','scenario_watch','now-to-medium',coalesce(r.region,'Global'),coalesce(r.desk_slug,'cross-asset'),jsonb_build_object('fingerprint',fp,'series_code',r.code,'latest_value',r.latest_value,'previous_value',r.previous_value,'latest_at',r.latest_at,'previous_at',r.previous_at,'delta_abs',delta_abs,'delta_pct',delta_pct,'unit',r.unit,'source','data_series'));
        inserted_count:=inserted_count+1;
      exception when unique_violation then null;
      end;
    end if;
  end loop;
  return inserted_count;
end $$;

revoke all on function public.run_signal_scout() from public,anon,authenticated;
grant execute on function public.run_signal_scout() to service_role;

do $$ begin
 if not exists(select 1 from cron.job where jobname='kaporal-signal-scout') then
  perform cron.schedule('kaporal-signal-scout','17 * * * *','select public.run_signal_scout();');
 end if;
end $$;
