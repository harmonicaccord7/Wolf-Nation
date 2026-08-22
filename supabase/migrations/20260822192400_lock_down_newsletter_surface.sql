revoke all on table public.newsletter_subscribers from anon, authenticated;
revoke all on function public.request_newsletter_subscription(text,text,text,text,timestamptz) from public, anon, authenticated;
revoke all on function public.confirm_newsletter_subscription(text) from public, anon, authenticated;
revoke all on function public.unsubscribe_newsletter(text) from public, anon, authenticated;
