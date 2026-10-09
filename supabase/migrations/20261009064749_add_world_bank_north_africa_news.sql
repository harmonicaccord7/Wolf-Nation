-- Register the country-scoped publisher search; never invent observed health.
-- The paused AfDB source and its failed run history remain available for audit.
-- Existing public-read RLS and service-only writes are unchanged.
insert into public.news_feeds(slug,name,source_url,category)
values('world-bank-north-africa','World Bank — North Africa','https://www.worldbank.org/ext/en/region/mena','africa')
on conflict(slug) do update set name=excluded.name,source_url=excluded.source_url,category=excluded.category;
