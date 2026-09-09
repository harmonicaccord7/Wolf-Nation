create table if not exists public.signal_model_versions (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  version text not null,
  asset_class text not null check (asset_class in ('crypto','stocks','options','cross_asset')),
  status text not null default 'experimental' check (status in ('experimental','backtesting','validated','retired')),
  methodology jsonb not null default '{}'::jsonb,
  feature_weights jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  unique(code,version,asset_class)
);
create table if not exists public.signal_predictions (
  id uuid primary key default gen_random_uuid(),
  model_version_id uuid not null references public.signal_model_versions(id) on delete restrict,
  symbol text not null,
  asset_class text not null,
  direction text not null check (direction in ('bullish','bearish','neutral')),
  horizon_hours integer not null check (horizon_hours between 1 and 43800),
  probability numeric not null check (probability between 0 and 1),
  opportunity_score numeric not null check (opportunity_score between 0 and 100),
  expected_move_pct numeric,
  invalidation_text text not null,
  features jsonb not null default '{}'::jsonb,
  source_as_of timestamptz not null,
  status text not null default 'open' check (status in ('open','resolved','invalidated','expired')),
  created_at timestamptz not null default now()
);
create table if not exists public.signal_outcomes (
  id uuid primary key default gen_random_uuid(),
  prediction_id uuid not null unique references public.signal_predictions(id) on delete cascade,
  realized_move_pct numeric,
  hit boolean,
  resolution_price numeric,
  resolved_at timestamptz not null,
  notes text,
  created_at timestamptz not null default now()
);
create table if not exists public.backtest_runs (
  id uuid primary key default gen_random_uuid(),
  model_version_id uuid not null references public.signal_model_versions(id) on delete restrict,
  universe text not null,
  period_start date not null,
  period_end date not null,
  train_end date,
  observations integer not null default 0,
  hit_rate numeric,
  precision_score numeric,
  brier_score numeric,
  avg_return_pct numeric,
  max_drawdown_pct numeric,
  assumptions jsonb not null default '{}'::jsonb,
  results jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists signal_predictions_symbol_time_idx on public.signal_predictions(symbol,source_as_of desc);
create index if not exists signal_predictions_score_idx on public.signal_predictions(opportunity_score desc,source_as_of desc);
create index if not exists backtest_runs_model_idx on public.backtest_runs(model_version_id,period_end desc);
alter table public.signal_model_versions enable row level security;
alter table public.signal_predictions enable row level security;
alter table public.signal_outcomes enable row level security;
alter table public.backtest_runs enable row level security;
do $$ declare t text; begin
  foreach t in array array['signal_model_versions','signal_predictions','signal_outcomes','backtest_runs'] loop
    execute format('drop policy if exists "Research staff manage %s" on public.%I',t,t);
    execute format('create policy "Research staff manage %s" on public.%I for all to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in (''researcher'',''editor'',''admin''))) with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in (''researcher'',''editor'',''admin'')))',t,t);
  end loop;
end $$;
insert into public.signal_model_versions(code,version,asset_class,status,methodology,feature_weights,notes)
values('K-EDGE','0.1','cross_asset','experimental',jsonb_build_object('purpose','rank short-horizon research opportunities probabilistically; never guarantee profit','validation','walk-forward out-of-sample with transaction costs, slippage and no look-ahead','outputs',jsonb_build_array('direction','probability','opportunity_score','horizon','invalidation')),jsonb_build_object('signal_strength',20,'options_positioning',20,'liquidity_flow',15,'trend_momentum',15,'volatility_edge',10,'macro_regime',10,'catalyst',5,'risk_invalidation',5),'Private research model foundation. Keep experimental until backtests and forward prediction ledger establish calibration.') on conflict(code,version,asset_class) do nothing;
