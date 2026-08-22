do $$
declare existing_job bigint;
begin
  select jobid into existing_job from cron.job where jobname='kaporal-history-backfill' limit 1;
  if existing_job is not null then perform cron.unschedule(existing_job); end if;
end $$;

select cron.schedule(
  'kaporal-history-backfill',
  '35 2 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name='kaporal_project_url' order by created_at desc limit 1) || '/functions/v1/history-backfill',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'apikey',(select decrypted_secret from vault.decrypted_secrets where name='kaporal_publishable_key' order by created_at desc limit 1)
    ),
    body := '{"force":false,"trigger":"cron"}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);
