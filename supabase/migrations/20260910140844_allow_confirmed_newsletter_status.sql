-- The deployed double-opt-in function writes confirmed. Preserve legacy states.
set lock_timeout = '5s';
alter table public.newsletter_subscribers
  drop constraint newsletter_subscribers_status_check;
alter table public.newsletter_subscribers
  add constraint newsletter_subscribers_status_check
  check (status in ('pending', 'active', 'confirmed', 'unsubscribed', 'bounced'));
