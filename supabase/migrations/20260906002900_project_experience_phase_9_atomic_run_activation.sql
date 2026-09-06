-- Phase 9 atomic final run activation.
--
-- The application service may prepare/assign readiness before start, but the
-- authoritative transition to ACTIVE must revalidate all mutable database state
-- in one transaction. This closes the race where membership/readiness could fall
-- below the applicable minimum between a service-side read and the run update.
--
-- Canonical lock order remains:
--   project row -> Phase 9 capacity lock -> run row -> membership/application rows.

create or replace function public.phase9_activate_project_run(
  p_project_id uuid,
  p_run_id uuid,
  p_source text,
  p_actor_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  project_row public.projects%rowtype;
  run_row public.project_runs%rowtype;
  now_at timestamptz:=now();
  effective_admission text;
  required_members integer:=1;
  maximum_members integer:=1;
  filled integer:=0;
  missing_responsibilities integer:=0;
  lead_count integer:=0;
  lead_user_id uuid:=null;
  lab_ready boolean:=false;
  event_type text;
begin
  if p_source not in ('auto_scheduler','manual','admin_retry') then
    raise exception using errcode='23514',message='INVALID_START_SOURCE';
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

  if run_row.status<>'forming' then
    return jsonb_build_object(
      'started',false,
      'not_ready',true,
      'blockers',jsonb_build_array('run_lifecycle'),
      'run_number',run_row.run_number,
      'filled',filled,
      'required_team_size',required_members
    );
  end if;

  if project_row.status in ('cancelled','completed','archived') then
    return jsonb_build_object(
      'started',false,
      'not_ready',true,
      'blockers',jsonb_build_array('project_lifecycle'),
      'run_number',run_row.run_number,
      'filled',filled,
      'required_team_size',required_members
    );
  end if;

  effective_admission:=public.effective_project_admission_mode(project_row.project_type,project_row.admission_mode);
  if p_source='auto_scheduler' and effective_admission<>'auto' then
    return jsonb_build_object(
      'started',false,
      'not_ready',true,
      'blockers',jsonb_build_array('admission_mode'),
      'run_number',run_row.run_number,
      'filled',filled,
      'required_team_size',required_members
    );
  end if;

  if run_row.auto_start_blocked_at is not null then
    return jsonb_build_object(
      'started',false,
      'blocked',true,
      'blockers',jsonb_build_array('auto_start_blocked'),
      'run_number',run_row.run_number,
      'filled',filled,
      'required_team_size',required_members
    );
  end if;

  if p_source='auto_scheduler'
     and (project_row.auto_start_paused_at is not null or run_row.auto_start_paused_at is not null) then
    return jsonb_build_object(
      'started',false,
      'paused',true,
      'run_number',run_row.run_number,
      'filled',filled,
      'required_team_size',required_members
    );
  end if;

  if p_source='auto_scheduler'
     and (run_row.scheduled_start_at is null or run_row.scheduled_start_at>now_at) then
    return jsonb_build_object(
      'started',false,
      'not_ready',true,
      'blockers',jsonb_build_array('schedule_not_due'),
      'run_number',run_row.run_number,
      'filled',filled,
      'required_team_size',required_members
    );
  end if;

  maximum_members:=case
    when project_row.participation_mode='solo' then 1
    else greatest(coalesce(project_row.max_team_size,project_row.target_team_size,project_row.min_team_size,project_row.team_size_threshold,required_members),required_members)
  end;

  if filled<required_members then
    return jsonb_build_object(
      'started',false,
      'not_ready',true,
      'blockers',jsonb_build_array('team_size'),
      'run_number',run_row.run_number,
      'filled',filled,
      'required_team_size',required_members
    );
  end if;

  if filled>maximum_members then
    return jsonb_build_object(
      'started',false,
      'not_ready',true,
      'blockers',jsonb_build_array('capacity'),
      'run_number',run_row.run_number,
      'filled',filled,
      'required_team_size',required_members,
      'maximum_team_size',maximum_members
    );
  end if;

  select coalesce(r.lab_ready,false) into lab_ready
  from public.project_experience_readiness r
  where r.project_id=project_row.id;
  lab_ready:=coalesce(lab_ready,false);
  if not lab_ready then
    return jsonb_build_object(
      'started',false,
      'not_ready',true,
      'blockers',jsonb_build_array('project_readiness'),
      'run_number',run_row.run_number,
      'filled',filled,
      'required_team_size',required_members
    );
  end if;

  -- One-person run geometry does not require Team-only responsibility/lead gates.
  if required_members>1 then
    select count(*)::integer into missing_responsibilities
    from public.project_members
    where project_run_id=run_row.id
      and membership_status in ('waiting','active')
      and project_role_id is null;
    if missing_responsibilities>0 then
      return jsonb_build_object(
        'started',false,
        'not_ready',true,
        'blockers',jsonb_build_array('responsibility_coverage'),
        'run_number',run_row.run_number,
        'filled',filled,
        'required_team_size',required_members
      );
    end if;

    select count(*)::integer into lead_count
    from public.project_members
    where project_run_id=run_row.id
      and membership_status in ('waiting','active')
      and team_role='project_lead';

    if lead_count=0 then
      return jsonb_build_object(
        'started',false,
        'not_ready',true,
        'blockers',jsonb_build_array('project_lead'),
        'run_number',run_row.run_number,
        'filled',filled,
        'required_team_size',required_members
      );
    end if;
    if lead_count>1 then
      return jsonb_build_object(
        'started',false,
        'not_ready',true,
        'blockers',jsonb_build_array('multiple_project_leads'),
        'run_number',run_row.run_number,
        'filled',filled,
        'required_team_size',required_members
      );
    end if;

    select user_id into lead_user_id
    from public.project_members
    where project_run_id=run_row.id
      and membership_status in ('waiting','active')
      and team_role='project_lead'
    limit 1;
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
      updated_at=now_at
  where id=run_row.id and status='forming' and has_started=false;

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
  set status='team_complete',updated_at=now_at
  where project_run_id=run_row.id
    and status in ('approved','waiting_for_team','accepted');

  if project_row.project_type='partner' then
    update public.projects
    set status='active',
        applications_open=false,
        kickoff_at=now_at,
        starts_at=now_at,
        updated_at=now_at
    where id=project_row.id;
  else
    update public.projects set updated_at=now_at where id=project_row.id;
  end if;

  event_type:=case
    when p_source='auto_scheduler' then 'project_auto_started'
    when p_source='admin_retry' then 'project_auto_start_retry_started'
    else 'project_manual_started'
  end;

  insert into public.project_activity_log(
    project_id,project_run_id,event_type,actor_type,actor_user_id,from_status,to_status,metadata
  ) values (
    project_row.id,
    run_row.id,
    event_type,
    case when p_source='auto_scheduler' then 'system' else 'user' end,
    p_actor_user_id,
    'forming',
    'active',
    jsonb_build_object(
      'run_number',run_row.run_number,
      'filled',filled,
      'required_team_size',required_members,
      'maximum_team_size',maximum_members,
      'participation_mode',project_row.participation_mode,
      'lead_user_id',lead_user_id,
      'responsibility_coverage_ready',missing_responsibilities=0,
      'lab_ready',lab_ready,
      'admission_mode',effective_admission,
      'activation_contract','phase9_atomic'
    )
  );

  return jsonb_build_object(
    'started',true,
    'run_number',run_row.run_number,
    'filled',filled,
    'required_team_size',required_members,
    'maximum_team_size',maximum_members,
    'lead_user_id',lead_user_id
  );
end;
$$;

revoke all on function public.phase9_activate_project_run(uuid,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.phase9_activate_project_run(uuid,uuid,text,uuid) to service_role;
