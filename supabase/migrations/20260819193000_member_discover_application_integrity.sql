-- My Mettelo Discover + Member Project Detail application integrity.
-- A member may have only one active full application for a project, regardless of role.
-- Saved projects are member-specific bookmarks and never create an application.
--
-- The hosted project_applications table already carries application_kind/requested_role,
-- but the historical repository baseline did not version those columns. Add them safely
-- before relying on application_kind in the active-application uniqueness invariant.

alter table public.project_applications
  add column if not exists application_kind text not null default 'application',
  add column if not exists requested_role text;

alter table public.project_applications drop constraint if exists project_applications_application_kind_check;
alter table public.project_applications add constraint project_applications_application_kind_check
  check (application_kind in ('interest','application')) not valid;
alter table public.project_applications validate constraint project_applications_application_kind_check;

create unique index if not exists project_applications_one_active_application_per_project_user
  on public.project_applications(project_id,user_id)
  where application_kind='application' and status not in ('declined','withdrawn');

create table if not exists public.saved_projects (
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  saved_at timestamptz not null default now(),
  primary key(user_id,project_id)
);

create index if not exists saved_projects_project_idx on public.saved_projects(project_id,saved_at desc);

alter table public.saved_projects enable row level security;

drop policy if exists "members manage own saved projects" on public.saved_projects;
create policy "members manage own saved projects"
on public.saved_projects
for all
to authenticated
using ((select auth.uid())=user_id)
with check ((select auth.uid())=user_id);

grant select,insert,delete on public.saved_projects to authenticated;
