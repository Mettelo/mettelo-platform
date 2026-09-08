-- Project Experience Phase 12: privacy-safe Lab-open telemetry.
--
-- Reuse the canonical project_activity_log rather than introducing a second
-- analytics store. The RPC validates the authenticated member against the same
-- active-run authority used by private Lab RLS and stores no project content,
-- resource URLs, Chat text, task descriptions, application data or internal notes.

create or replace function public.phase12_record_lab_open(
  p_project_id uuid,
  p_run_id uuid
)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare
  actor uuid:=auth.uid();
begin
  if actor is null or p_run_id is null then
    return false;
  end if;

  if not public.phase12_has_lab_access(p_project_id,p_run_id) then
    return false;
  end if;

  -- Collapse rapid server re-renders/navigation into one open signal. This keeps
  -- the event useful at aggregate level without instrumenting every Lab click.
  if exists (
    select 1
    from public.project_activity_log log
    where log.project_id=p_project_id
      and log.project_run_id=p_run_id
      and log.actor_user_id=actor
      and log.event_type='lab_opened'
      and log.created_at>=now()-interval '5 minutes'
  ) then
    return true;
  end if;

  insert into public.project_activity_log(
    project_id,
    project_run_id,
    event_type,
    actor_type,
    actor_user_id,
    from_status,
    to_status,
    metadata
  ) values (
    p_project_id,
    p_run_id,
    'lab_opened',
    'member',
    actor,
    null,
    null,
    jsonb_build_object('surface','mettelo_lab')
  );

  return true;
end;
$$;

revoke all on function public.phase12_record_lab_open(uuid,uuid) from public,anon;
grant execute on function public.phase12_record_lab_open(uuid,uuid) to authenticated,service_role;

comment on function public.phase12_record_lab_open(uuid,uuid) is
  'Records a deduplicated, privacy-safe Mettelo Lab open after canonical Phase 12 run authorization.';
