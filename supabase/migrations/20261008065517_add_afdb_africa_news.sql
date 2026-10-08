-- Add one official publisher. Preserve public-read RLS and service-only writes.
-- Registration alone never marks a feed healthy or invents publication dates.
insert into public.news_feeds(slug,name,source_url,category)
values('afdb-africa','African Development Bank','https://www.afdb.org/en/news-and-events','africa')
on conflict(slug) do update set name=excluded.name,source_url=excluded.source_url,category=excluded.category;
