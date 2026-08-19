-- My Mettelo Discover + Member Project Detail application integrity.
-- A member may have only one active full application for a project, regardless of role.
-- Saved projects are member-specific bookmarks and never create an application.

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
