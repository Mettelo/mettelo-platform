-- Admin Project Applications review + AUTO start recovery.
-- Adds an explicit canonical threshold timestamp while preserving the existing
-- Phase 9 start_ready_at compatibility field and six-hour schedule contract.

alter table public.project_runs
  add column if not exists threshold_reached_at timestamptz;

comment on column public.project_runs.threshold_reached_at is
  'Canonical timestamp when the current effective participation minimum first became satisfied. Cleared when minimum is lost; a later recovery begins a fresh six-hour AUTO eligibility window.';

update public.project_runs
set threshold_reached_at=coalesce(threshold_reached_at,start_ready_at,start_scheduled_at)
where threshold_reached_at is null
  and start_ready_at is not null
  and coalesce(has_started,false)=false;

create or replace function public.phase9_reconcile_run_participation(p_run_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
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
  select * into run_row from public.project_runs where id=p_run_id for update;
  if run_row.id is null then return jsonb_build_object('state','missing'); end if;
  if coalesce(run_row.has_started,false)=true or run_row.status='active' then
    return jsonb_build_object('state','active','run_id',run_row.id);
  end if;

  select * into project_row from public.projects where id=run_row.project_id for update;
  if project_row.id is null then raise exception using errcode='P0002',message='PROJECT_NOT_FOUND'; end if;
  perform public.phase9_lock_project_capacity(project_row.id);

  required_members:=greatest(coalesce(run_row.required_team_size,run_row.team_size_threshold,1),1);
  select count(*)::integer into filled
  from public.project_members
  where project_run_id=run_row.id and membership_status in ('waiting','active');

  ready:=filled>=required_members;
  effective_admission:=public.effective_project_admission_mode(project_row.project_type,project_row.admission_mode);
  was_scheduled:=run_row.scheduled_start_at is not null;

  if not ready then
    if run_row.threshold_reached_at is not null
       or run_row.start_ready_at is not null
       or run_row.scheduled_start_at is not null
       or run_row.start_scheduled_at is not null then
      update public.project_runs
      set threshold_reached_at=null,
          start_ready_at=null,
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
          'scheduled_start_invalidated',was_scheduled,
          'previous_threshold_reached_at',run_row.threshold_reached_at
        )
      );
    end if;
    return jsonb_build_object(
      'state','forming',
      'ready',false,
      'filled',filled,
      'required_team_size',required_members,
      'threshold_reached_at',null,
      'scheduled_start_at',null
    );
  end if;

  if run_row.threshold_reached_at is null then
    update public.project_runs
    set threshold_reached_at=now_at,
        start_ready_at=now_at,
        updated_at=now_at
    where id=run_row.id and has_started=false
    returning * into run_row;

    insert into public.project_activity_log(
      project_id,project_run_id,event_type,actor_type,from_status,to_status,metadata
    ) values (
      project_row.id,run_row.id,'participation_minimum_reached','system','forming','forming',
      jsonb_build_object(
        'filled',filled,
        'required_team_size',required_members,
        'target_team_size',project_row.target_team_size,
        'threshold_reached_at',run_row.threshold_reached_at
      )
    );
  else
    -- Preserve the original threshold timestamp when extra members join.
    if run_row.start_ready_at is null then
      update public.project_runs
      set start_ready_at=run_row.threshold_reached_at,updated_at=now_at
      where id=run_row.id and has_started=false;
    end if;
  end if;

  if effective_admission<>'auto' then
    return jsonb_build_object(
      'state','participation_ready',
      'ready',true,
      'filled',filled,
      'required_team_size',required_members,
      'threshold_reached_at',run_row.threshold_reached_at,
      'scheduled_start_at',null
    );
  end if;

  if run_row.scheduled_start_at is null
     and project_row.auto_start_paused_at is null
     and run_row.auto_start_paused_at is null then
    due_at:=coalesce(run_row.threshold_reached_at,run_row.start_ready_at,now_at)+interval '6 hours';
    update public.project_runs
    set scheduled_start_at=due_at,
        start_scheduled_at=coalesce(start_scheduled_at,now_at),
        auto_start_failure=null,
        updated_at=now_at
    where id=run_row.id and has_started=false and scheduled_start_at is null
    returning * into run_row;

    insert into public.project_activity_log(
      project_id,project_run_id,event_type,actor_type,from_status,to_status,metadata
    ) values (
      project_row.id,run_row.id,'project_start_scheduled','system','forming','forming',
      jsonb_build_object(
        'threshold_reached_at',run_row.threshold_reached_at,
        'scheduled_start_at',run_row.scheduled_start_at,
        'required_team_size',required_members,
        'filled',filled,
        'delay_minutes',360,
        'source','phase9_participation_threshold'
      )
    );
  else
    select * into run_row from public.project_runs where id=p_run_id;
  end if;

  return jsonb_build_object(
    'state',case when run_row.scheduled_start_at<=now_at then 'ready_to_start' else 'eligibility_window' end,
    'ready',true,
    'filled',filled,
    'required_team_size',required_members,
    'threshold_reached_at',run_row.threshold_reached_at,
    'scheduled_start_at',run_row.scheduled_start_at
  );
end;
$$;

revoke all on function public.phase9_reconcile_run_participation(uuid) from public,anon,authenticated;
grant execute on function public.phase9_reconcile_run_participation(uuid) to service_role;

create index if not exists project_runs_auto_threshold_idx
  on public.project_runs(threshold_reached_at,scheduled_start_at)
  where status='forming' and has_started=false;
