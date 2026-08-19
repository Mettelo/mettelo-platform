-- Spotlight v2: automatic recognition, evidence provenance, exception governance and safe publication.
-- Recognition is durable; public publication remains independently consented and revocable.

alter table public.spotlights
  add column if not exists primary_project_id uuid references public.projects(id) on delete set null,
  add column if not exists publication_held boolean not null default false,
  add column if not exists hold_reason text,
  add column if not exists suppress_public_project boolean not null default false,
  add column if not exists suppress_public_evidence boolean not null default false;

create unique index if not exists spotlights_month_category_unique
  on public.spotlights(award_month,category)
  where award_month is not null and status <> 'archived';

create index if not exists spotlights_public_projection_idx
  on public.spotlights(status,consent_status,publication_held,is_excluded,award_month desc);

create table if not exists public.spotlight_evidence (
  id uuid primary key default gen_random_uuid(),
  spotlight_id uuid not null references public.spotlights(id) on delete cascade,
  contribution_id uuid not null references public.contributions(id) on delete restrict,
  project_id uuid references public.projects(id) on delete set null,
  source_label text not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique(spotlight_id,contribution_id)
);

create unique index if not exists spotlight_evidence_one_primary_idx
  on public.spotlight_evidence(spotlight_id)
  where is_primary;
create index if not exists spotlight_evidence_spotlight_idx
  on public.spotlight_evidence(spotlight_id,created_at);
create index if not exists spotlight_evidence_contribution_idx
  on public.spotlight_evidence(contribution_id);

create table if not exists public.spotlight_events (
  id uuid primary key default gen_random_uuid(),
  spotlight_id uuid not null references public.spotlights(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in (
    'selected','consent_requested','consent_granted','consent_declined','consent_withdrawn',
    'published','held','unheld','excluded','replacement_selected',
    'public_project_suppressed','public_project_restored',
    'public_evidence_suppressed','public_evidence_restored'
  )),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists spotlight_events_spotlight_created_idx
  on public.spotlight_events(spotlight_id,created_at desc);

alter table public.spotlight_evidence enable row level security;
alter table public.spotlight_events enable row level security;

drop policy if exists "owners and admins read spotlight evidence" on public.spotlight_evidence;
create policy "owners and admins read spotlight evidence"
on public.spotlight_evidence for select to authenticated
using (
  exists(
    select 1 from public.spotlights s
    where s.id=spotlight_id
      and (s.user_id=(select auth.uid()) or (select auth.jwt()->'app_metadata'->>'role')='admin')
  )
);

drop policy if exists "owners and admins read spotlight events" on public.spotlight_events;
create policy "owners and admins read spotlight events"
on public.spotlight_events for select to authenticated
using (
  exists(
    select 1 from public.spotlights s
    where s.id=spotlight_id
      and (s.user_id=(select auth.uid()) or (select auth.jwt()->'app_metadata'->>'role')='admin')
  )
);

grant select on public.spotlight_evidence,public.spotlight_events to authenticated;

-- Anonymous/public reads must never bypass consent, hold or exclusion state.
drop policy if exists "published spotlights readable" on public.spotlights;
drop policy if exists "published spotlights readable anon" on public.spotlights;
drop policy if exists "spotlights readable authenticated" on public.spotlights;
create policy "published spotlights readable"
on public.spotlights for select
using (
  (
    status='published'
    and coalesce(is_excluded,false)=false
    and consent_status='granted'
    and coalesce(publication_held,false)=false
  )
  or user_id=(select auth.uid())
  or (select auth.jwt()->'app_metadata'->>'role')='admin'
);
