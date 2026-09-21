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
  ordinary_system_ready boolean:=false;
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
  ordinary_system_ready:=coalesce((readiness->'system'->>'ready')::boolean,false);

  -- Force start may override ordinary start policy such as team minimum,
  -- Project Lead/responsibility readiness, AUTO schedule eligibility, pause or
  -- an operational start block. It must not bypass the hard workspace/system
  -- prerequisites required for members to enter a usable project.
  system_ready:=
    coalesce((readiness->'system'->>'lab_ready')::boolean,false)
    and coalesce((readiness->'system'->>'permissions_ready')::boolean,false)
    and coalesce((readiness->'system'->>'private_resources_ready')::boolean,false)
    and coalesce((readiness->'system'->>'first_milestone_ready')::boolean,false);
  if not system_ready then
    raise exception using errcode='23514',message='FORCE_START_SYSTEM_NOT_READY';
  end if;

  -- The normal ACTIVE-transition trigger intentionally rejects below-minimum or
  -- schedule-not-due starts. This transaction-local flag is set only by this
  -- service-only Admin RPC after the hard integrity checks above have passed.
  perform set_config('mettelo.admin_force_start','1',true);

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

  perform set_config('mettelo.admin_force_start','0',true);

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
      'ordinary_system_ready',ordinary_system_ready,
      'overrode_auto_schedule',coalesce((readiness->'system'->>'schedule_due')::boolean,true)=false,
      'activation_contract','admin_force_start_v2'
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
  'Service-only audited Admin override. May bypass ordinary team/project readiness and AUTO timing, but never terminal lifecycle, zero-membership, maximum-capacity, or hard Lab/system readiness.';

-- Keep the canonical Phase 11 guard for every normal start. Only the
-- transaction-local flag set inside admin_force_start_project_run may pass the
-- ACTIVE boundary without full ordinary readiness.
create or replace function public.phase11_guard_run_activation()
returns trigger
language plpgsql
security definer
set search_path=public
as $
declare
  project_row public.projects%rowtype;
  readiness jsonb;
  effective_admission text;
  codes text;
begin
  if not ((new.status='active' or coalesce(new.has_started,false)=true)
      and not (old.status='active' or coalesce(old.has_started,false)=true)) then
    return new;
  end if;

  if new.project_id is distinct from old.project_id then
    raise exception using errcode='23514',message='PROJECT_RUN_PROJECT_IMMUTABLE_AT_START';
  end if;

  -- A governed Admin force-start has already revalidated hard lifecycle,
  -- membership, capacity and workspace/system integrity inside the same locked
  -- transaction. No other caller receives this exception path.
  if current_setting('mettelo.admin_force_start',true)='1' then
    return new;
  end if;

  select * into project_row from public.projects where id=old.project_id;
  if project_row.id is null then
    raise exception using errcode='23503',message='PROJECT_NOT_FOUND';
  end if;

  readiness:=public.phase11_project_start_readiness(old.project_id,old.id);
  if not coalesce((readiness->>'ready')::boolean,false) then
    codes:=coalesce((readiness->'reason_codes')::text,'[]');
    raise exception using errcode='23514',message='PHASE11_START_NOT_READY',detail=codes;
  end if;

  effective_admission:=public.effective_project_admission_mode(project_row.project_type,project_row.admission_mode);
  if effective_admission='auto' then
    if old.scheduled_start_at is null or old.scheduled_start_at>now() then
      raise exception using errcode='23514',message='SCHEDULE_NOT_DUE';
    end if;
    if project_row.auto_start_paused_at is not null or old.auto_start_paused_at is not null then
      raise exception using errcode='23514',message='PROJECT_PAUSED';
    end if;
    if old.auto_start_blocked_at is not null then
      raise exception using errcode='23514',message='PROJECT_BLOCKED';
    end if;
  end if;

  return new;
end;
$;

revoke all on function public.phase11_guard_run_activation() from public,anon,authenticated;
