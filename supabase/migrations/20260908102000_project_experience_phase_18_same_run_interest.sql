-- Project Experience Phase 18: bind collaboration marketplace interest to the exact advertised run.
-- This extends the canonical project_applications -> admission -> project_members path.
-- It does not create a second collaboration application or membership system.

alter table public.project_applications
  add column if not exists collaboration_need_id uuid references public.project_collaboration_needs(id) on delete set null;

create index if not exists project_applications_collaboration_need_idx
  on public.project_applications(collaboration_need_id)
  where collaboration_need_id is not null;

comment on column public.project_applications.collaboration_need_id is
  'Optional Phase 18 collaboration opportunity context. When present, canonical admission is constrained to the collaboration need project_run_id.';

create or replace function public.phase18_guard_application_collaboration_context()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  need public.project_collaboration_needs%rowtype;
begin
  if new.collaboration_need_id is null then return new; end if;
  if new.application_kind <> 'interest' then
    raise exception using errcode='23514', message='COLLABORATION_CONTEXT_REQUIRES_INTEREST';
  end if;

  select * into need
  from public.project_collaboration_needs
  where id=new.collaboration_need_id;

  if need.id is null then
    raise exception using errcode='P0002', message='COLLABORATION_NEED_NOT_FOUND';
  end if;
  if need.project_id<>new.project_id then
    raise exception using errcode='23514', message='COLLABORATION_NEED_PROJECT_MISMATCH';
  end if;

  -- Snapshot the exact advertised run on the canonical application. Review and
  -- AUTO paths can therefore converge on the same run without trusting a client run id.
  new.project_run_id:=need.project_run_id;
  return new;
end;
$$;

revoke all on function public.phase18_guard_application_collaboration_context() from public,anon,authenticated;

drop trigger if exists project_application_phase18_collaboration_context on public.project_applications;
create trigger project_application_phase18_collaboration_context
before insert or update of collaboration_need_id,project_id,application_kind
on public.project_applications
for each row execute function public.phase18_guard_application_collaboration_context();

-- Supersede the Phase 6 late-joining implementation only where a Phase 18
-- collaboration context exists. Generic project interest retains the existing
-- selection behaviour. A contextual interest can never silently create or join
-- another run if its advertised run is no longer eligible.
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
  need public.project_collaboration_needs%rowtype;
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
  late_join boolean:=false;
  active_run_exists boolean:=false;
  active_run_recruitment_open boolean:=false;
  membership_state text:='waiting';
  contextual boolean:=false;
begin
  select * into app from public.project_applications where id=p_application_id for update;
  if app.id is null then raise exception using errcode='P0002', message='APPLICATION_NOT_FOUND'; end if;
  if app.application_kind<>'interest' then raise exception using errcode='23514', message='AUTO_ADMISSION_REQUIRES_INTEREST'; end if;

  select * into project from public.projects where id=app.project_id for update;
  if project.id is null then raise exception using errcode='P0002', message='PROJECT_NOT_FOUND'; end if;

  -- A collaboration need is an admission constraint, never an authorization token.
  if app.collaboration_need_id is not null then
    contextual:=true;
    select * into need
    from public.project_collaboration_needs
    where id=app.collaboration_need_id
    for update;
    if need.id is null or need.project_id<>project.id then
      raise exception using errcode='23514', message='COLLABORATION_NEED_INVALID';
    end if;
    if need.status<>'active' then
      raise exception using errcode='23514', message='COLLABORATION_NEED_CLOSED';
    end if;

    select * into run
    from public.project_runs
    where id=need.project_run_id and project_id=project.id
    for update;
    if run.id is null then raise exception using errcode='23514', message='COLLABORATION_RUN_NOT_FOUND'; end if;
    if run.status not in ('forming','active') or coalesce(run.recruitment_open,true)=false then
      raise exception using errcode='23514', message='COLLABORATION_RUN_CLOSED';
    end if;
    if run.status='active' then
      if coalesce(project.late_joining_enabled,true)=false
         or (project.late_joining_cutoff_at is not null and now_at>=project.late_joining_cutoff_at) then
        raise exception using errcode='23514', message='LATE_JOINING_CLOSED';
      end if;
      late_join:=true;
    end if;

    update public.project_applications
    set project_run_id=run.id,updated_at=now_at
    where id=app.id;
  end if;

  mode:=coalesce(project.admission_mode,'review_required');
  if mode<>'auto' then
    update public.project_applications
    set admission_mode_snapshot='review_required',admission_decision='review_required',admission_decided_at=now_at,updated_at=now_at
    where id=app.id;
    return jsonb_build_object('decision','review_required','application_id',app.id,'run_id',case when contextual then run.id else app.project_run_id end,'collaboration_need_id',app.collaboration_need_id);
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

  -- Keep the Phase 9 project-capacity lock authoritative for membership + Offer reservations.
  perform public.phase9_lock_project_capacity(project.id);

  select * into existing_member
  from public.project_members
  where project_id=project.id and user_id=app.user_id
  order by joined_at desc nulls last
  limit 1;
  if existing_member.id is not null then
    if (contextual and existing_member.project_run_id=run.id)
       or (not contextual and app.project_run_id=existing_member.project_run_id) then
      select * into run from public.project_runs where id=existing_member.project_run_id;
      return jsonb_build_object('decision','auto_qualified','already_admitted',true,'application_id',app.id,'run_id',run.id,'run_status',run.status,'scheduled_start_at',run.scheduled_start_at,'collaboration_need_id',app.collaboration_need_id);
    end if;
    raise exception using errcode='23514', message='ALREADY_PARTICIPATING';
  end if;

  -- Generic interest keeps the Phase 6 selection rules. Contextual interest has
  -- already locked its exact target run above and must never fall through here.
  if not contextual then
    select exists(
      select 1 from public.project_runs
      where project_id=project.id and status='active' and has_started=true
    ) into active_run_exists;

    select exists(
      select 1 from public.project_runs
      where project_id=project.id and status='active' and has_started=true and coalesce(recruitment_open,true)=true
    ) into active_run_recruitment_open;

    if coalesce(project.late_joining_enabled,true)
       and (project.late_joining_cutoff_at is null or now_at < project.late_joining_cutoff_at) then
      select * into run
      from public.project_runs
      where project_id=project.id
        and status='active'
        and has_started=true
        and coalesce(recruitment_open,true)=true
      order by run_number desc
      limit 1 for update;
      late_join:=run.id is not null;
    end if;

    if run.id is null and project.project_type='partner' then
      select * into run
      from public.project_runs
      where project_id=project.id and status='forming' and has_started=false
      order by run_number asc
      limit 1 for update;
    elsif run.id is null and team_join then
      select * into run
      from public.project_runs
      where project_id=project.id and status='forming' and has_started=false
      order by run_number asc
      limit 1 for update;
    end if;

    if run.id is null then
      if active_run_exists
         and (coalesce(project.late_joining_enabled,true)=false
              or (project.late_joining_cutoff_at is not null and now_at>=project.late_joining_cutoff_at)
              or active_run_recruitment_open=false) then
        raise exception using errcode='23514', message='LATE_JOINING_CLOSED';
      end if;

      select coalesce(max(run_number),0)+1 into next_run from public.project_runs where project_id=project.id;
      if project.project_type='partner' then next_run:=1; end if;
      insert into public.project_runs(project_id,run_number,status,team_size_threshold,required_team_size,has_started,recruitment_open)
      values(project.id,next_run,'forming',required_members,required_members,false,true)
      returning * into run;
      insert into public.project_activity_log(project_id,project_run_id,event_type,actor_type,from_status,to_status,metadata)
      values(project.id,run.id,'cohort_created','system',null,'forming',jsonb_build_object('source','phase6_auto_admission','run_number',run.run_number,'required_team_size',required_members,'participation_preference',preference));
    end if;
  end if;

  required_members:=greatest(coalesce(run.required_team_size,required_members),1);
  maximum_members:=greatest(coalesce(project.max_team_size,project.target_team_size,project.team_size_threshold,required_members),required_members);

  select count(*)::integer into occupied
  from public.project_members
  where project_run_id=run.id and membership_status in ('waiting','active');

  if occupied>=maximum_members then
    update public.project_runs
    set recruitment_open=false,recruitment_closed_at=coalesce(recruitment_closed_at,now_at),updated_at=now_at
    where id=run.id;
    if contextual then
      update public.project_collaboration_needs set status='closed',closed_at=coalesce(closed_at,now_at),updated_at=now_at where id=need.id and status='active';
    end if;
    raise exception using errcode='23514', message='CAPACITY_FULL';
  end if;

  membership_state:=case when run.has_started=true and run.status='active' then 'active' else 'waiting' end;
  insert into public.project_members(project_id,project_run_id,user_id,project_role_id,team_role,membership_status,activated_at)
  values(project.id,run.id,app.user_id,null,'contributor',membership_state,case when membership_state='active' then now_at else null end);

  occupied:=occupied+1;

  if membership_state='active' then
    update public.project_applications
    set project_run_id=run.id,status='team_complete',admission_mode_snapshot='auto',admission_decision='auto_qualified',
        participation_preference=preference,admission_decided_at=now_at,auto_qualified_at=coalesce(auto_qualified_at,now_at),
        approved_at=coalesce(approved_at,now_at),updated_at=now_at
    where id=app.id;

    if occupied>=maximum_members then
      update public.project_runs
      set recruitment_open=false,recruitment_closed_at=coalesce(recruitment_closed_at,now_at),updated_at=now_at
      where id=run.id;
      if contextual then
        update public.project_collaboration_needs set status='closed',closed_at=coalesce(closed_at,now_at),updated_at=now_at where id=need.id and status='active';
      end if;
    end if;

    insert into public.project_activity_log(project_id,project_run_id,event_type,actor_type,from_status,to_status,metadata)
    values(project.id,run.id,'late_member_joined','system','active','active',jsonb_build_object('application_id',app.id,'user_id',app.user_id,'filled',occupied,'maximum_team_size',maximum_members,'participation_preference',preference,'collaboration_need_id',app.collaboration_need_id));

    return jsonb_build_object('decision','auto_qualified','late_join',true,'application_id',app.id,'run_id',run.id,'run_number',run.run_number,'run_status','active','filled',occupied,'required_team_size',required_members,'maximum_team_size',maximum_members,'team_ready',true,'scheduled_start_at',null,'participation_preference',preference,'recruitment_open',occupied<maximum_members,'collaboration_need_id',app.collaboration_need_id);
  end if;

  if occupied>=required_members and run.scheduled_start_at is null and project.auto_start_paused_at is null then
    due_at:=now_at+make_interval(mins=>greatest(coalesce(project.auto_start_delay_minutes,360),0));
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
      admission_mode_snapshot='auto',admission_decision='auto_qualified',participation_preference=preference,
      admission_decided_at=now_at,auto_qualified_at=coalesce(auto_qualified_at,now_at),
      approved_at=case when occupied>=required_members then coalesce(approved_at,now_at) else approved_at end,
      updated_at=now_at
  where id=app.id;

  if contextual and occupied>=maximum_members then
    update public.project_collaboration_needs set status='closed',closed_at=coalesce(closed_at,now_at),updated_at=now_at where id=need.id and status='active';
  end if;

  insert into public.project_activity_log(project_id,project_run_id,event_type,actor_type,from_status,to_status,metadata)
  values(project.id,run.id,'interest_auto_qualified','system','submitted',case when occupied>=required_members then 'approved' else 'waiting_for_team' end,jsonb_build_object('application_id',app.id,'user_id',app.user_id,'participation_preference',preference,'filled',occupied,'required_team_size',required_members,'maximum_team_size',maximum_members,'scheduled_start_at',run.scheduled_start_at,'collaboration_need_id',app.collaboration_need_id));

  return jsonb_build_object('decision','auto_qualified','late_join',late_join,'application_id',app.id,'run_id',run.id,'run_number',run.run_number,'run_status',run.status,'filled',occupied,'required_team_size',required_members,'maximum_team_size',maximum_members,'team_ready',occupied>=required_members,'scheduled_start_at',run.scheduled_start_at,'participation_preference',preference,'recruitment_open',coalesce(run.recruitment_open,true),'collaboration_need_id',app.collaboration_need_id);
end;
$$;

revoke all on function public.phase6_auto_admit_interest(uuid,text) from public,anon,authenticated;
grant execute on function public.phase6_auto_admit_interest(uuid,text) to service_role;