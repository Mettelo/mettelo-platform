-- Phase 17 privacy/concurrency hardening.
-- Safeguarding sensitivity survives later lifecycle status changes so ordinary
-- project-support handlers cannot regain access simply because a case resolves.

alter table public.project_support_cases
  add column if not exists safeguarding_escalated_at timestamptz;

create index if not exists project_support_cases_safeguarding_queue_idx
  on public.project_support_cases(safeguarding_escalated_at,status,updated_at desc)
  where safeguarding_escalated_at is not null;

-- Re-assert reporter column privileges after adding the safeguarding marker.
-- The marker and all Admin-only columns remain unavailable to authenticated clients.
revoke select on public.project_support_cases from authenticated;
grant select (
  id,project_id,project_run_id,reporter_user_id,category,description,status,
  resolution,recovery_plan,created_at,updated_at,resolved_at,closed_at
) on public.project_support_cases to authenticated;

comment on column public.project_support_cases.safeguarding_escalated_at is
  'Permanent sensitivity marker. Server support routes require explicit safeguarding capability whenever set.';
