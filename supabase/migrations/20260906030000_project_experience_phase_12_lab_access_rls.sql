-- Project Experience Phase 12: canonical Mettelo Lab access boundary.
--
-- Legacy delivery policies intentionally used the broad is_project_member(project_id)
-- helper. That helper is also useful outside Lab and therefore is not redefined here.
-- Instead, Phase 12 adds restrictive policies to private Lab tables so every existing
-- permissive policy must ALSO satisfy active/completed membership in the same delivery
-- run. This preserves the established table/mutation architecture while closing direct
-- Supabase access for waiting, removed, cross-run and non-member users.

create or replace function public.phase12_has_lab_access(
  p_project_id uuid,
  p_run_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select
    public.is_admin()
    or exists (
      select 1
      from public.project_members pm
      left join public.project_runs pr on pr.id=pm.project_run_id
      where pm.project_id=p_project_id
        and pm.user_id=auth.uid()
        and pm.membership_status in ('active','completed')
        and (
          p_run_id is null
          or pm.project_run_id=p_run_id
        )
        and (
          pm.project_run_id is null
          or pr.status in ('active','review','completed')
        )
    );
$$;

revoke all on function public.phase12_has_lab_access(uuid,uuid) from public,anon;
grant execute on function public.phase12_has_lab_access(uuid,uuid) to authenticated,service_role;

-- Run-scoped private Lab objects. These rows must carry a concrete canonical run;
-- NULL is reserved for project-level definition data on tables that support it.
-- Restrictive policies compose with existing ownership/leadership policies.
drop policy if exists phase12_lab_discussions_active_run on public.project_discussions;
create policy phase12_lab_discussions_active_run
on public.project_discussions
as restrictive
for all
to authenticated
using (project_run_id is not null and public.phase12_has_lab_access(project_id,project_run_id))
with check (project_run_id is not null and public.phase12_has_lab_access(project_id,project_run_id));

drop policy if exists phase12_lab_resources_active_run on public.project_resources;
create policy phase12_lab_resources_active_run
on public.project_resources
as restrictive
for all
to authenticated
using (project_run_id is not null and public.phase12_has_lab_access(project_id,project_run_id))
with check (project_run_id is not null and public.phase12_has_lab_access(project_id,project_run_id));

drop policy if exists phase12_lab_meetings_active_run on public.project_meetings;
create policy phase12_lab_meetings_active_run
on public.project_meetings
as restrictive
for all
to authenticated
using (project_run_id is not null and public.phase12_has_lab_access(project_id,project_run_id))
with check (project_run_id is not null and public.phase12_has_lab_access(project_id,project_run_id));

drop policy if exists phase12_lab_tasks_active_run on public.project_tasks;
create policy phase12_lab_tasks_active_run
on public.project_tasks
as restrictive
for all
to authenticated
using (project_run_id is not null and public.phase12_has_lab_access(project_id,project_run_id))
with check (project_run_id is not null and public.phase12_has_lab_access(project_id,project_run_id));

-- Milestones, canonical data sources and deliverables intentionally support
-- project-level definition rows (project_run_id IS NULL). Active members may read
-- those canonical definitions, while live run rows remain exact-run scoped.
drop policy if exists phase12_lab_milestones_active_run on public.project_milestones;
create policy phase12_lab_milestones_active_run
on public.project_milestones
as restrictive
for all
to authenticated
using (public.phase12_has_lab_access(project_id,project_run_id))
with check (public.phase12_has_lab_access(project_id,project_run_id));

drop policy if exists phase12_lab_responsibilities_active_run on public.project_member_responsibilities;
create policy phase12_lab_responsibilities_active_run
on public.project_member_responsibilities
as restrictive
for select
to authenticated
using (project_run_id is not null and public.phase12_has_lab_access(project_id,project_run_id));

drop policy if exists phase12_lab_data_sources_active_run on public.project_data_sources;
create policy phase12_lab_data_sources_active_run
on public.project_data_sources
as restrictive
for all
to authenticated
using (public.phase12_has_lab_access(project_id,project_run_id))
with check (public.phase12_has_lab_access(project_id,project_run_id));

drop policy if exists phase12_lab_deliverables_active_run on public.project_deliverables;
create policy phase12_lab_deliverables_active_run
on public.project_deliverables
as restrictive
for all
to authenticated
using (public.phase12_has_lab_access(project_id,project_run_id))
with check (public.phase12_has_lab_access(project_id,project_run_id));

-- Data-source versions do not carry project_id directly; resolve it through the
-- canonical parent source. Project-level versions may remain shared canonical data;
-- run versions remain exact-run scoped through phase12_has_lab_access.
drop policy if exists phase12_lab_data_source_versions_active_run on public.project_data_source_versions;
create policy phase12_lab_data_source_versions_active_run
on public.project_data_source_versions
as restrictive
for all
to authenticated
using (
  exists (
    select 1
    from public.project_data_sources source
    where source.id=project_data_source_versions.data_source_id
      and public.phase12_has_lab_access(source.project_id,project_data_source_versions.project_run_id)
  )
)
with check (
  exists (
    select 1
    from public.project_data_sources source
    where source.id=project_data_source_versions.data_source_id
      and public.phase12_has_lab_access(source.project_id,project_data_source_versions.project_run_id)
  )
);
