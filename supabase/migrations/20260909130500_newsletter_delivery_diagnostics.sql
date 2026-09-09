alter table public.newsletter_subscribers add column if not exists last_delivery_status text;
alter table public.newsletter_subscribers add column if not exists last_delivery_error text;
alter table public.newsletter_subscribers add column if not exists last_delivery_attempt_at timestamptz;

comment on column public.newsletter_subscribers.last_delivery_status is 'Last newsletter confirmation delivery result, e.g. sent, provider_not_configured, email_http_403.';
comment on column public.newsletter_subscribers.last_delivery_error is 'Sanitized provider error detail for operational diagnostics. Never store API keys or authorization headers.';
comment on column public.newsletter_subscribers.last_delivery_attempt_at is 'Timestamp of the last confirmation email delivery attempt.';
