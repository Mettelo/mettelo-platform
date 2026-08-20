-- Admin Website Phase 3: typed public page content management.
-- Draft rows remain service-role only. Public readers can only read published payloads.

create table if not exists public.website_page_public (
  page_key text primary key check (page_key in ('home','about','contact')),
  payload jsonb not null check (jsonb_typeof(payload)='object'),
  published_at timestamptz not null default now(),
  published_by uuid references auth.users(id) on delete set null
);

create table if not exists public.website_page_drafts (
  page_key text primary key check (page_key in ('home','about','contact')),
  payload jsonb not null check (jsonb_typeof(payload)='object'),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.website_page_public enable row level security;
alter table public.website_page_drafts enable row level security;

drop policy if exists "public website pages readable" on public.website_page_public;
create policy "public website pages readable" on public.website_page_public
for select to anon, authenticated using (true);

revoke all on public.website_page_drafts from anon, authenticated;
revoke insert, update, delete, truncate, references, trigger on public.website_page_public from anon, authenticated;
grant select on public.website_page_public to anon, authenticated;

grant select, insert, update on public.website_page_public to service_role;
grant select, insert, update on public.website_page_drafts to service_role;
revoke delete, truncate, references, trigger on public.website_page_public from service_role;
revoke delete, truncate, references, trigger on public.website_page_drafts from service_role;
