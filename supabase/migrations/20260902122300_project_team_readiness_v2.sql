-- Project Experience V2 — explicit leadership intent for automatic team formation.
--
-- Leadership interest is captured at application time. It is advisory input to
-- Mettelo's deterministic team-lead recommendation, not a guarantee of selection.

alter table public.project_applications
  add column if not exists leadership_interest boolean not null default false;

comment on column public.project_applications.leadership_interest is
  'Member explicitly volunteered to lead this project team if selected. Used as a transparent team-formation signal, not as an entitlement.';

create index if not exists project_applications_run_leadership_interest_idx
  on public.project_applications(project_run_id, leadership_interest)
  where project_run_id is not null;
