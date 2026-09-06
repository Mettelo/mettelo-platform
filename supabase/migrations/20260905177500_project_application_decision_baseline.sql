-- Reconcile hosted project-application decision metadata with reproducible schema history.
-- These nullable fields already exist in Mettelo Production and are used by the
-- governed application/admission lifecycle. This migration makes clean reconstruction
-- match hosted Supabase without mutating existing values.

alter table public.project_applications
  add column if not exists decision_at timestamptz,
  add column if not exists decision_reason text,
  add column if not exists approved_at timestamptz;

comment on column public.project_applications.decision_at is
  'Timestamp of the latest terminal review decision such as Offer or Decline. Review progress states may leave this null.';

comment on column public.project_applications.decision_reason is
  'Reviewer decision note captured for terminal review decisions. This is review metadata and does not create membership.';

comment on column public.project_applications.approved_at is
  'Legacy/canonical approval timestamp retained for compatibility with existing AUTO-admission history. Phase 7 human review uses OFFERED as selection and does not treat this field as membership.';
