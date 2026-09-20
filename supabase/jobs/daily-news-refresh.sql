-- Apply after the deployed worker passes a real ingestion. Credentials stay in Vault.
select cron.schedule('kaporal-daily-news-refresh','5 * * * *',$job$
select net.http_post(
  url := (select decrypted_secret from vault.decrypted_secrets where name='kaporal_project_url' limit 1)||'/functions/v1/daily-news-refresh',
  headers := jsonb_build_object('Content-Type','application/json','x-kaporal-job-token',(select decrypted_secret from vault.decrypted_secrets where name='kaporal_workspace_job_token' limit 1)),
  body := '{}'::jsonb,
  timeout_milliseconds := 60000
);
$job$);
