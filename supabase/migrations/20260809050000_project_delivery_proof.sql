alter table public.contributions add column if not exists review_notes text;
alter table public.contributions add column if not exists updated_at timestamptz not null default now();
alter table public.contributions drop constraint if exists contributions_verification_status_check;
alter table public.contributions add constraint contributions_verification_status_check check (verification_status = any (array['pending','needs_changes','verified','rejected']));

create table if not exists public.project_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  due_at timestamptz,
  status text not null default 'planned' check (status = any (array['planned','in_progress','completed','blocked'])),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  milestone_id uuid references public.project_milestones(id) on delete set null,
  title text not null,
  description text,
  assignee_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'todo' check (status = any (array['todo','in_progress','review','done','blocked'])),
  due_at timestamptz,
  evidence_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_project_milestones_project on public.project_milestones(project_id, sort_order);
create index if not exists idx_project_tasks_project on public.project_tasks(project_id, status);
create index if not exists idx_project_tasks_assignee on public.project_tasks(assignee_user_id, status);

alter table public.project_milestones enable row level security;
alter table public.project_tasks enable row level security;

create or replace function public.is_project_member(target_project uuid)
returns boolean language sql stable set search_path=public as $$
  select exists(select 1 from public.project_members pm where pm.project_id=target_project and pm.user_id=(select auth.uid()));
$$;
create or replace function public.is_project_lead(target_project uuid)
returns boolean language sql stable set search_path=public as $$
  select public.is_admin() or exists(select 1 from public.project_members pm where pm.project_id=target_project and pm.user_id=(select auth.uid()) and pm.team_role in ('project_lead','reviewer'));
$$;
revoke all on function public.is_project_member(uuid) from public;
revoke all on function public.is_project_lead(uuid) from public;
grant execute on function public.is_project_member(uuid) to authenticated;
grant execute on function public.is_project_lead(uuid) to authenticated;

create policy "milestones readable by project members" on public.project_milestones for select to authenticated using (public.is_project_member(project_id) or public.is_admin());
create policy "milestones manageable by project leads" on public.project_milestones for all to authenticated using (public.is_project_lead(project_id)) with check (public.is_project_lead(project_id));
create policy "tasks readable by project members" on public.project_tasks for select to authenticated using (public.is_project_member(project_id) or public.is_admin());
create policy "tasks manageable by project leads" on public.project_tasks for all to authenticated using (public.is_project_lead(project_id)) with check (public.is_project_lead(project_id));
create policy "assignees update own tasks" on public.project_tasks for update to authenticated using ((select auth.uid())=assignee_user_id) with check ((select auth.uid())=assignee_user_id);

drop policy if exists "contributions insertable authenticated" on public.contributions;
drop policy if exists "admins update contributions" on public.contributions;
create policy "members submit contributions" on public.contributions for insert to authenticated with check ((((select auth.uid())=user_id) and (project_id is null or public.is_project_member(project_id))) or public.is_admin());
create policy "owners edit pending contributions" on public.contributions for update to authenticated using ((((select auth.uid())=user_id) and verification_status in ('pending','needs_changes')) or public.is_admin()) with check ((((select auth.uid())=user_id) and verification_status in ('pending','needs_changes')) or public.is_admin());
