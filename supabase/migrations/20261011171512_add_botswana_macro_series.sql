-- Reuse the existing public World Bank indicators and ingestion jobs.
-- RLS, grants, credentials and editorial tables are unchanged.
insert into public.data_series(code,label,desk_slug,provider_id,provider_series_code,category,region,country_code,unit,frequency,source_url,description,is_public,sort_order,metadata)
select 'BWA'||substring(code from 4),replace(label,'Nigeria','Botswana'),desk_slug,provider_id,provider_series_code,category,region,'BWA',unit,frequency,
  replace(source_url,'/NGA/','/BWA/'),replace(coalesce(description,''),'Nigeria','Botswana'),true,coalesce(sort_order,0)+40,
  coalesce(metadata,'{}'::jsonb)||jsonb_build_object('country_code','BWA','currency','BWP')
from public.data_series
where code in ('NGA_GDP_GROWTH','NGA_INFLATION','NGA_FX_USD','NGA_RESERVES') and is_public=true
on conflict(code) do nothing;
