-- Private model evidence is append-only. Publication gates are unchanged.
-- Existing researcher/editor/admin RLS continues to govern reads.
revoke all on public.signal_model_versions, public.signal_predictions, public.signal_outcomes, public.backtest_runs from anon;
revoke insert, update, delete, truncate, references, trigger on public.signal_model_versions, public.signal_predictions, public.signal_outcomes, public.backtest_runs from authenticated;
grant select on public.signal_model_versions, public.signal_predictions, public.signal_outcomes, public.backtest_runs to authenticated;
grant all on public.signal_model_versions, public.signal_predictions, public.signal_outcomes, public.backtest_runs to service_role;

create unique index btc24_unique_forward_window on public.signal_predictions(model_version_id, (features->>'window_start')) where features->>'protocol'='btc24-v1';

create function private.guard_btc24_evidence() returns trigger
language plpgsql security invoker set search_path='' as $$
declare p public.signal_predictions; m public.signal_model_versions;
  window_start timestamptz; window_end timestamptz; detail jsonb; move numeric;
begin
  if tg_table_name='signal_model_versions' then
    if old.code='K-BTC-24H' then raise exception 'Frozen model versions cannot be rewritten or deleted'; end if;
  elsif tg_table_name='backtest_runs' then
    if exists(select 1 from public.signal_model_versions where id=old.model_version_id and code='K-BTC-24H') then raise exception 'Frozen backtests cannot be rewritten or deleted'; end if;
  elsif tg_table_name='model_runs' then
    if old.module_code in ('btc24-history','btc24-training') then raise exception 'Frozen BTC inputs cannot be rewritten or deleted'; end if;
  elsif tg_table_name='signal_predictions' then
    if tg_op='INSERT' then
      select * into m from public.signal_model_versions where id=new.model_version_id;
      if m.code <> 'K-BTC-24H' then return new; end if;
      if new.features->>'protocol' is distinct from 'btc24-v1' then raise exception 'BTC forecast protocol required'; end if;
      window_start:=(new.features->>'window_start')::timestamptz;
      window_end:=(new.features->>'window_end')::timestamptz;
      if window_start is null or window_end is null or window_end-window_start<>interval '24 hours'
        or window_start<>date_trunc('day',window_start at time zone 'UTC') at time zone 'UTC'
        or new.source_as_of<>window_start-interval '24 hours'
        or window_start<=clock_timestamp()+interval '5 minutes' or new.source_as_of>clock_timestamp()
        or new.horizon_hours<>24 or new.symbol<>'BTC-USD' or new.status<>'open'
        or new.expected_move_pct is not null or new.opportunity_score<>0
        or new.features->>'artifact_hash' is distinct from m.methodology->>'artifact_hash'
        or new.features->>'trade_action' is distinct from 'abstain-unvalidated'
        or new.features->>'snapshot_hash' is null or (new.features->>'snapshot_hash') !~ '^[0-9a-f]{64}$'
        or jsonb_array_length(new.features->'x') is distinct from 8
      then raise exception 'Invalid or retrospective BTC forecast'; end if;
      if not exists(select 1 from public.model_runs r where r.id=(new.features->>'snapshot_id')::uuid and r.module_code='btc24-history' and r.input_snapshot->>'hash'=new.features->>'snapshot_hash') then raise exception 'Pinned source snapshot required'; end if;
      new.created_at:=clock_timestamp(); return new;
    end if;
    if old.features->>'protocol'='btc24-v1' then
      if tg_op='DELETE' then raise exception 'Frozen forecasts cannot be deleted'; end if;
      if (to_jsonb(new)-'status') is distinct from (to_jsonb(old)-'status') or old.status<>'open' or new.status<>'resolved'
        or not exists(select 1 from public.signal_outcomes where prediction_id=old.id)
      then raise exception 'Only a mature recorded outcome can resolve a frozen forecast'; end if;
    end if;
  elsif tg_table_name='signal_outcomes' then
    if tg_op='INSERT' then select * into p from public.signal_predictions where id=new.prediction_id;
    else select * into p from public.signal_predictions where id=old.prediction_id; end if;
    if p.features->>'protocol'='btc24-v1' then
      if tg_op<>'INSERT' then raise exception 'Frozen outcomes cannot be rewritten or deleted'; end if;
      window_start:=(p.features->>'window_start')::timestamptz; window_end:=(p.features->>'window_end')::timestamptz;
      detail:=new.notes::jsonb;
      if clock_timestamp()<window_end or p.status<>'open' or new.resolved_at<>window_end
        or detail->>'provider' is distinct from 'Coinbase Exchange'
        or (detail->'candle'->>0)::numeric is distinct from extract(epoch from window_start)
        or (detail->'candle'->>3)::numeric<=0
        or (detail->'candle'->>4)::numeric is distinct from new.resolution_price
        or not exists(select 1 from public.model_runs r where r.id=(detail->>'snapshot_id')::uuid and r.module_code='btc24-history' and r.input_snapshot->>'hash'=detail->>'snapshot_hash' and r.input_snapshot->'candles' @> jsonb_build_array(detail->'candle'))
      then raise exception 'Outcome needs a mature matching source candle'; end if;
      move:=((detail->'candle'->>4)::numeric/(detail->'candle'->>3)::numeric-1)*100;
      if new.realized_move_pct is null or abs(move-new.realized_move_pct)>0.00000001 or new.hit is distinct from ((p.probability>=0.5)=(move>0)) then raise exception 'Outcome calculation mismatch'; end if;
      new.created_at:=clock_timestamp();
    end if;
  end if;
  if tg_op='DELETE' then return old; end if; return new;
end $$;
revoke all on function private.guard_btc24_evidence() from public, anon, authenticated;
create trigger freeze_btc24_models before update or delete on public.signal_model_versions for each row execute function private.guard_btc24_evidence();
create trigger freeze_btc24_backtests before update or delete on public.backtest_runs for each row execute function private.guard_btc24_evidence();
create trigger freeze_btc24_inputs before update or delete on public.model_runs for each row execute function private.guard_btc24_evidence();
create trigger freeze_btc24_predictions before insert or update or delete on public.signal_predictions for each row execute function private.guard_btc24_evidence();
create trigger freeze_btc24_outcomes before insert or update or delete on public.signal_outcomes for each row execute function private.guard_btc24_evidence();

-- One transaction prevents a partial model without its evaluation evidence.
create function public.store_btc24_training(model_json jsonb, backtest_json jsonb) returns uuid
language plpgsql security invoker set search_path='' as $$
declare model_id uuid;
begin
  if model_json->>'code' is distinct from 'K-BTC-24H' or model_json->>'status' is distinct from 'experimental' then raise exception 'Private experimental BTC model required'; end if;
  insert into public.signal_model_versions(code,version,asset_class,status,methodology,feature_weights,notes)
  values(model_json->>'code',model_json->>'version','crypto','experimental',model_json->'methodology',model_json->'feature_weights',model_json->>'notes') returning id into model_id;
  insert into public.backtest_runs(model_version_id,universe,period_start,period_end,train_end,observations,hit_rate,precision_score,brier_score,avg_return_pct,max_drawdown_pct,assumptions,results)
  values(model_id,backtest_json->>'universe',(backtest_json->>'period_start')::date,(backtest_json->>'period_end')::date,(backtest_json->>'train_end')::date,
    (backtest_json->>'observations')::integer,(backtest_json->>'hit_rate')::numeric,(backtest_json->>'precision_score')::numeric,(backtest_json->>'brier_score')::numeric,
    (backtest_json->>'avg_return_pct')::numeric,(backtest_json->>'max_drawdown_pct')::numeric,backtest_json->'assumptions',backtest_json->'results');
  return model_id;
end $$;
revoke all on function public.store_btc24_training(jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.store_btc24_training(jsonb,jsonb) to service_role;
