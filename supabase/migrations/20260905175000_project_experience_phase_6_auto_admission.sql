-- Project Experience Phase 6: canonical admission policy + durable auto-admission scheduling.
-- Existing projects default safely to REVIEW_REQUIRED. AUTO is always an explicit
-- project configuration and is never inferred solely from project_type.

alter table public.projects
  add column if not exists admission_mode text not null default 'review_required',
  add column if not exists auto_start_delay_minutes integer not null default 120,
  add column if not exists auto_start_paused_at timestamptz;

alter table public.projects drop constraint if exists projects_admission_mode_check;
alter table public.projects add constraint projects_admission_mode_check
  check (admission_mode in ('auto','review_required'));

alter table public.projects drop constraint if exists projects_auto_start_delay_minutes_check;
alter table public.projects add constraint projects_auto_start_delay_minutes_check
  check (auto_start_delay_minutes between 0 and 10080);

alter table public.project_applications
  add column if not exists admission_mode_snapshot text,
  add column if not exists admission_decision text,
  add column if not exists participation_preference text,
  add column if not exists admission_decided_at timestamptz,
  add column if not exists auto_qualified_at timestamptz;

alter table public.project_applications drop constraint if exists project_applications_admission_mode_snapshot_check;
alter table public.project_applications add constraint project_applications_admission_mode_snapshot_check
  check (admission_mode_snapshot is null or admission_mode_snapshot in ('auto','review_required'));

alter table public.project_applications drop constraint if exists project_applications_admission_decision_check;
alter table public.project_applications add constraint project_applications_admission_decision_check
  check (admission_decision is null or admission_decision in ('auto_qualified','review_required','ineligible'));

alter table public.project_applications drop constraint if exists project_applications_participation_preference_check;
alter table public.project_applications add constraint project_applications_participation_preference_check
  check (participation_preference is null or participation_preference in ('solo','team','either'));

alter table public.project_runs
  add column if not exists scheduled_start_at timestamptz,
  add column if not exists start_scheduled_at timestamptz,
  add column if not exists auto_start_paused_at timestamptz,
  add column if not exists auto_start_failure text;

create index if not exists project_runs_due_auto_start_idx
  on public.project_runs(scheduled_start_at)
  where has_started=false and scheduled_start_at is not null;

comment on column public.projects.admission_mode is 'Canonical Phase 6 admission policy. AUTO bypasses routine human review only after authoritative server qualification; REVIEW_REQUIRED preserves governed review.';
comment on column public.projects.auto_start_delay_minutes is 'Delay after run start-readiness is reached before durable auto-start processing. Default 120 minutes.';
comment on column public.project_runs.scheduled_start_at is 'Authoritative durable start schedule. Never derived from browser timers.';

-- Service-only atomic transition from a canonical persisted interest into the AUTO
-- participation path. Per-project advisory locking serialises run selection,
-- membership creation, maximum capacity and minimum-readiness scheduling.
create or replace function public.phase6_auto_admit_interest(
  p_application_id uuid,
  p_participation_preference text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  app public.project_applications%rowtype;
  project public.projects%rowtype;
  run public.project_runs%rowtype;
  existing_member public.project_members%rowtype;
  mode text;
  preference text;
  required_members integer;
  maximum_members integer;
  occupied integer;
  next_run integer;
  now_at timestamptz:=now();
  due_at timestamptz;
  team_join boolean;
begin
  select * into app from public.project_applications where id=p_application_id for update;
  if app.id is null then raise exception using errcode='P0002', message='APPLICATION_NOT_FOUND'; end if;
  if app.application_kind<>'interest' then raise exception using errcode='23514', message='AUTO_ADMISSION_REQUIRES_INTEREST'; end if;

  select * into project from public.projects where id=app.project_id for update;
  if project.id is null then raise exception using errcode='P0002', message='PROJECT_NOT_FOUND'; end if;

  mode:=coalesce(project.admission_mode,'review_required');
  if mode<>'auto' then
    update public.project_applications
    set admission_mode_snapshot='review_required',admission_decision='review_required',admission_decided_at=now_at,updated_at=now_at
    where id=app.id;
    return jsonb_build_object('decision','review_required','application_id',app.id);
  end if;

  preference:=case
    when project.participation_mode='solo' then 'solo'
    when project.participation_mode='team' then 'team'
    when project.participation_mode='flexible' and p_participation_preference in ('solo','team','either') then p_participation_preference
    else null
  end;
  if preference is null then raise exception using errcode='23514', message='PARTICIPATION_PREFERENCE_REQUIRED'; end if;

  required_members:=case
    when project.participation_mode='solo' then 1
    when project.participation_mode='flexible' and preference in ('solo','either') then 1
    else greatest(coalesce(project.min_team_size,project.team_size_threshold,1),1)
  end;
  maximum_members:=greatest(coalesce(project.max_team_size,project.target_team_size,project.team_size_threshold,required_members),required_members);
  team_join:=project.participation_mode='team' or (project.participation_mode='flexible' and preference='team');

  perform pg_advisory_xact_lock(hashtextextended(project.id::text,6));

  select * into existing_member
  from public.project_members
  where project_id=project.id and user_id=app.user_id
  order by joined_at desc nulls last
  limit 1;
  if existing_member.id is not null then
    if app.project_run_id=existing_member.project_run_id then
      select * into run from public.project_runs where id=existing_member.project_run_id;
      return jsonb_build_object('decision','auto_qualified','already_admitted',true,'application_id',app.id,'run_id',run.id,'scheduled_start_at',run.scheduled_start_at);
    end if;
    raise exception using errcode='23514', message='ALREADY_PARTICIPATING';
  end if;

  if project.project_type='partner' then
    select * into run
    from public.project_runs
    where project_id=project.id and status not in ('completed','cancelled')
    order by run_number asc
    limit 1 for update;
  elsif team_join then
    select * into run
    from public.project_runs
    where project_id=project.id and status='forming' and has_started=false
    order by run_number asc
    limit 1 for update;
  end if;

  if run.id is null then
    select coalesce(max(run_number),0)+1 into next_run from public.project_runs where project_id=project.id;
    if project.project_type='partner' then next_run:=1; end if;
    insert into public.project_runs(project_id,run_number,status,team_size_threshold,required_team_size,has_started)
    values(project.id,next_run,'forming',required_members,required_members,false)
    returning * into run;
    insert into public.project_activity_log(project_id,project_run_id,event_type,actor_type,from_status,to_status,metadata)
    values(project.id,run.id,'cohort_created','system',null,'forming',jsonb_build_object('source','phase6_auto_admission','run_number',run.run_number,'required_team_size',required_members,'participation_preference',preference));
  end if;

  -- The first AUTO team member establishes the run minimum. Existing team-forming
  -- runs retain their canonical threshold; target size never blocks start.
  required_members:=greatest(coalesce(run.required_team_size,required_members),1);
  maximum_members:=greatest(maximum_members,required_members);

  select count(*)::integer into occupied
  from public.project_members
  where project_run_id=run.id and membership_status in ('waiting','active');
  if occupied>=maximum_members then raise exception using errcode='23514', message='CAPACITY_FULL'; end if;

  insert into public.project_members(project_id,project_run_id,user_id,project_role_id,team_role,membership_status)
  values(project.id,run.id,app.user_id,null,'contributor','waiting');

  occupied:=occupied+1;
  if occupied>=required_members and run.scheduled_start_at is null and project.auto_start_paused_at is null then
    due_at:=now_at+make_interval(mins=>greatest(coalesce(project.auto_start_delay_minutes,120),0));
    update public.project_runs
    set scheduled_start_at=due_at,start_scheduled_at=now_at,auto_start_failure=null,updated_at=now_at
    where id=run.id and has_started=false and scheduled_start_at is null
    returning * into run;
    insert into public.project_activity_log(project_id,project_run_id,event_type,actor_type,from_status,to_status,metadata)
    values(project.id,run.id,'project_start_scheduled','system','forming','forming',jsonb_build_object('scheduled_start_at',run.scheduled_start_at,'required_team_size',required_members,'filled',occupied,'delay_minutes',project.auto_start_delay_minutes));
  else
    select * into run from public.project_runs where id=run.id;
  end if;

  update public.project_applications
  set project_run_id=run.id,
      status=case when occupied>=required_members then 'approved' else 'waiting_for_team' end,
      admission_mode_snapshot='auto',
      admission_decision='auto_qualified',
      participation_preference=preference,
      admission_decided_at=now_at,
      auto_qualified_at=coalesce(auto_qualified_at,now_at),
      approved_at=case when occupied>=required_members then coalesce(approved_at,now_at) else approved_at end,
      updated_at=now_at
  where id=app.id;

  insert into public.project_activity_log(project_id,project_run_id,event_type,actor_type,from_status,to_status,metadata)
  values(project.id,run.id,'interest_auto_qualified','system','submitted',case when occupied>=required_members then 'approved' else 'waiting_for_team' end,jsonb_build_object('application_id',app.id,'user_id',app.user_id,'participation_preference',preference,'filled',occupied,'required_team_size',required_members,'maximum_team_size',maximum_members,'scheduled_start_at',run.scheduled_start_at));

  return jsonb_build_object(
    'decision','auto_qualified',
    'application_id',app.id,
    'run_id',run.id,
    'run_number',run.run_number,
    'filled',occupied,
    'required_team_size',required_members,
    'maximum_team_size',maximum_members,
    'team_ready',occupied>=required_members,
    'scheduled_start_at',run.scheduled_start_at,
    'participation_preference',preference
  );
end;
$$;

revoke all on function public.phase6_auto_admit_interest(uuid,text) from public,anon,authenticated;
grant execute on function public.phase6_auto_admit_interest(uuid,text) to service_role;
