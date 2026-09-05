-- Project Experience Phase 6: align the canonical project request lifecycle with
-- the statuses written by Admin review/team formation while preserving legacy rows.
--
-- Historical baseline allowed only:
-- submitted, in_review, shortlisted, accepted, declined, withdrawn.
-- Phase 6 additionally uses approved as a compatibility review state plus
-- waiting_for_team and team_complete for the canonical team-formation handoff.

alter table public.project_applications
  drop constraint if exists project_applications_status_check;

alter table public.project_applications
  add constraint project_applications_status_check
  check (
    status in (
      'submitted',
      'in_review',
      'shortlisted',
      'approved',
      'accepted',
      'waiting_for_team',
      'team_complete',
      'declined',
      'withdrawn'
    )
  );

comment on constraint project_applications_status_check on public.project_applications is
  'Canonical project request lifecycle: review, team formation/confirmation, terminal history, and legacy accepted/approved compatibility states.';

-- Keep the PostgreSQL uniqueness contract aligned with the API definition of an
-- active interest. Declined and withdrawn requests are terminal history and must
-- not block a later lifecycle/request for the same member and project.
drop index if exists public.project_applications_one_interest_per_project_user;
create unique index project_applications_one_interest_per_project_user
  on public.project_applications(project_id,user_id)
  where application_kind='interest' and status not in ('declined','withdrawn');
