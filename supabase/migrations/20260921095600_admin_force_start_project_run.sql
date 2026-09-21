-- Admin emergency start override.
--
-- This is deliberately separate from Phase 9 normal activation. It permits an
-- authenticated Admin workflow to override ordinary team/project readiness
-- blockers, while preserving hard integrity boundaries:
--   * project/run identity and lifecycle
--   * at least one confirmed canonical member
--   * maximum capacity
--   * system/Lab provisioning readiness
--   * full audit trail with mandatory reason
--
-- Normal Solo/Team/Auto starts continue to use Phase 11 + Phase 9 unchanged.

create or replace function public.admin_force_start_project_run(
  p_project_id uuid,
  p_run_id uuid,
  p_actor_user_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  project_row public.projects%rowtype;
  run_row public.project_runs%rowtype;
  readiness jsonb;
  system_ready boolean:=false;
  filled integer:=0;
  required_members integer:=1;
  maximum_members integer:=1;
  now_at timestamptz:=now();
  clean_reason text:=left(trim(coalesce(p_reason,'')),500);
begin
  if p_actor_user_id is null then
    raise exception using errcode='23514',message='ADMIN_ACTOR_REQUIRED';
  end if;
  if length(clean_reason)<8 then
    raise exception using errcode='23514',message='FORCE_START_REASON_REQUIRED';
  end if;

  select * into project_row
  from public.projects
  where id=p_project_id
  for update;
  if project_row.id is null then
    raise exception using errcode='P0002',message='PROJECT_NOT_FOUND';
  end if;

  perform public.phase9_lock_project_capacity(project_row.id);

  select * into run_row
  from public.project_runs
  where id=p_run_id and project_id=p_project_id
  for update;
  if run_row.id is null then
    raise exception using errcode='P0002',message='PROJECT_RUN_NOT_FOUND';
  end if;

  required_members:=greatest(coalesce(run_row.required_team_size,run_row.team_size_threshold,1),1);

  select count(*)::integer into filled
  from public.project_members
  where project_run_id=run_row.id
    and membership_status in ('waiting','active');

  if coalesce(run_row.has_started,false)=true or run_row.status='active' then
    return jsonb_build_object(
      'started',false,
      'already_started',true,
      'run_number',run_row.run_number,
      'filled',filled,
      'required_team_size',required_members
    );
  end if;

  if run_row.status not in ('forming','paused','review') then
    raise exception using errcode='23514',message='FORCE_START_RUN_LIFECYCLE_INVALID';
  end if;
  if project_row.status in ('cancelled','completed','archived') then
    raise exception using errcode='23514',message='PROJECT_NOT_JOINABLE';
  end if;
  if filled<1 then
    raise exception using errcode='23514',message='FORCE_START_REQUIRES_MEMBER';
  end if;

  maximum_members:=case
    when project_row.participation_mode='solo' then greatest(coalesce(project_row.max_team_size,1),1)
    else greatest(
      coalesce(project_row.max_team_size,project_row.target_team_size,project_row.min_team_size,project_row.team_size_threshold,required_members),
      required_members
    )
  end;

  if filled>maximum_members then
    raise exception using errcode='23514',message='FORCE_START_CAPACITY_INVALID';
  end if;

  readiness:=public.phase11_project_start_readiness(project_row.id,run_row.id);
  system_ready:=coalesce((readiness->'system'->>'ready')::boolean,false);
  if not system_ready then
    raise exception using errcode='23514',message='FORCE_START_SYSTEM_NOT_READY';
  end if;

  update public.project_runs
  set status='active',
      has_started=true,
      started_at=now_at,
      kickoff_at=now_at,
      scheduled_start_at=null,
      start_scheduled_at=null,
      start_ready_at=null,
      auto_start_failure=null,
      auto_start_paused_at=null,
      auto_start_pause_reason=null,
      auto_start_paused_by_user_id=null,
      auto_start_blocked_at=null,
      auto_start_block_reason=null,
      auto_start_blocked_by_user_id=null,
      updated_at=now_at
  where id=run_row.id
    and coalesce(has_started,false)=false;

  if not found then
    return jsonb_build_object(
      'started',false,
      'already_started',true,
      'run_number',run_row.run_number,
      'filled',filled,
      'required_team_size',required_members
    );
  end if;

  update public.project_members
  set membership_status='active',
      activated_at=coalesce(activated_at,now_at)
  where project_run_id=run_row.id
    and membership_status='waiting';

  update public.project_applications
  set status='team_complete',
      updated_at=now_at
  where project_run_id=run_row.id
    and status in ('approved','waiting_for_team','accepted');

  if project_row.project_type='partner' then
    update public.projects
    set status='active',
        applications_open=false,
        kickoff_at=now_at,
        starts_at=now_at,
        updated_at=now_at,
        updated_by_user_id=p_actor_user_id
    where id=project_row.id;
  else
    update public.projects
    set updated_at=now_at,
        updated_by_user_id=p_actor_user_id
    where id=project_row.id;
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
    project_row.id,
    run_row.id,
    'project_admin_force_started',
    'user',
    p_actor_user_id,
    run_row.status,
    'active',
    jsonb_build_object(
      'reason',clean_reason,
      'run_number',run_row.run_number,
      'filled',filled,
      'required_team_size',required_members,
      'maximum_team_size',maximum_members,
      'ordinary_readiness',readiness,
      'overrode_team_minimum',filled<required_members,
      'overrode_readiness',not coalesce((readiness->>'ready')::boolean,false),
      'system_ready',system_ready,
      'activation_contract','admin_force_start_v1'
    )
  );

  return jsonb_build_object(
    'started',true,
    'forced',true,
    'run_number',run_row.run_number,
    'filled',filled,
    'required_team_size',required_members,
    'maximum_team_size',maximum_members,
    'ordinary_readiness',readiness
  );
end;
$$;

revoke all on function public.admin_force_start_project_run(uuid,uuid,uuid,text)
  from public,anon,authenticated;
grant execute on function public.admin_force_start_project_run(uuid,uuid,uuid,text)
  to service_role;

comment on function public.admin_force_start_project_run(uuid,uuid,uuid,text) is
  'Service-only audited Admin override. May bypass ordinary team/project readiness but never terminal lifecycle, zero-membership, maximum-capacity, or system/Lab readiness.';
