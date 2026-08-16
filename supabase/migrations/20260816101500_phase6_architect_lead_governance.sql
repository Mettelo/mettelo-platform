-- Phase 6 — Project Architect, Project Lead & Governance

create table if not exists public.project_architect_reviews (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.project_architect_applications(id) on delete cascade,
  reviewer_user_id uuid not null references auth.users(id) on delete restrict,
  rubric jsonb not null default '{}'::jsonb,
  private_notes text,
  decision_action text not null,
  decision_reason text,
  created_at timestamptz not null default now(),
  constraint project_architect_reviews_action_check check (
    decision_action = any (array['under_review'::text,'additional_evidence_required'::text,'approved'::text,'declined'::text,'suspended'::text])
  )
);

create index if not exists project_architect_reviews_application_time_idx
  on public.project_architect_reviews(application_id,created_at desc);

alter table public.project_architect_reviews enable row level security;

-- Review notes and rubric are intentionally Admin-only. Members continue to see
-- the public-facing decision reason through project_architect_application_history.
drop policy if exists "admins read architect reviews" on public.project_architect_reviews;
create policy "admins read architect reviews"
on public.project_architect_reviews for select to authenticated
using ((select auth.jwt()->'app_metadata'->>'role')='admin');

revoke all on public.project_architect_reviews from anon,authenticated;
grant select on public.project_architect_reviews to authenticated;
grant all on public.project_architect_reviews to service_role;
