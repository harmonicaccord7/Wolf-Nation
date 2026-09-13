-- Private fixed-version inference/outcome tracking, not autonomous research or publication.
-- 00:20 UTC daily, with a second attempt at 01:20. Unique forecast windows prevent duplicates.
select cron.schedule('kaporal-btc24-forward-ledger','20 0,1 * * *',$job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name='kaporal_project_url' limit 1) || '/functions/v1/btc-24h-research',
    headers := jsonb_build_object('Content-Type','application/json','x-kaporal-job-token',(select decrypted_secret from vault.decrypted_secrets where name='kaporal_workspace_job_token' limit 1)),
    body := '{"action":"daily"}'::jsonb, timeout_milliseconds := 60000
  );
$job$);
-- Enable after verifying the worker's real daily call and retry idempotency.
select cron.alter_job(jobid,active:=false) from cron.job where jobname='kaporal-btc24-forward-ledger';
