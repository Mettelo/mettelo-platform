-- Phase 7 security hardening: public/member project-run reads may expose safe
-- formation/start status, but never Admin operational reasons, actor IDs or raw
-- start-failure diagnostics. RLS continues to govern which rows are visible.
-- Column privileges govern which fields are readable from those visible rows.

revoke select on table public.project_runs from anon, authenticated;

grant select (
  id,
  project_id,
  run_number,
  status,
  team_size_threshold,
  kickoff_at,
  completed_at,
  created_at,
  updated_at,
  required_team_size,
  has_started,
  started_at,
  scheduled_start_at,
  start_scheduled_at,
  start_ready_at,
  auto_start_paused_at,
  auto_start_blocked_at,
  recruitment_open,
  recruitment_closed_at
) on table public.project_runs to anon, authenticated;

-- Server-side operational services and Admin server routes retain full visibility.
grant select on table public.project_runs to service_role;

comment on column public.project_runs.auto_start_failure is
  'Private operational diagnostic. Do not grant direct browser SELECT access.';
comment on column public.project_runs.auto_start_pause_reason is
  'Private Admin operational reason. Do not grant direct browser SELECT access.';
comment on column public.project_runs.auto_start_paused_by_user_id is
  'Private Admin actor reference. Do not grant direct browser SELECT access.';
comment on column public.project_runs.auto_start_block_reason is
  'Private Admin operational reason. Do not grant direct browser SELECT access.';
comment on column public.project_runs.auto_start_blocked_by_user_id is
  'Private Admin actor reference. Do not grant direct browser SELECT access.';
