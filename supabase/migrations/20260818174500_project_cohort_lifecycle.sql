-- Feature 1: Open/Partner project team lifecycle
-- Open projects use project_runs as independent cohort/team instances.
-- Partner projects use exactly one live run and require an explicit manual start.

alter table public.projects
  add column if not exists applications_open boolean not null default true,
  add column if not exists project_type_review_required boolean not null default true,
  add column if not exists project_type_reviewed_at timestamptz,
  add column if not exists project_type_reviewed_by uuid references auth.users(id) on delete set null;

alter table public.projects alter column project_type drop default;

alter table public.project_runs
  add column if not exists required_team_size integer,
  add column if not exists has_started boolean not null default false,
  add column if not exists started_at timestamptz;

update public.project_runs r
set required_team_size = coalesce(r.required_team_size, r.team_size_threshold, p.team_size_threshold, 5)
from public.projects p
where p.id = r.project_id and r.required_team_size is null;

alter table public.project_runs
  alter column required_team_size set default 5,
  alter column required_team_size set not null;

alter table public.project_runs
  drop constraint if exists project_runs_required_team_size_check;
alter table public.project_runs
  add constraint project_runs_required_team_size_check check (required_team_size between 1 and 50);

create table if not exists public.project_activity_log (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  project_run_id uuid references public.project_runs(id) on delete cascade,
  event_type text not null,
  actor_type text not null check (actor_type in ('system','user')),
  actor_user_id uuid references auth.users(id) on delete set null,
  from_status text,
  to_status text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists project_activity_log_project_created_idx
on public.project_activity_log(project_id, created_at desc);

alter table public.project_activity_log enable row level security;

drop policy if exists "project activity visible to project members" on public.project_activity_log;
create policy "project activity visible to project members"
on public.project_activity_log for select to authenticated
using (
  exists (
    select 1 from public.project_members pm
    where pm.project_id = project_activity_log.project_id
      and pm.user_id = (select auth.uid())
      and pm.membership_status in ('waiting','active','completed')
  )
  or coalesce((select auth.jwt()->'app_metadata'->>'role'),'') = 'admin'
);

-- Historical rows are deliberately not marked reviewed here. Admin must confirm
-- each legacy project type before project_type_review_required is cleared.
