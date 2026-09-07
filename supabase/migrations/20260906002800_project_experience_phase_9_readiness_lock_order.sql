-- Phase 9 readiness lock-order hardening.
--
-- Canonical project-capacity ordering is:
--   project row -> Phase 9 capacity advisory lock -> run/Offer row.
-- The earlier readiness reconciler locked the run first, which could deadlock
-- against membership creation (project -> capacity -> run). Read the project id
-- as an unlocked hint, then acquire every lock in canonical order and verify the
-- run still belongs to that project before evaluating readiness.

create or replace function public.phase9_reconcile_run_participation(p_run_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  hinted_project_id uuid;
  run_row public.project_runs%rowtype;
  project_row public.projects%rowtype;
  filled integer:=0;
  required_members integer:=1;
  ready boolean:=false;
  now_at timestamptz:=now();
  due_at timestamptz;
  was_scheduled boolean:=false;
  effective_admission text;
begin
  select r.project_id into hinted_project_id
  from public.project_runs r
  where r.id=p_run_id;
  if hinted_project_id is null then
    return jsonb_build_object('state','missing');
  end if;

  select * into project_row
  from public.projects
  where id=hinted_project_id
  for update;
  if project_row.id is null then
    raise exception using errcode='P0002',message='PROJECT_NOT_FOUND';
  end if;

  perform public.phase9_lock_project_capacity(project_row.id);

  select * into run_row
  from public.project_runs
  where id=p_run_id and project_id=project_row.id
  for update;
  if run_row.id is null then
    raise exception using errcode='23514',message='PROJECT_RUN_PROJECT_CHANGED';
  end if;

  if coalesce(run_row.has_started,false)=true or run_row.status='active' then
    return jsonb_build_object('state','active','run_id',run_row.id);
  end if;

  required_members:=greatest(coalesce(run_row.required_team_size,run_row.team_size_threshold,1),1);
  select count(*)::integer into filled
  from public.project_members
  where project_run_id=run_row.id
    and membership_status in ('waiting','active');

  ready:=filled>=required_members;
  effective_admission:=public.effective_project_admission_mode(project_row.project_type,project_row.admission_mode);
  was_scheduled:=run_row.scheduled_start_at is not null;

  if not ready then
    if run_row.start_ready_at is not null
       or run_row.scheduled_start_at is not null
       or run_row.start_scheduled_at is not null then
      update public.project_runs
      set start_ready_at=null,
          scheduled_start_at=null,
          start_scheduled_at=null,
          auto_start_failure=null,
          updated_at=now_at
      where id=run_row.id and has_started=false;

      insert into public.project_activity_log(
        project_id,project_run_id,event_type,actor_type,from_status,to_status,metadata
      ) values (
        project_row.id,run_row.id,'participation_readiness_invalidated','system','forming','forming',
        jsonb_build_object(
          'filled',filled,
          'required_team_size',required_members,
          'scheduled_start_invalidated',was_scheduled
        )
      );
    end if;

    return jsonb_build_object(
      'state','forming',
      'ready',false,
      'filled',filled,
      'required_team_size',required_members,
      'scheduled_start_at',null
    );
  end if;

  if run_row.start_ready_at is null then
    update public.project_runs
    set start_ready_at=now_at,updated_at=now_at
    where id=run_row.id and has_started=false;

    insert into public.project_activity_log(
      project_id,project_run_id,event_type,actor_type,from_status,to_status,metadata
    ) values (
      project_row.id,run_row.id,'participation_minimum_reached','system','forming','forming',
      jsonb_build_object(
        'filled',filled,
        'required_team_size',required_members,
        'target_team_size',project_row.target_team_size
      )
    );
    run_row.start_ready_at:=now_at;
  end if;

  -- REVIEW_REQUIRED participation readiness never invokes the AUTO window.
  if effective_admission<>'auto' then
    return jsonb_build_object(
      'state','participation_ready',
      'ready',true,
      'filled',filled,
      'required_team_size',required_members,
      'scheduled_start_at',null
    );
  end if;

  -- Ordinary additional members do not reset an existing valid schedule.
  if run_row.scheduled_start_at is null
     and project_row.auto_start_paused_at is null
     and run_row.auto_start_paused_at is null then
    due_at:=coalesce(run_row.start_ready_at,now_at)+interval '6 hours';

    update public.project_runs
    set scheduled_start_at=due_at,
        start_scheduled_at=coalesce(start_scheduled_at,now_at),
        auto_start_failure=null,
        updated_at=now_at
    where id=run_row.id
      and has_started=false
      and scheduled_start_at is null
    returning * into run_row;

    insert into public.project_activity_log(
      project_id,project_run_id,event_type,actor_type,from_status,to_status,metadata
    ) values (
      project_row.id,run_row.id,'project_start_scheduled','system','forming','forming',
      jsonb_build_object(
        'scheduled_start_at',run_row.scheduled_start_at,
        'required_team_size',required_members,
        'filled',filled,
        'delay_minutes',360,
        'source','phase9_participation_threshold'
      )
    );
  else
    select * into run_row
    from public.project_runs
    where id=p_run_id and project_id=project_row.id;
  end if;

  return jsonb_build_object(
    'state','start_scheduled',
    'ready',true,
    'filled',filled,
    'required_team_size',required_members,
    'scheduled_start_at',run_row.scheduled_start_at
  );
end;
$$;

revoke all on function public.phase9_reconcile_run_participation(uuid) from public,anon,authenticated;
grant execute on function public.phase9_reconcile_run_participation(uuid) to service_role;
