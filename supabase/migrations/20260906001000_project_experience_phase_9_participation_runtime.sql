-- Project Experience Phase 9: Team / Solo / Flexible runtime participation model.
--
-- Phase 3 already owns the canonical project definition:
--   participation_mode + min_team_size + target_team_size + max_team_size.
-- Phase 6 already owns late-joining policy and the canonical project_members path.
-- Phase 9 activates those definitions at run time without introducing a second
-- team/membership system.

-- Existing unstarted runs are aligned to the canonical project minimum. Target is
-- deliberately NOT a start threshold. Solo/Flexible runs require one member;
-- Team runs require the project's minimum viable team size.
update public.project_runs r
set required_team_size=case
      when p.participation_mode in ('solo','flexible') then 1
      else greatest(coalesce(p.min_team_size,p.team_size_threshold,1),1)
    end,
    team_size_threshold=case
      when p.participation_mode in ('solo','flexible') then 1
      else greatest(coalesce(p.min_team_size,p.team_size_threshold,1),1)
    end,
    updated_at=now()
from public.projects p
where p.id=r.project_id
  and coalesce(r.has_started,false)=false
  and (
    r.required_team_size is distinct from case
      when p.participation_mode in ('solo','flexible') then 1
      else greatest(coalesce(p.min_team_size,p.team_size_threshold,1),1)
    end
    or r.team_size_threshold is distinct from case
      when p.participation_mode in ('solo','flexible') then 1
      else greatest(coalesce(p.min_team_size,p.team_size_threshold,1),1)
    end
  );

alter table public.project_runs
  drop constraint if exists project_runs_required_team_size_check;
alter table public.project_runs
  add constraint project_runs_required_team_size_check
  check (required_team_size is null or required_team_size between 1 and 50);

-- Keep forming/new run thresholds aligned with the canonical project definition.
-- Started runs retain their historical threshold so run history is never rewritten
-- after activation.
create or replace function public.phase9_sync_run_participation_contract()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  project_row public.projects%rowtype;
  canonical_required integer;
begin
  select * into project_row from public.projects where id=new.project_id;
  if project_row.id is null then
    raise exception using errcode='P0002',message='PROJECT_NOT_FOUND';
  end if;

  canonical_required:=case
    when project_row.participation_mode in ('solo','flexible') then 1
    else greatest(coalesce(project_row.min_team_size,project_row.team_size_threshold,1),1)
  end;

  if tg_op='INSERT' or coalesce(new.has_started,false)=false then
    new.required_team_size:=canonical_required;
    new.team_size_threshold:=canonical_required;
  end if;

  return new;
end;
$$;

revoke all on function public.phase9_sync_run_participation_contract() from public,anon,authenticated;

drop trigger if exists project_run_phase9_participation_contract on public.project_runs;
create trigger project_run_phase9_participation_contract
before insert or update of project_id,required_team_size,team_size_threshold,has_started
on public.project_runs
for each row execute function public.phase9_sync_run_participation_contract();

-- Runtime capacity snapshot used by later formation/start phases and tests. It is
-- service-only because membership counts for non-public projects are operational
-- data. This function does not mutate membership or bypass RLS for browser users.
create or replace function public.phase9_project_run_capacity(
  p_project_id uuid,
  p_run_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  project_row public.projects%rowtype;
  run_row public.project_runs%rowtype;
  minimum_members integer;
  target_members integer;
  maximum_members integer;
  occupied integer:=0;
  late_join_allowed boolean:=false;
  now_at timestamptz:=now();
begin
  select * into project_row from public.projects where id=p_project_id;
  if project_row.id is null then raise exception using errcode='P0002',message='PROJECT_NOT_FOUND'; end if;

  minimum_members:=case
    when project_row.participation_mode in ('solo','flexible') then 1
    else greatest(coalesce(project_row.min_team_size,project_row.team_size_threshold,1),1)
  end;
  target_members:=greatest(minimum_members,coalesce(project_row.target_team_size,minimum_members));
  maximum_members:=case
    when project_row.participation_mode='solo' then 1
    else greatest(target_members,coalesce(project_row.max_team_size,target_members))
  end;

  if p_run_id is not null then
    select * into run_row from public.project_runs where id=p_run_id and project_id=p_project_id;
    if run_row.id is null then raise exception using errcode='P0002',message='PROJECT_RUN_NOT_FOUND'; end if;
    select count(*)::integer into occupied
    from public.project_members
    where project_run_id=p_run_id and membership_status in ('waiting','active');
    late_join_allowed:=coalesce(run_row.has_started,false)=true
      and run_row.status='active'
      and coalesce(run_row.recruitment_open,true)=true
      and coalesce(project_row.late_joining_enabled,true)=true
      and (project_row.late_joining_cutoff_at is null or now_at<project_row.late_joining_cutoff_at)
      and occupied<maximum_members;
  else
    select count(*)::integer into occupied
    from public.project_members
    where project_id=p_project_id and membership_status in ('waiting','active');
  end if;

  return jsonb_build_object(
    'project_id',p_project_id,
    'run_id',p_run_id,
    'participation_mode',project_row.participation_mode,
    'minimum',minimum_members,
    'target',target_members,
    'maximum',maximum_members,
    'occupied',occupied,
    'ready',occupied>=minimum_members and occupied<=maximum_members,
    'target_reached',occupied>=target_members,
    'capacity_available',occupied<maximum_members,
    'late_join_allowed',late_join_allowed
  );
end;
$$;

revoke all on function public.phase9_project_run_capacity(uuid,uuid) from public,anon,authenticated;
grant execute on function public.phase9_project_run_capacity(uuid,uuid) to service_role;

-- Late joining already exists from Phase 6. Phase 9 adds the operational index
-- needed to find the active recruiting run efficiently; no new membership path.
create index if not exists project_runs_active_recruitment_idx
  on public.project_runs(project_id,run_number desc)
  where status='active' and has_started=true and recruitment_open=true;

comment on column public.projects.late_joining_enabled is
  'Whether eligible participation may join an already active canonical run while the run is recruiting, the cutoff has not passed, and maximum capacity remains.';
comment on column public.projects.target_team_size is
  'Preferred planning size only. It must never be used as the minimum start threshold.';
