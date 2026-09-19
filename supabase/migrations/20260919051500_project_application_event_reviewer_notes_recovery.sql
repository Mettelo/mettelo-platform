-- Production recovery for Admin Project Applications review audit events.
-- The canonical review trigger records reviewer_notes, so the audit table must
-- expose the nullable column before Start Review / Decline transitions execute.

alter table public.project_application_events
  add column if not exists reviewer_notes text;

comment on column public.project_application_events.reviewer_notes is
  'Reviewer notes captured with canonical project application status transitions when available.';
