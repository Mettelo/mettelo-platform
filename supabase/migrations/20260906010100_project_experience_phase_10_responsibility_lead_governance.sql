-- Project Experience Phase 10: explicit responsibility and Project Lead governance.
--
-- Team formation responsibilities are canonical project_members attributes.
-- No project_teams_v2 or parallel allocation table is introduced.

create or replace function public.phase10_assign_member_responsibility(
  p_membership_id uuid,
  p_project_role_id uuid default null,
  p_make_project_lead boolean default false,
  p_actor_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  member_row public.project_members%rowtype;
  project_row public.projects%rowtype;
  run_row public.project_runs%rowtype;
  role_project_id uuid;
  current_lead public.project_members%rowtype;
  next_team_role text;
begin
  select project_id into member_row.project_id
  from public.project_members
  where id=p_membership_id;
  if member_row.project_id is null then
    raise exception using errcode='P0002',message='MEMBERSHIP_NOT_FOUND';
  end if;

  select * into project_row
  from public.projects
  where id=member_row.project_id
  for update;
  if project_row.id is null then
    raise exception using errcode='P0002',message='PROJECT_NOT_FOUND';
  end if;

  perform public.phase9_lock_project_capacity(project_row.id);

  select * into member_row
  from public.project_members
  where id=p_membership_id and project_id=project_row.id
  for update;
  if member_row.id is null then
    raise exception using errcode='P0002',message='MEMBERSHIP_NOT_FOUND';
  end if;
  if member_row.membership_status<>'waiting' then
    raise exception using errcode='23514',message='FORMATION_ASSIGNMENT_REQUIRES_WAITING_MEMBER';
  end if;
  if member_row.project_run_id is null then
    raise exception using errcode='23514',message='FORMATION_ASSIGNMENT_REQUIRES_RUN';
  end if;

  select * into run_row
  from public.project_runs
  where id=member_row.project_run_id and project_id=project_row.id
  for update;
  if run_row.id is null then
    raise exception using errcode='23514',message='MEMBERSHIP_RUN_PROJECT_MISMATCH';
  end if;
  if run_row.status<>'forming' or coalesce(run_row.has_started,false)=true then
    raise exception using errcode='23514',message='FORMATION_ASSIGNMENT_REQUIRES_FORMING_RUN';
  end if;

  if p_project_role_id is not null then
    select project_id into role_project_id
    from public.project_roles
    where id=p_project_role_id;
    if role_project_id is null then
      raise exception using errcode='P0002',message='PROJECT_ROLE_NOT_FOUND';
    end if;
    if role_project_id<>project_row.id then
      raise exception using errcode='23514',message='PROJECT_ROLE_PROJECT_MISMATCH';
    end if;
  end if;

  -- Responsibility edits do not implicitly demote an existing Project Lead.
  next_team_role:=coalesce(member_row.team_role,'contributor');

  if p_make_project_lead then
    if greatest(coalesce(run_row.required_team_size,run_row.team_size_threshold,1),1)<=1 then
      raise exception using errcode='23514',message='PROJECT_LEAD_NOT_REQUIRED_FOR_INDEPENDENT_RUN';
    end if;

    select * into current_lead
    from public.project_members
    where project_run_id=run_row.id
      and membership_status in ('waiting','active')
      and team_role='project_lead'
      and id<>member_row.id
    order by joined_at asc nulls last,id asc
    limit 1
    for update;

    if current_lead.id is not null then
      raise exception using errcode='23514',message='PROJECT_LEAD_ALREADY_ASSIGNED';
    end if;
    next_team_role:='project_lead';
  end if;

  update public.project_members
  set project_role_id=p_project_role_id,
      team_role=next_team_role
  where id=member_row.id;

  insert into public.project_activity_log(
    project_id,project_run_id,event_type,actor_type,actor_user_id,from_status,to_status,metadata
  ) values (
    project_row.id,
    run_row.id,
    'formation_responsibility_assigned',
    case when p_actor_user_id is null then 'system' else 'user' end,
    p_actor_user_id,
    'forming',
    'forming',
    jsonb_build_object(
      'membership_id',member_row.id,
      'user_id',member_row.user_id,
      'project_role_id',p_project_role_id,
      'team_role',next_team_role,
      'required_team_size',greatest(coalesce(run_row.required_team_size,run_row.team_size_threshold,1),1)
    )
  );

  return jsonb_build_object(
    'membership_id',member_row.id,
    'run_id',run_row.id,
    'project_role_id',p_project_role_id,
    'team_role',next_team_role,
    'project_active',false
  );
end;
$$;

revoke all on function public.phase10_assign_member_responsibility(uuid,uuid,boolean,uuid) from public,anon,authenticated;
grant execute on function public.phase10_assign_member_responsibility(uuid,uuid,boolean,uuid) to service_role;

create or replace function public.phase10_validate_member_formation_assignment()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  role_project_id uuid;
  lead_count integer:=0;
  run_project_id uuid;
begin
  if new.project_role_id is not null then
    select project_id into role_project_id
    from public.project_roles
    where id=new.project_role_id;
    if role_project_id is null then
      raise exception using errcode='P0002',message='PROJECT_ROLE_NOT_FOUND';
    end if;
    if role_project_id<>new.project_id then
      raise exception using errcode='23514',message='PROJECT_ROLE_PROJECT_MISMATCH';
    end if;
  end if;

  if new.team_role='project_lead' and new.membership_status in ('waiting','active') then
    if new.project_run_id is null then
      raise exception using errcode='23514',message='PROJECT_LEAD_REQUIRES_RUN';
    end if;

    select project_id into run_project_id
    from public.project_runs
    where id=new.project_run_id
    for update;
    if run_project_id is null or run_project_id<>new.project_id then
      raise exception using errcode='23514',message='MEMBERSHIP_RUN_PROJECT_MISMATCH';
    end if;

    select count(*)::integer into lead_count
    from public.project_members
    where project_run_id=new.project_run_id
      and membership_status in ('waiting','active')
      and team_role='project_lead'
      and id<>new.id;
    if lead_count>0 then
      raise exception using errcode='23514',message='PROJECT_LEAD_ALREADY_ASSIGNED';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.phase10_validate_member_formation_assignment() from public,anon,authenticated;

drop trigger if exists project_member_phase10_formation_assignment_guard on public.project_members;
create trigger project_member_phase10_formation_assignment_guard
before insert or update of project_role_id,team_role,project_run_id,membership_status
on public.project_members
for each row execute function public.phase10_validate_member_formation_assignment();

comment on function public.phase10_assign_member_responsibility(uuid,uuid,boolean,uuid) is
  'Service-only pre-start Phase 10 responsibility/lead assignment. It never activates a run and rejects roles from another project or a second live Project Lead.';
