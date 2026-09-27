alter table public.news_feeds drop constraint if exists news_feeds_category_check;
alter table public.news_feeds add constraint news_feeds_category_check
  check (category in ('finance','business','energy','geopolitics','africa'));

alter table public.daily_news drop constraint if exists daily_news_category_check;
alter table public.daily_news add constraint daily_news_category_check
  check (category in ('finance','business','energy','geopolitics','africa'));

insert into public.news_feeds(slug,name,source_url,category)
values(
  'world-bank-africa',
  'World Bank — Sub-Saharan Africa',
  'https://www.worldbank.org/ext/en/region/afr',
  'africa'
)
on conflict(slug) do update set
  name=excluded.name,
  source_url=excluded.source_url,
  category=excluded.category;
