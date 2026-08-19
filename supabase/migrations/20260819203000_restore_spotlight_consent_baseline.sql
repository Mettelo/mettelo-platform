-- Restore the Phase 5 Spotlight consent columns and public-read boundary when a
-- hosted database predates the already-versioned Phase 5 migration. Existing
-- rows are never granted consent implicitly.

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

drop policy if exists "published spotlights readable" on public.spotlights;
create policy "published spotlights readable"
on public.spotlights for select
using (
  (status='published' and coalesce(is_excluded,false)=false and consent_status='granted')
  or user_id=(select auth.uid())
  or (select auth.jwt()->'app_metadata'->>'role')='admin'
);
