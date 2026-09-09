create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (char_length(email) between 5 and 254),
  subject text not null default 'Website enquiry' check (char_length(subject) between 2 and 160),
  message text not null check (char_length(message) between 10 and 5000),
  status text not null default 'new' check (status in ('new','reviewing','resolved','spam')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists contact_messages_created_at_idx on public.contact_messages(created_at desc);
create index if not exists contact_messages_status_idx on public.contact_messages(status,created_at desc);
alter table public.contact_messages enable row level security;
drop policy if exists "Staff read contact messages" on public.contact_messages;
create policy "Staff read contact messages" on public.contact_messages for select to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('editor','admin')));
drop policy if exists "Staff update contact messages" on public.contact_messages;
create policy "Staff update contact messages" on public.contact_messages for update to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('editor','admin'))) with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('editor','admin')));
