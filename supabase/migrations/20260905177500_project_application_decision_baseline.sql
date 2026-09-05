-- Reconcile hosted project-application decision metadata with reproducible schema history.
-- These nullable fields already exist in Mettelo Production and are used by the
-- governed review lifecycle. This migration makes clean reconstruction match hosted
-- Supabase without mutating existing values.

alter table public.project_applications
  add column if not exists decision_at timestamptz,
  add column if not exists decision_reason text;

comment on column public.project_applications.decision_at is
  'Timestamp of the latest terminal review decision such as Offer or Decline. Review progress states may leave this null.';

comment on column public.project_applications.decision_reason is
  'Reviewer decision note captured for terminal review decisions. This is review metadata and does not create membership.';
