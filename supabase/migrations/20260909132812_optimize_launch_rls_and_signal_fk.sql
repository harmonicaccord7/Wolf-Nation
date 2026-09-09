create index if not exists signal_predictions_model_version_idx on public.signal_predictions(model_version_id);

drop policy if exists "Staff read contact messages" on public.contact_messages;
create policy "Staff read contact messages" on public.contact_messages for select to authenticated using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('editor','admin')));

drop policy if exists "Staff update contact messages" on public.contact_messages;
create policy "Staff update contact messages" on public.contact_messages for update to authenticated using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('editor','admin'))) with check (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('editor','admin')));

do $$ declare t text; begin
  foreach t in array array['signal_model_versions','signal_predictions','signal_outcomes','backtest_runs'] loop
    execute format('drop policy if exists "Research staff manage %s" on public.%I',t,t);
    execute format('create policy "Research staff manage %s" on public.%I for all to authenticated using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in (''researcher'',''editor'',''admin''))) with check (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in (''researcher'',''editor'',''admin'')))',t,t);
  end loop;
end $$;
