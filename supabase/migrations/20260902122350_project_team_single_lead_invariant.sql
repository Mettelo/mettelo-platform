-- Project Experience V2 — one current Project Lead per project run.
-- Readiness requires exactly one lead before kickoff; this database invariant
-- prevents concurrent or future code paths from creating two current leads.

create unique index if not exists project_members_one_current_lead_per_run
  on public.project_members(project_run_id)
  where project_run_id is not null
    and team_role='project_lead'
    and membership_status in ('waiting','active');
