-- Existing rows were checked for case/space duplicates before this migration.
-- Enforce one normalized email even when requests race or bypass the UI.
alter table public.newsletter_subscribers add constraint newsletter_email_normalized check (email=lower(btrim(email)));

create or replace function public.reserve_newsletter_confirmation(email_input text,source_input text,confirm_hash_input text,unsubscribe_hash_input text,resend_input boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare address text:=lower(btrim(email_input)); subscriber public.newsletter_subscribers; stamp timestamptz:=now();
begin
  if address is null or length(address)>254 or address !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Invalid email'; end if;
  if confirm_hash_input is null or unsubscribe_hash_input is null or confirm_hash_input !~ '^[a-f0-9]{64}$' or unsubscribe_hash_input !~ '^[a-f0-9]{64}$' then raise exception 'Invalid token digest'; end if;
  insert into public.newsletter_subscribers(email,status,source) values(address,'pending',left(source_input,80)) on conflict(email) do nothing;
  select * into subscriber from public.newsletter_subscribers where email=address for update;
  if subscriber.status in ('confirmed','active') then return jsonb_build_object('send',false,'status','already_confirmed'); end if;
  if subscriber.status='bounced' then return jsonb_build_object('send',false,'status','delivery_blocked'); end if;
  if subscriber.status='pending' and subscriber.confirm_expires_at>stamp and subscriber.last_confirmation_sent_at is not null and not resend_input then
    return jsonb_build_object('send',false,'status','already_pending','delivery','recently_sent');
  end if;
  if subscriber.last_delivery_attempt_at>stamp-interval '10 minutes' then
    return jsonb_build_object('send',false,'status','pending','delivery','cooldown');
  end if;
  update public.newsletter_subscribers set status='pending',source=left(source_input,80),consent_at=stamp,
    confirm_token_hash=confirm_hash_input,confirm_expires_at=stamp+interval '48 hours',
    unsubscribe_token_hash=unsubscribe_hash_input,last_confirmation_sent_at=null,
    last_delivery_attempt_at=stamp,last_delivery_status='sending',last_delivery_error=null
    where id=subscriber.id;
  return jsonb_build_object('send',true,'status','pending','subscriber_id',subscriber.id);
end $$;
revoke all on function public.reserve_newsletter_confirmation(text,text,text,text,boolean) from public,anon,authenticated;
grant execute on function public.reserve_newsletter_confirmation(text,text,text,text,boolean) to service_role;
comment on function public.reserve_newsletter_confirmation(text,text,text,text,boolean) is 'Atomic recipient reservation. Preserves confirmed/active/bounced state, requires a new email proof for resubscription, rate limits retries per address and keeps one normalized subscriber row. Service only.';
