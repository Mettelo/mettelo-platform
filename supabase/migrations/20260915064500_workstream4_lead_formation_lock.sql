-- Workstream 4: Project Lead assignment is a formation decision.
-- Responsibilities can continue to evolve on an active run, but leadership
-- cannot be replaced through the normal Phase 10 formation control once the
-- canonical run has started. Recovery/replacement must use its governed path.

create or replace function public.phase10_guard_project_lead_formation_lock()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  run_status text;
  run_started boolean;
begin
  if new.team_role is not distinct from old.team_role then
    return new;
  end if;

  if new.project_run_id is null then
    return new;
  end if;

  -- Only transitions involving Project Lead are governed here. Normal member
  -- status and non-lead compatibility fields retain their existing guards.
  if old.team_role<>'project_lead' and new.team_role<>'project_lead' then
    return new;
  end if;

  select status,coalesce(has_started,false)
  into run_status,run_started
  from public.project_runs
  where id=new.project_run_id
  for update;

  if run_status is null then
    raise exception using errcode='23514',message='MEMBERSHIP_RUN_NOT_FOUND';
  end if;

  if run_status<>'forming' or run_started then
    raise exception using errcode='23514',message='PROJECT_LEAD_CHANGE_REQUIRES_FORMING_RUN';
  end if;

  return new;
end;
$$;

revoke all on function public.phase10_guard_project_lead_formation_lock() from public,anon,authenticated;

drop trigger if exists project_member_phase10_lead_formation_lock on public.project_members;
create trigger project_member_phase10_lead_formation_lock
before update of team_role
on public.project_members
for each row execute function public.phase10_guard_project_lead_formation_lock();

comment on function public.phase10_guard_project_lead_formation_lock() is
  'Workstream 4 defence-in-depth: normal Project Lead changes are formation-only; active-run leadership recovery must use a dedicated governed recovery path.';
