-- Mettelo launch-readiness schema
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  location text,
  professional_area text,
  primary_goal text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  form_type text not null check (form_type in ('contact','partnership','project_application','contributor','feedback')),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'new' check (status in ('new','in_review','closed')),
  created_at timestamptz not null default now()
);

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  status text not null default 'active' check (status in ('active','unsubscribed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.form_submissions enable row level security;
alter table public.newsletter_subscribers enable row level security;

create policy "profiles readable by owner" on public.profiles for select using (auth.uid() = id);
create policy "profiles insertable by owner" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles updatable by owner" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- form_submissions and newsletter_subscribers are written through server-side API routes using service role.
-- No anonymous/client select policies are intentionally granted.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
