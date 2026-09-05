-- Phase 7 ships in the same unreleased migration train as Phase 6.
-- Phase 6 populated every pre-existing project with its then-programme default of 120
-- minutes when the non-null column was introduced. No Admin could have configured
-- that new field between repository migrations. Normalize only that inherited release
-- default now; explicit project overrides created after the migration train remain
-- authoritative.

update public.projects
set auto_start_delay_minutes=360,
    updated_at=now()
where auto_start_delay_minutes=120;

comment on column public.projects.auto_start_delay_minutes is
  'Delay after AUTO start conditions are satisfied before durable auto-start processing. Programme default is 360 minutes (6 hours). Explicit per-project Open Project overrides remain authoritative after this migration train.';
