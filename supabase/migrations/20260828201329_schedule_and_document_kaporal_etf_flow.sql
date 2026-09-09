do $$
begin
  if exists (select 1 from cron.job where jobname='kaporal-etf-flow-estimator') then
    perform cron.unschedule('kaporal-etf-flow-estimator');
  end if;
end $$;

select cron.schedule(
  'kaporal-etf-flow-estimator',
  '40 12,20 * * 1-5',
  $cron$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name='kaporal_project_url' order by created_at desc limit 1) || '/functions/v1/etf-flow-estimator',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'apikey',(select decrypted_secret from vault.decrypted_secrets where name='kaporal_publishable_key' order by created_at desc limit 1)
    ),
    body := '{"trigger":"cron"}'::jsonb,
    timeout_milliseconds := 60000
  );
  $cron$
);

update public.site_pages
set body = case
  when body @> '[{"text":"KAPORAL ETF Flow methodology","type":"heading"}]'::jsonb then body
  else body || jsonb_build_array(
    jsonb_build_object('type','heading','text','KAPORAL ETF Flow methodology'),
    jsonb_build_object('type','paragraph','text','KAPORAL Estimated U.S. Spot Bitcoin ETF Daily Net Flow is derived from free primary issuer data rather than a paid ETF-flow API. For each covered fund, KAPORAL records the issuer-published shares outstanding, NAV or fund assets, observation date and source URL. The estimated cash flow is calculated as the change in shares outstanding multiplied by the prior stored NAV. Because newly created or redeemed ETF shares are typically reflected in the next published share count, the resulting change is attributed to the prior business-day flow date. The public metric is explicitly labelled as an estimate and reports the funds and covered AUM included. Missing or blocked issuer data stays missing; it is never filled with a fabricated value. Farside may be used manually as an independent QA benchmark, but KAPORAL does not ingest or republish Farside data.'),
    jsonb_build_object('type','paragraph','text','The initial zero-cost production coverage is BlackRock IBIT, Bitwise BITB and ARK/21Shares ARKB. Additional U.S. spot Bitcoin funds are added only when a stable, free primary issuer source passes automated validation. The engine currently runs twice on U.S. weekdays so late issuer updates can be incorporated without aggressive scraping.')
  )
end,
updated_at=now()
where slug='methodology';
