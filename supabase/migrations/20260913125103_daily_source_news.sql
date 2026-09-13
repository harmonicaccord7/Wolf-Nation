-- Public source headlines are separate from private research and reviewed articles.
create table public.news_feeds (
  slug text primary key,
  name text not null,
  source_url text not null check (source_url ~ '^https://'),
  category text not null check (category in ('finance','business','energy','geopolitics')),
  last_checked_at timestamptz,
  last_success_at timestamptz,
  latest_published_at timestamptz,
  status text not null default 'pending' check (status in ('pending','healthy','error'))
);
create table public.daily_news (
  id uuid primary key default gen_random_uuid(),
  feed_slug text not null references public.news_feeds(slug),
  title text not null check (length(title) between 1 and 400),
  url text not null unique check (url ~ '^https://' and length(url)<=2048),
  category text not null check (category in ('finance','business','energy','geopolitics')),
  published_at timestamptz not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index daily_news_publication on public.daily_news(published_at desc);
create index daily_news_feed on public.daily_news(feed_slug, published_at desc);
alter table public.news_feeds enable row level security;
alter table public.daily_news enable row level security;
revoke all on public.news_feeds,public.daily_news from anon,authenticated;
grant select on public.news_feeds,public.daily_news to anon,authenticated;
grant all on public.news_feeds,public.daily_news to service_role;
create policy public_read_news_feeds on public.news_feeds for select to anon,authenticated using (true);
create policy public_read_dated_news on public.daily_news for select to anon,authenticated using (published_at<=now());
comment on table public.daily_news is 'Publisher-provided headline, date and link only. Financial conclusions remain in reviewed articles/newsletter issues. Service-only ingestion; no subscriber or private research data.';
insert into public.news_feeds(slug,name,source_url,category) values
('ecb','European Central Bank','https://www.ecb.europa.eu/rss/press.html','finance'),
('wto','WTO news','https://www.wto.org/library/rss/latest_news_e.xml','business'),
('eia','U.S. Energy Information Administration','https://www.eia.gov/rss/todayinenergy.xml','energy'),
('un-geneva','UN Geneva','https://www.ungeneva.org/news-media/press-items-list/rss.xml','geopolitics');
