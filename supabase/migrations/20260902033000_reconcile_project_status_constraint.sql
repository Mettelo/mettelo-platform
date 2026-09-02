-- Reconcile clean-environment project status vocabulary with the hosted database.
-- Production already uses this canonical set; fresh databases must accept the same
-- Open Project lifecycle states so release-gate migrations reproduce production.

alter table public.projects
  drop constraint if exists projects_status_check;

alter table public.projects
  add constraint projects_status_check
  check (status = any (array[
    'draft'::text,
    'pilot'::text,
    'recruiting'::text,
    'open'::text,
    'forming'::text,
    'active'::text,
    'review'::text,
    'completed'::text,
    'cancelled'::text,
    'archived'::text
  ]));
