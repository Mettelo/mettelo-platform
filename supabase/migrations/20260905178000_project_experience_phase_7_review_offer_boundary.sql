-- Project Experience Phase 7: governed Admin review boundary.
-- REVIEW_REQUIRED selection may progress to OFFERED, but must never create project
-- membership until the member explicitly accepts in the Phase 8 offer lifecycle.
-- AUTO remains a separate canonical admission path; once a run is ready, the
-- programme default gives Admin a six-hour oversight window before the existing
-- durable scheduler may auto-start it. Explicit per-project delay overrides remain
-- untouched.

alter table public.projects
  alter column auto_start_delay_minutes set default 360;

comment on column public.projects.auto_start_delay_minutes is
  'Delay after AUTO run readiness is reached before durable auto-start processing. Programme default is 360 minutes (6 hours), providing an Admin oversight window. Explicit per-project configuration remains authoritative.';

alter table public.project_applications
  drop constraint if exists project_applications_status_check;

alter table public.project_applications
  add constraint project_applications_status_check
  check (
    status in (
      'submitted',
      'in_review',
      'shortlisted',
      'offered',
      'approved',
      'accepted',
      'waiting_for_team',
      'team_complete',
      'declined',
      'withdrawn'
    )
  );

comment on constraint project_applications_status_check on public.project_applications is
  'Canonical project request lifecycle. REVIEW_REQUIRED uses submitted -> in_review -> shortlisted -> offered/declined; offered is a selection boundary only and does not create membership. AUTO may continue to use approved/waiting_for_team/team_complete compatibility states.';
