-- Project Experience Phase 11: one canonical Project Alignment & Start Readiness projection.
--
-- Phase 11 does not create another run, membership, Lab, responsibility, lead or
-- start system. It composes the existing Phase 3 project readiness, Phase 9
-- participation/capacity/start controls and Phase 10 team formation truth into
-- the three playbook readiness areas: project, team and system.

create or replace function public.phase11_project_start_readiness(
  p_project_id uuid,
  p_run_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  project_row public.projects%rowtype;
  run_row public.project_runs%rowtype;
  readiness_row record;
  required_members integer:=1;
  maximum_members integer:=1;
  filled integer:=0;
  missing_responsibilities integer:=0;
  lead_count integer:=0;
  project_blockers text[]:='{}'::text[];
  team_blockers text[]:='{}'::text[];
  system_blockers text[]:='{}'::text[];
  all_blockers text[]:='{}'::text[];
  project_ready boolean:=false;
  team_ready boolean:=false;
  system_ready boolean:=false;
begin
  if p_project_id is null or p_run_id is null then
    raise exception using errcode='23514',message='PROJECT_AND_RUN_REQUIRED';
  end if;

  select * into project_row from public.projects where id=p_project_id;
  if project_row.id is null then
    raise exception using errcode='P0002',message='PROJECT_NOT_FOUND';
  end if;

  select * into run_row
  from public.project_runs
  where id=p_run_id and project_id=p_project_id;
  if run_row.id is null then
    raise exception using errcode='P0002',message='PROJECT_RUN_NOT_FOUND';
  end if;

  select publication_ready,lab_ready,missing_requirements,publication_blockers
  into readiness_row
  from public.project_experience_readiness
  where project_id=p_project_id;

  required_members:=greatest(coalesce(run_row.required_team_size,run_row.team_size_threshold,1),1);
  maximum_members:=case
    when project_row.participation_mode='solo' then greatest(coalesce(project_row.max_team_size,1),1)
    else greatest(coalesce(project_row.max_team_size,project_row.target_team_size,project_row.min_team_size,project_row.team_size_threshold,required_members),required_members)
  end;

  select count(*)::integer into filled
  from public.project_members
  where project_run_id=p_run_id and membership_status in ('waiting','active');

  if project_row.status in ('cancelled','completed','archived') then
    project_blockers:=array_append(project_blockers,'project_lifecycle');
  end if;
  if readiness_row is null then
    project_blockers:=array_append(project_blockers,'project_readiness_unavailable');
  elsif coalesce(readiness_row.publication_ready,false)=false then
    project_blockers:=array_append(project_blockers,'project_definition');
  end if;

  if filled<required_members then team_blockers:=array_append(team_blockers,'team_size'); end if;
  if filled>maximum_members then team_blockers:=array_append(team_blockers,'capacity'); end if;

  -- Independent threshold-1 delivery intentionally has no artificial Team-only
  -- Project Lead or responsibility ownership requirement.
  if required_members>1 then
    select count(*)::integer into missing_responsibilities
    from public.project_members m
    where m.project_run_id=p_run_id
      and m.membership_status in ('waiting','active')
      and not exists (
        select 1 from public.project_member_responsibilities r
        where r.project_member_id=m.id
          and r.project_run_id=p_run_id
          and r.assignment_status='active'
      );
    if missing_responsibilities>0 then
      team_blockers:=array_append(team_blockers,'responsibility_coverage');
    end if;

    select count(*)::integer into lead_count
    from public.project_members
    where project_run_id=p_run_id
      and membership_status in ('waiting','active')
      and team_role='project_lead';
    if lead_count=0 then team_blockers:=array_append(team_blockers,'project_lead'); end if;
    if lead_count>1 then team_blockers:=array_append(team_blockers,'multiple_project_leads'); end if;
  end if;

  if run_row.status<>'forming' or coalesce(run_row.has_started,false)=true then
    system_blockers:=array_append(system_blockers,'run_lifecycle');
  end if;
  if run_row.auto_start_blocked_at is not null then
    system_blockers:=array_append(system_blockers,'auto_start_blocked');
  end if;
  if project_row.auto_start_paused_at is not null or run_row.auto_start_paused_at is not null then
    system_blockers:=array_append(system_blockers,'start_paused');
  end if;
  if readiness_row is null or coalesce(readiness_row.lab_ready,false)=false then
    system_blockers:=array_append(system_blockers,'lab_readiness');
  end if;

  project_ready:=cardinality(project_blockers)=0;
  team_ready:=cardinality(team_blockers)=0;
  system_ready:=cardinality(system_blockers)=0;
  all_blockers:=project_blockers||team_blockers||system_blockers;

  return jsonb_build_object(
    'ready',project_ready and team_ready and system_ready,
    'project',jsonb_build_object(
      'ready',project_ready,
      'blockers',to_jsonb(project_blockers),
      'publication_ready',coalesce(readiness_row.publication_ready,false),
      'missing_requirements',coalesce(to_jsonb(readiness_row.missing_requirements),'[]'::jsonb),
      'publication_blockers',coalesce(to_jsonb(readiness_row.publication_blockers),'[]'::jsonb)
    ),
    'team',jsonb_build_object(
      'ready',team_ready,
      'blockers',to_jsonb(team_blockers),
      'filled',filled,
      'required_team_size',required_members,
      'maximum_team_size',maximum_members,
      'missing_responsibility_members',missing_responsibilities,
      'project_lead_count',lead_count
    ),
    'system',jsonb_build_object(
      'ready',system_ready,
      'blockers',to_jsonb(system_blockers),
      'lab_ready',coalesce(readiness_row.lab_ready,false),
      'run_status',run_row.status,
      'has_started',coalesce(run_row.has_started,false),
      'start_blocked',run_row.auto_start_blocked_at is not null,
      'start_paused',project_row.auto_start_paused_at is not null or run_row.auto_start_paused_at is not null
    ),
    'blockers',to_jsonb(all_blockers)
  );
end;
$$;

comment on function public.phase11_project_start_readiness(uuid,uuid) is
  'Phase 11 service-only Project Alignment & Start Readiness projection. Composes canonical project, team and system readiness without creating a second lifecycle or start authority.';

revoke all on function public.phase11_project_start_readiness(uuid,uuid) from public,anon,authenticated;
grant execute on function public.phase11_project_start_readiness(uuid,uuid) to service_role;
