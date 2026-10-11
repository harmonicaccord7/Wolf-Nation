-- Public market observations only; research snapshots, fits and forecasts stay private.
-- Existing data_series/data_points RLS and grants are unchanged.
insert into public.data_series(code,label,desk_slug,category,region,unit,frequency,source_url,description,is_public,sort_order,metadata)
select symbol||'_DAILY',symbol||' daily close','crypto','crypto','Global','USD','daily',
  'https://api.exchange.coinbase.com/products/'||symbol||'-USD/candles',
  'Completed Coinbase Exchange daily closes in USD. Timestamps mark the end of the UTC trading day; available history starts at the exchange listing, not necessarily the asset launch. Separate from current CoinGecko quotes.',
  true,200+ordinal,jsonb_build_object('product',symbol||'-USD','observation_kind','daily_close','source_docs','https://docs.cdp.coinbase.com/api-reference/exchange-api/rest-api/products/get-product-candles')
from (values ('BTC',1),('ETH',2),('SOL',3)) as assets(symbol,ordinal)
on conflict(code) do nothing;
