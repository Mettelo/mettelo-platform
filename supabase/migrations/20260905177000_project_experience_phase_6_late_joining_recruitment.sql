-- Project Experience Phase 6: late joining, recruitment and safe sharing hooks.
-- Phase 18 owns the eventual invitation transport/acceptance system. These fields
-- only establish canonical policy so Phase 6 can enforce same-run late joining
-- and expose safe public sharing without inventing a second membership path.

alter table public.projects
  add column if not exists late_joining_enabled boolean not null default true,
  add column if not exists late_joining_cutoff_at timestamptz,
  add column if not exists project_sharing_enabled boolean not null default true,
  add column if not exists member_invites_enabled boolean not null default false;

alter table public.project_runs
  add column if not exists recruitment_open boolean not null default true,
  add column if not exists recruitment_closed_at timestamptz;

comment on column public.projects.late_joining_enabled is
  'Whether an eligible AUTO interest may join the existing active run while capacity remains.';
comment on column public.projects.late_joining_cutoff_at is
  'Optional authoritative cutoff after which new late-joining admissions are rejected.';
comment on column public.projects.project_sharing_enabled is
  'Allows members to share the canonical public project URL. A share is never an authorization token.';
comment on column public.projects.member_invites_enabled is
  'Policy hook for the later canonical invitation system. Phase 6 does not silently create membership from an invite.';
comment on column public.project_runs.recruitment_open is
  'Run-level recruitment state. Active late joining targets the same run until this closes or maximum capacity is reached.';

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
  late_join boolean:=false;
  active_run_exists boolean:=false;
  active_run_recruitment_open boolean:=false;
  membership_state text:='waiting';
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
      return jsonb_build_object('decision','auto_qualified','already_admitted',true,'application_id',app.id,'run_id',run.id,'run_status',run.status,'scheduled_start_at',run.scheduled_start_at);
    end if;
    raise exception using errcode='23514', message='ALREADY_PARTICIPATING';
  end if;

  -- Late joining has priority over creating another cohort for every governed
  -- project type. A started run can only be selected when project policy, cutoff
  -- and run-level recruitment state all permit the join.
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

  -- Partner projects keep their single canonical forming run, but an active run is
  -- never selected here because active joining is governed exclusively above.
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
    -- If an active run exists but late joining is no longer permitted, do not
    -- silently create a competing run from the same intake action. This includes
    -- project-level policy/cutoff closure and run-level recruitment closure.
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

  required_members:=greatest(coalesce(run.required_team_size,required_members),1);
  maximum_members:=greatest(coalesce(project.max_team_size,project.target_team_size,project.team_size_threshold,required_members),required_members);

  select count(*)::integer into occupied
  from public.project_members
  where project_run_id=run.id and membership_status in ('waiting','active');

  if occupied>=maximum_members then
    update public.project_runs
    set recruitment_open=false,recruitment_closed_at=coalesce(recruitment_closed_at,now_at),updated_at=now_at
    where id=run.id;
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
    end if;

    insert into public.project_activity_log(project_id,project_run_id,event_type,actor_type,from_status,to_status,metadata)
    values(project.id,run.id,'late_member_joined','system','active','active',jsonb_build_object('application_id',app.id,'user_id',app.user_id,'filled',occupied,'maximum_team_size',maximum_members,'participation_preference',preference));

    return jsonb_build_object('decision','auto_qualified','late_join',true,'application_id',app.id,'run_id',run.id,'run_number',run.run_number,'run_status','active','filled',occupied,'required_team_size',required_members,'maximum_team_size',maximum_members,'team_ready',true,'scheduled_start_at',null,'participation_preference',preference,'recruitment_open',occupied<maximum_members);
  end if;

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
      admission_mode_snapshot='auto',admission_decision='auto_qualified',participation_preference=preference,
      admission_decided_at=now_at,auto_qualified_at=coalesce(auto_qualified_at,now_at),
      approved_at=case when occupied>=required_members then coalesce(approved_at,now_at) else approved_at end,
      updated_at=now_at
  where id=app.id;

  insert into public.project_activity_log(project_id,project_run_id,event_type,actor_type,from_status,to_status,metadata)
  values(project.id,run.id,'interest_auto_qualified','system','submitted',case when occupied>=required_members then 'approved' else 'waiting_for_team' end,jsonb_build_object('application_id',app.id,'user_id',app.user_id,'participation_preference',preference,'filled',occupied,'required_team_size',required_members,'maximum_team_size',maximum_members,'scheduled_start_at',run.scheduled_start_at));

  return jsonb_build_object('decision','auto_qualified','late_join',false,'application_id',app.id,'run_id',run.id,'run_number',run.run_number,'run_status',run.status,'filled',occupied,'required_team_size',required_members,'maximum_team_size',maximum_members,'team_ready',occupied>=required_members,'scheduled_start_at',run.scheduled_start_at,'participation_preference',preference,'recruitment_open',true);
end;
$$;

revoke all on function public.phase6_auto_admit_interest(uuid,text) from public,anon,authenticated;
grant execute on function public.phase6_auto_admit_interest(uuid,text) to service_role;
