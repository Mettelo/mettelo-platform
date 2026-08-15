alter table public.project_runs drop constraint if exists project_runs_status_check;
alter table public.project_runs add constraint project_runs_status_check
  check (status = any (array['forming'::text,'active'::text,'paused'::text,'review'::text,'completed'::text,'cancelled'::text]));
