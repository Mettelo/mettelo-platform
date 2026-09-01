-- Repair the member project bookmark schema on environments that missed the original
-- Discover migration. This is intentionally idempotent and preserves the existing
-- project/application/team lifecycle: saving is only a private member bookmark.

create table if not exists public.saved_projects (
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  saved_at timestamptz not null default now(),
  primary key (user_id, project_id)
);

create index if not exists saved_projects_project_idx
  on public.saved_projects(project_id, saved_at desc);

alter table public.saved_projects enable row level security;

drop policy if exists "members manage own saved projects" on public.saved_projects;
create policy "members manage own saved projects"
on public.saved_projects
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant select, insert, delete on table public.saved_projects to authenticated;
grant select, insert, update, delete on table public.saved_projects to service_role;
