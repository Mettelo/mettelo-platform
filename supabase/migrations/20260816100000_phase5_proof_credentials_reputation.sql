-- Phase 5 — Proof, Credentials & Reputation

-- Proof visibility is intentionally separate from verification. A verified record can
-- remain private, be visible only to signed-in Mettelo members, or be made public.
alter table public.contributions
  add column if not exists visibility text,
  add column if not exists visibility_reviewed_at timestamptz;

update public.contributions
set visibility = case when is_public then 'public' else 'private' end
where visibility is null;

alter table public.contributions alter column visibility set default 'private';
alter table public.contributions alter column visibility set not null;
alter table public.contributions drop constraint if exists contributions_visibility_check;
alter table public.contributions add constraint contributions_visibility_check
  check (visibility = any (array['public'::text,'mettelo_only'::text,'private'::text]));

create index if not exists contributions_visibility_verified_idx
  on public.contributions(visibility,verification_status,verified_at desc);

-- Keep the legacy boolean in sync while old surfaces are migrated. New Phase 5
-- code treats visibility as canonical.
create or replace function public.sync_contribution_visibility()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.visibility is distinct from old.visibility then
    new.is_public := new.visibility = 'public';
  elsif new.is_public is distinct from old.is_public then
    new.visibility := case when new.is_public then 'public' else 'private' end;
  end if;
  return new;
end;
$$;

drop trigger if exists contribution_visibility_sync on public.contributions;
create trigger contribution_visibility_sync
before update of visibility,is_public on public.contributions
for each row execute function public.sync_contribution_visibility();

-- Public access is only for explicitly public, verified Proof.
drop policy if exists "public verified contributions readable" on public.contributions;
create policy "public verified contributions readable"
on public.contributions for select
using (
  (verification_status='verified' and visibility='public')
  or user_id=(select auth.uid())
  or (select auth.jwt()->'app_metadata'->>'role')='admin'
);

-- Mettelo-only Proof is visible to authenticated members, but never anonymous
-- visitors. This policy intentionally does not expose pending/rejected work.
drop policy if exists "authenticated members read mettelo proof" on public.contributions;
create policy "authenticated members read mettelo proof"
on public.contributions for select to authenticated
using (verification_status='verified' and visibility='mettelo_only');

-- Spotlight candidates must explicitly grant publication consent before an Admin
-- can publish their recognition.
alter table public.spotlights
  add column if not exists consent_status text not null default 'not_requested',
  add column if not exists consent_requested_at timestamptz,
  add column if not exists consented_at timestamptz,
  add column if not exists consent_withdrawn_at timestamptz,
  add column if not exists selected_at timestamptz;

alter table public.spotlights drop constraint if exists spotlights_consent_status_check;
alter table public.spotlights add constraint spotlights_consent_status_check
  check (consent_status = any (array['not_requested'::text,'pending'::text,'granted'::text,'declined'::text,'withdrawn'::text]));

create index if not exists spotlights_consent_status_idx
  on public.spotlights(consent_status,status,award_month desc);

-- A public Spotlight must have current, explicit consent.
drop policy if exists "published spotlights readable" on public.spotlights;
create policy "published spotlights readable"
on public.spotlights for select
using (
  (status='published' and coalesce(is_excluded,false)=false and consent_status='granted')
  or user_id=(select auth.uid())
  or (select auth.jwt()->'app_metadata'->>'role')='admin'
);
