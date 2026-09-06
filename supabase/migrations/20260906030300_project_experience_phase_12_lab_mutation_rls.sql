-- Project Experience Phase 12: separate historical read access from live delivery mutation.
--
-- phase12_has_lab_access intentionally allows completed memberships/runs so project
-- history remains readable. That must not make completed history writable when an
-- older permissive table policy would otherwise allow an assignee/member mutation.

create or replace function public.phase12_can_mutate_lab(
  p_project_id uuid,
  p_run_id uuid
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
      join public.project_runs pr on pr.id=pm.project_run_id
      where pm.project_id=p_project_id
        and pm.project_run_id=p_run_id
        and pm.user_id=auth.uid()
        and pm.membership_status='active'
        and pr.status in ('active','review')
    );
$$;

revoke all on function public.phase12_can_mutate_lab(uuid,uuid) from public,anon;
grant execute on function public.phase12_can_mutate_lab(uuid,uuid) to authenticated,service_role;

-- Private execution tables keep their existing permissive ownership/leadership
-- policies. These restrictive write policies add the canonical live-run requirement.

do $$
declare
  table_name text;
begin
  foreach table_name in array array['project_discussions','project_resources','project_meetings','project_tasks']
  loop
    execute format('drop policy if exists phase12_live_insert on public.%I',table_name);
    execute format(
      'create policy phase12_live_insert on public.%I as restrictive for insert to authenticated with check (project_run_id is not null and public.phase12_can_mutate_lab(project_id,project_run_id))',
      table_name
    );

    execute format('drop policy if exists phase12_live_update on public.%I',table_name);
    execute format(
      'create policy phase12_live_update on public.%I as restrictive for update to authenticated using (project_run_id is not null and public.phase12_can_mutate_lab(project_id,project_run_id)) with check (project_run_id is not null and public.phase12_can_mutate_lab(project_id,project_run_id))',
      table_name
    );

    execute format('drop policy if exists phase12_live_delete on public.%I',table_name);
    execute format(
      'create policy phase12_live_delete on public.%I as restrictive for delete to authenticated using (project_run_id is not null and public.phase12_can_mutate_lab(project_id,project_run_id))',
      table_name
    );
  end loop;
end;
$$;

comment on function public.phase12_can_mutate_lab(uuid,uuid) is
  'Phase 12 live-delivery mutation authority. Completed Lab history remains readable through phase12_has_lab_access but is not writable by ordinary completed members.';
