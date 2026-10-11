-- Apply after a real authorized refresh succeeds. Reuse the existing private token.
select cron.schedule('kaporal-public-price-history','45 2 * * *',$job$
select net.http_post(
  url := (select decrypted_secret from vault.decrypted_secrets where name='kaporal_project_url' limit 1)||'/functions/v1/price-history-refresh',
  headers := jsonb_build_object('Content-Type','application/json','x-kaporal-job-token',(select decrypted_secret from vault.decrypted_secrets where name='kaporal_workspace_job_token' limit 1)),
  body := '{}'::jsonb,
  timeout_milliseconds := 120000
);
$job$);
