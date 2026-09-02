-- Project Experience V2 — canonical template RLS hardening.
--
-- Dropping project_run_id NOT NULL creates an intentional project-template scope.
-- Existing run-scoped owner/lead policies must therefore be narrowed so a normal
-- authenticated user cannot create or mutate a template row for an arbitrary
-- project simply by setting added_by to themselves.

-- Canonical resource definitions: run rows preserve the existing owner/lead
-- contract; template rows are managed only by Admin or an active creating /
-- managing Project Architect assigned to that project.
drop policy if exists "owners and leads manage data sources" on public.project_data_sources;
create policy "owners leads or architects manage data sources"
on public.project_data_sources
for all to authenticated
using (
  (
    project_run_id is not null
    and (added_by=(select auth.uid()) or owner_user_id=(select auth.uid()) or public.mettelo_is_run_lead(project_run_id))
  )
  or (
    project_run_id is null
    and (
      coalesce((select auth.jwt()->'app_metadata'->>'role'),'')='admin'
      or exists(
        select 1 from public.project_architect_assignments paa
        where paa.project_id=project_data_sources.project_id
          and paa.user_id=(select auth.uid())
          and paa.assignment_status='active'
          and paa.assignment_role in ('creating_architect','managing_architect')
      )
    )
  )
)
with check (
  (
    project_run_id is not null
    and (added_by=(select auth.uid()) or public.mettelo_is_run_lead(project_run_id))
  )
  or (
    project_run_id is null
    and (
      coalesce((select auth.jwt()->'app_metadata'->>'role'),'')='admin'
      or exists(
        select 1 from public.project_architect_assignments paa
        where paa.project_id=project_data_sources.project_id
          and paa.user_id=(select auth.uid())
          and paa.assignment_status='active'
          and paa.assignment_role in ('creating_architect','managing_architect')
      )
    )
  )
);

-- Canonical deliverable definitions use the same authority boundary. Existing
-- run leads retain full execution management over run-scoped deliverables.
drop policy if exists "run leads manage deliverables" on public.project_deliverables;
create policy "run leads or architects manage deliverables"
on public.project_deliverables
for all to authenticated
using (
  (project_run_id is not null and public.mettelo_is_run_lead(project_run_id))
  or (
    project_run_id is null
    and (
      coalesce((select auth.jwt()->'app_metadata'->>'role'),'')='admin'
      or exists(
        select 1 from public.project_architect_assignments paa
        where paa.project_id=project_deliverables.project_id
          and paa.user_id=(select auth.uid())
          and paa.assignment_status='active'
          and paa.assignment_role in ('creating_architect','managing_architect')
      )
    )
  )
)
with check (
  (project_run_id is not null and public.mettelo_is_run_lead(project_run_id))
  or (
    project_run_id is null
    and (
      coalesce((select auth.jwt()->'app_metadata'->>'role'),'')='admin'
      or exists(
        select 1 from public.project_architect_assignments paa
        where paa.project_id=project_deliverables.project_id
          and paa.user_id=(select auth.uid())
          and paa.assignment_status='active'
          and paa.assignment_role in ('creating_architect','managing_architect')
      )
    )
  )
);

-- Success criteria must never reveal an unpublished/private project merely
-- because the criterion itself is marked public/member. The project row must
-- also be visible under the caller's existing projects RLS contract.
drop policy if exists "project members read success criteria" on public.project_success_criteria;
create policy "visible project members read success criteria"
on public.project_success_criteria
for select to authenticated
using (
  (
    visibility in ('public','member')
    and exists(select 1 from public.projects p where p.id=project_success_criteria.project_id)
  )
  or (
    visibility='team'
    and exists(
      select 1 from public.project_members pm
      where pm.project_id=project_success_criteria.project_id
        and pm.user_id=(select auth.uid())
        and pm.membership_status in ('active','completed')
    )
  )
  or coalesce((select auth.jwt()->'app_metadata'->>'role'),'')='admin'
);

-- Creating/managing Project Architects may maintain the project-level success
-- definition. Reviewing Architects remain read/review actors, not authors.
drop policy if exists "admins manage success criteria" on public.project_success_criteria;
create policy "admins or architects manage success criteria"
on public.project_success_criteria
for all to authenticated
using (
  coalesce((select auth.jwt()->'app_metadata'->>'role'),'')='admin'
  or exists(
    select 1 from public.project_architect_assignments paa
    where paa.project_id=project_success_criteria.project_id
      and paa.user_id=(select auth.uid())
      and paa.assignment_status='active'
      and paa.assignment_role in ('creating_architect','managing_architect')
  )
)
with check (
  coalesce((select auth.jwt()->'app_metadata'->>'role'),'')='admin'
  or exists(
    select 1 from public.project_architect_assignments paa
    where paa.project_id=project_success_criteria.project_id
      and paa.user_id=(select auth.uid())
      and paa.assignment_status='active'
      and paa.assignment_role in ('creating_architect','managing_architect')
  )
);
