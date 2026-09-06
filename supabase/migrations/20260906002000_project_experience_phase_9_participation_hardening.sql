-- Project Experience Phase 9: participation/capacity/readiness hardening.
--
-- This migration deliberately supersedes earlier Phase 3/6/8 runtime assumptions
-- without rewriting their migration history. It keeps one canonical project/run,
-- application, Offer and membership architecture.

-- -----------------------------------------------------------------------------
-- 1. Canonical project configuration
-- -----------------------------------------------------------------------------
-- FLEXIBLE keeps a collaborative team minimum. SOLO/EITHER preference resolves to
-- one at run time; TEAM preference uses min_team_size. SOLO remains 1/1/1.
alter table public.projects drop constraint if exists projects_participation_capacity_check;
alter table public.projects add constraint projects_participation_capacity_check
check (
  min_team_size between 1 and 50
  and target_team_size between 1 and 50
  and max_team_size between 1 and 50
  and min_team_size <= target_team_size
  and target_team_size <= max_team_size
  and (
    (participation_mode='solo' and min_team_size=1 and target_team_size=1 and max_team_size=1)
    or (participation_mode='team' and min_team_size>=2)
    or participation_mode='flexible'
  )
);

-- Six hours is the Phase 9 AUTO intervention contract. Existing AUTO Open
-- configuration is normalized before the stricter invariant is added.
update public.projects
set auto_start_delay_minutes=360,
    updated_at=now()
where admission_mode='auto'
  and coalesce(auto_start_delay_minutes,360)<>360;

alter table public.projects alter column auto_start_delay_minutes set default 360;
alter table public.projects drop constraint if exists projects_phase9_auto_start_window_check;
alter table public.projects add constraint projects_phase9_auto_start_window_check
check (admission_mode<>'auto' or auto_start_delay_minutes=360);

comment on column public.projects.auto_start_delay_minutes is
  'AUTO Open Project intervention window in minutes. Phase 9 requires exactly 360 minutes after participation readiness is first reached.';
comment on column public.projects.min_team_size is
  'Collaborative minimum. TEAM always uses it; FLEXIBLE uses it when participation preference is TEAM, while SOLO/EITHER may use effective threshold 1.';

-- The Phase 3 publication-readiness view treated FLEXIBLE as min=1. Preserve the
-- same view contract but accept a real collaborative minimum for FLEXIBLE.
create or replace view public.project_experience_readiness
with (security_invoker=true)
as
with assessed as (
  select
    p.id as project_id,
    p.slug,
    p.title,
    array_remove(array[
      case when nullif(btrim(coalesce(p.title,'')),'') is null then 'title' end,
      case when nullif(btrim(coalesce(p.summary,'')),'') is null then 'summary' end,
      case when nullif(btrim(coalesce(p.problem_statement,'')),'') is null then 'problem_statement' end,
      case when pb.project_id is null or nullif(btrim(coalesce(pb.context,'')),'') is null then 'business_context' end,
      case when pb.project_id is null or nullif(btrim(coalesce(pb.stakeholder,'')),'') is null then 'stakeholder' end,
      case when pb.project_id is null or nullif(btrim(coalesce(pb.expected_outcome,'')),'') is null then 'expected_outcome' end,
      case when p.participation_mode not in ('solo','team','flexible') then 'participation_mode' end,
      case when p.min_team_size is null or p.target_team_size is null or p.max_team_size is null
             or p.min_team_size < 1 or p.max_team_size > 50
             or p.min_team_size > p.target_team_size or p.target_team_size > p.max_team_size
             or (p.participation_mode='solo' and (p.min_team_size<>1 or p.target_team_size<>1 or p.max_team_size<>1))
             or (p.participation_mode='team' and p.min_team_size<2)
        then 'participation_capacity' end,
      case when p.team_size_threshold is distinct from p.min_team_size then 'formation_threshold_alignment' end,
      case when not exists(select 1 from public.project_roles r where r.project_id=p.id and coalesce(r.role_status,'open') in ('open','limited')) then 'roles' end,
      case when not exists(select 1 from public.project_deliverables d where d.project_id=p.id and d.project_run_id is null and d.is_required) then 'deliverables' end,
      case when not exists(select 1 from public.project_success_criteria sc where sc.project_id=p.id and sc.is_required) then 'success_criteria' end
    ],null)::text[] as critical_missing,
    array_remove(array[
      case when pb.project_id is null or nullif(btrim(coalesce(pb.primary_use_case,'')),'') is null then 'primary_use_case' end,
      case when pb.project_id is null or nullif(btrim(coalesce(pb.primary_objective,'')),'') is null then 'primary_objective' end,
      case when not exists(select 1 from public.project_milestones m where m.project_id=p.id and m.project_run_id is null) then 'timeline' end,
      case when not exists(select 1 from public.project_capabilities pc where pc.project_id=p.id) then 'capabilities' end,
      case when not exists(select 1 from public.project_capabilities pc where pc.project_id=p.id and pc.evidence_expected) then 'evidence_expectations' end
    ],null)::text[] as quality_gaps,
    coalesce((
      select array_agg(concat('resource:',ds.id::text,':',coalesce(nullif(btrim(ds.name),''),'unnamed'),':',ds.governance_status) order by ds.created_at,ds.id)
      from public.project_data_sources ds
      where ds.project_id=p.id and ds.project_run_id is null and ds.governance_status in ('unreviewed','verification_required','amber')
    ),'{}'::text[]) as verification_required,
    coalesce((
      select array_agg(concat('resource:',ds.id::text,':',coalesce(nullif(btrim(ds.name),''),'unnamed'),':red') order by ds.created_at,ds.id)
      from public.project_data_sources ds
      where ds.project_id=p.id and ds.project_run_id is null and ds.governance_status='red'
    ),'{}'::text[]) as red_resource_blockers,
    array_remove(array[
      case when pb.project_id is null then 'project_brief' end,
      case when not exists(select 1 from public.project_deliverables d where d.project_id=p.id and d.project_run_id is null and d.is_required) then 'deliverables' end,
      case when not exists(select 1 from public.project_success_criteria sc where sc.project_id=p.id and sc.is_required) then 'success_criteria' end,
      case when not exists(select 1 from public.project_milestones m where m.project_id=p.id and m.project_run_id is null) then 'timeline' end
    ],null)::text[] as lab_missing
  from public.projects p
  left join public.project_problem_briefs pb on pb.project_id=p.id
), readiness as (
  select *,critical_missing||quality_gaps as definition_blockers,
    cardinality(verification_required)=0 and cardinality(red_resource_blockers)=0 as resources_clear
  from assessed
)
select
  project_id,slug,title,
  cardinality(definition_blockers)=0 as experience_ready,
  definition_blockers as missing_requirements,
  critical_missing,quality_gaps,verification_required,red_resource_blockers,
  definition_blockers||verification_required||red_resource_blockers as publication_blockers,
  lab_missing,
  cardinality(definition_blockers)=0 as public_detail_ready,
  cardinality(definition_blockers)=0 as application_ready,
  resources_clear as resource_governance_ready,
  cardinality(definition_blockers)=0 and resources_clear as publication_ready,
  cardinality(lab_missing)=0 and resources_clear as lab_ready
from readiness;

grant select on public.project_experience_readiness to authenticated;
grant select on public.project_experience_readiness to service_role;

-- -----------------------------------------------------------------------------
-- 2. One project-capacity lock and effective threshold contract
-- -----------------------------------------------------------------------------
create or replace function public.phase9_lock_project_capacity(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if p_project_id is null then
    raise exception using errcode='23514',message='PROJECT_ID_REQUIRED';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_project_id::text,9));
end;
$$;
revoke all on function public.phase9_lock_project_capacity(uuid) from public,anon,authenticated;

create or replace function public.phase9_effective_participation_threshold(
  p_mode text,
  p_preference text,
  p_minimum integer
)
returns integer
language sql
immutable
as $$
  select case
    when p_mode='solo' then 1
    when p_mode='flexible' and p_preference in ('solo','either') then 1
    else greatest(coalesce(p_minimum,1),1)
  end
$$;
revoke all on function public.phase9_effective_participation_threshold(text,text,integer) from public,anon,authenticated;
grant execute on function public.phase9_effective_participation_threshold(text,text,integer) to service_role;

-- Undo the first Phase 9 migration's temporary FLEXIBLE=1 alignment for any
-- still-forming Flexible run that is demonstrably Team-preferring.
update public.project_runs r
set required_team_size=greatest(p.min_team_size,1),
    team_size_threshold=greatest(p.min_team_size,1),
    updated_at=now()
from public.projects p
where p.id=r.project_id
  and p.participation_mode='flexible'
  and coalesce(r.has_started,false)=false
  and exists(
    select 1 from public.project_applications a
    where a.project_run_id=r.id and a.participation_preference='team'
  );

create or replace function public.phase9_sync_run_participation_contract()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  project_row public.projects%rowtype;
  canonical_required integer;
begin
  select * into project_row from public.projects where id=new.project_id;
  if project_row.id is null then raise exception using errcode='P0002',message='PROJECT_NOT_FOUND'; end if;

  canonical_required:=case
    when project_row.participation_mode='solo' then 1
    when project_row.participation_mode='team' then greatest(project_row.min_team_size,1)
    when project_row.participation_mode='flexible' and coalesce(new.required_team_size,new.team_size_threshold,1)>1
      then greatest(project_row.min_team_size,1)
    else 1
  end;

  if tg_op='INSERT' or coalesce(new.has_started,false)=false then
    new.required_team_size:=canonical_required;
    new.team_size_threshold:=canonical_required;
  end if;
  return new;
end;
$$;
revoke all on function public.phase9_sync_run_participation_contract() from public,anon,authenticated;

-- -----------------------------------------------------------------------------
-- 3. Capacity = occupied membership + live unconsumed Offer reservations
-- -----------------------------------------------------------------------------
create or replace function public.phase9_validate_membership_capacity()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  project_row public.projects%rowtype;
  run_row public.project_runs%rowtype;
  maximum_members integer;
  occupied integer:=0;
  reserved integer:=0;
  consumes_offer boolean:=false;
  exclude_member_id uuid:=null;
begin
  if new.membership_status not in ('waiting','active') then return new; end if;
  if new.project_run_id is null then raise exception using errcode='23514',message='ACTIVE_MEMBERSHIP_REQUIRES_RUN'; end if;
  if tg_op='UPDATE' then exclude_member_id:=old.id; end if;

  select * into project_row from public.projects where id=new.project_id for update;
  if project_row.id is null then raise exception using errcode='P0002',message='PROJECT_NOT_FOUND'; end if;
  perform public.phase9_lock_project_capacity(new.project_id);

  select * into run_row from public.project_runs
  where id=new.project_run_id and project_id=new.project_id for update;
  if run_row.id is null then raise exception using errcode='23514',message='MEMBERSHIP_RUN_PROJECT_MISMATCH'; end if;

  maximum_members:=case when project_row.participation_mode='solo' then 1
    else greatest(coalesce(project_row.max_team_size,project_row.target_team_size,project_row.min_team_size,project_row.team_size_threshold,1),1) end;

  select count(*)::integer into occupied
  from public.project_members m
  where m.project_id=new.project_id
    and m.membership_status in ('waiting','active')
    and (exclude_member_id is null or m.id<>exclude_member_id);

  select count(*)::integer into reserved
  from public.project_offers o
  where o.project_id=new.project_id
    and o.status in ('pending','accepted')
    and o.capacity_released_at is null
    and o.capacity_consumed_at is null;

  select exists(
    select 1 from public.project_offers o
    where o.project_id=new.project_id and o.user_id=new.user_id
      and o.status='accepted' and o.capacity_released_at is null and o.capacity_consumed_at is null
  ) into consumes_offer;
  if consumes_offer then reserved:=greatest(reserved-1,0); end if;

  if occupied+reserved>=maximum_members then
    raise exception using errcode='23514',message='PARTICIPATION_CAPACITY_FULL';
  end if;
  return new;
end;
$$;
revoke all on function public.phase9_validate_membership_capacity() from public,anon,authenticated;

create or replace function public.phase9_guard_offer_capacity()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  project_row public.projects%rowtype;
  maximum_members integer;
  occupied integer:=0;
  reserved integer:=0;
begin
  if new.status not in ('pending','accepted') or new.capacity_released_at is not null or new.capacity_consumed_at is not null then return new; end if;
  select * into project_row from public.projects where id=new.project_id for update;
  if project_row.id is null then raise exception using errcode='P0002',message='PROJECT_NOT_FOUND'; end if;
  perform public.phase9_lock_project_capacity(new.project_id);

  maximum_members:=case when project_row.participation_mode='solo' then 1
    else greatest(coalesce(project_row.max_team_size,project_row.target_team_size,project_row.min_team_size,project_row.team_size_threshold,1),1) end;
  select count(*)::integer into occupied from public.project_members
    where project_id=new.project_id and membership_status in ('waiting','active');
  select count(*)::integer into reserved from public.project_offers
    where project_id=new.project_id and status in ('pending','accepted')
      and capacity_released_at is null and capacity_consumed_at is null
      and (tg_op='INSERT' or id<>new.id);

  if occupied+reserved>=maximum_members then
    raise exception using errcode='23514',message='OFFER_CAPACITY_FULL';
  end if;
  return new;
end;
$$;
revoke all on function public.phase9_guard_offer_capacity() from public,anon,authenticated;

drop trigger if exists project_offer_phase9_capacity_guard on public.project_offers;
create trigger project_offer_phase9_capacity_guard
before insert or update of status,capacity_released_at,capacity_consumed_at,project_id
on public.project_offers
for each row execute function public.phase9_guard_offer_capacity();

-- Capacity changes may not configure maximum below live canonical usage.
create or replace function public.phase9_validate_project_capacity_change()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  occupied integer:=0;
  reserved integer:=0;
begin
  if new.max_team_size is not distinct from old.max_team_size
     and new.participation_mode is not distinct from old.participation_mode then return new; end if;
  perform public.phase9_lock_project_capacity(new.id);
  select count(*)::integer into occupied from public.project_members
    where project_id=new.id and membership_status in ('waiting','active');
  select count(*)::integer into reserved from public.project_offers
    where project_id=new.id and status in ('pending','accepted')
      and capacity_released_at is null and capacity_consumed_at is null;
  if occupied+reserved>new.max_team_size then
    raise exception using errcode='23514',message='MAXIMUM_BELOW_CURRENT_CAPACITY';
  end if;
  return new;
end;
$$;
revoke all on function public.phase9_validate_project_capacity_change() from public,anon,authenticated;

drop trigger if exists project_phase9_capacity_change_guard on public.projects;
create trigger project_phase9_capacity_change_guard
before update of participation_mode,max_team_size on public.projects
for each row execute function public.phase9_validate_project_capacity_change();

-- -----------------------------------------------------------------------------
-- 4. Participation readiness and exact six-hour AUTO scheduling
-- -----------------------------------------------------------------------------
alter table public.project_runs add column if not exists start_ready_at timestamptz;

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
  select count(*)::integer into filled from public.project_members
    where project_run_id=run_row.id and membership_status in ('waiting','active');
  ready:=filled>=required_members;
  effective_admission:=public.effective_project_admission_mode(project_row.project_type,project_row.admission_mode);
  was_scheduled:=run_row.scheduled_start_at is not null;

  if not ready then
    if run_row.start_ready_at is not null or run_row.scheduled_start_at is not null or run_row.start_scheduled_at is not null then
      update public.project_runs
      set start_ready_at=null,scheduled_start_at=null,start_scheduled_at=null,
          auto_start_failure=null,updated_at=now_at
      where id=run_row.id and has_started=false;
      insert into public.project_activity_log(project_id,project_run_id,event_type,actor_type,from_status,to_status,metadata)
      values(project_row.id,run_row.id,'participation_readiness_invalidated','system','forming','forming',
        jsonb_build_object('filled',filled,'required_team_size',required_members,'scheduled_start_invalidated',was_scheduled));
    end if;
    return jsonb_build_object('state','forming','ready',false,'filled',filled,'required_team_size',required_members,'scheduled_start_at',null);
  end if;

  if run_row.start_ready_at is null then
    update public.project_runs set start_ready_at=now_at,updated_at=now_at where id=run_row.id and has_started=false;
    insert into public.project_activity_log(project_id,project_run_id,event_type,actor_type,from_status,to_status,metadata)
    values(project_row.id,run_row.id,'participation_minimum_reached','system','forming','forming',
      jsonb_build_object('filled',filled,'required_team_size',required_members,'target_team_size',project_row.target_team_size));
    run_row.start_ready_at:=now_at;
  end if;

  -- REVIEW_REQUIRED participation readiness never invokes the AUTO window.
  if effective_admission<>'auto' then
    return jsonb_build_object('state','participation_ready','ready',true,'filled',filled,'required_team_size',required_members,'scheduled_start_at',null);
  end if;

  -- Do not reset an existing valid schedule when an ordinary additional member joins.
  if run_row.scheduled_start_at is null and project_row.auto_start_paused_at is null and run_row.auto_start_paused_at is null then
    due_at:=coalesce(run_row.start_ready_at,now_at)+interval '6 hours';
    update public.project_runs
    set scheduled_start_at=due_at,start_scheduled_at=coalesce(start_scheduled_at,now_at),
        auto_start_failure=null,updated_at=now_at
    where id=run_row.id and has_started=false and scheduled_start_at is null
    returning * into run_row;
    insert into public.project_activity_log(project_id,project_run_id,event_type,actor_type,from_status,to_status,metadata)
    values(project_row.id,run_row.id,'project_start_scheduled','system','forming','forming',
      jsonb_build_object('scheduled_start_at',run_row.scheduled_start_at,'required_team_size',required_members,'filled',filled,'delay_minutes',360,'source','phase9_participation_threshold'));
  else
    select * into run_row from public.project_runs where id=p_run_id;
  end if;

  return jsonb_build_object('state','start_scheduled','ready',true,'filled',filled,'required_team_size',required_members,'scheduled_start_at',run_row.scheduled_start_at);
end;
$$;
revoke all on function public.phase9_reconcile_run_participation(uuid) from public,anon,authenticated;
grant execute on function public.phase9_reconcile_run_participation(uuid) to service_role;

create or replace function public.phase9_reconcile_membership_change()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  target_run uuid;
begin
  target_run:=case when tg_op='DELETE' then old.project_run_id else new.project_run_id end;
  if target_run is not null then perform public.phase9_reconcile_run_participation(target_run); end if;
  return case when tg_op='DELETE' then old else new end;
end;
$$;
revoke all on function public.phase9_reconcile_membership_change() from public,anon,authenticated;

drop trigger if exists project_member_phase9_readiness_reconcile on public.project_members;
create trigger project_member_phase9_readiness_reconcile
after insert or update of project_run_id,membership_status or delete
on public.project_members
for each row execute function public.phase9_reconcile_membership_change();

-- Changing minimum while forming recalculates readiness. Started runs are never
-- rewritten: their historical threshold and start remain intact.
create or replace function public.phase9_reconcile_project_participation_change()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  r record;
  next_required integer;
begin
  for r in select id,required_team_size from public.project_runs
           where project_id=new.id and coalesce(has_started,false)=false
  loop
    next_required:=case
      when new.participation_mode='solo' then 1
      when new.participation_mode='team' then greatest(new.min_team_size,1)
      when coalesce(r.required_team_size,1)=1 then 1
      else greatest(new.min_team_size,1)
    end;
    update public.project_runs
    set required_team_size=next_required,team_size_threshold=next_required,updated_at=now()
    where id=r.id and has_started=false;
    perform public.phase9_reconcile_run_participation(r.id);
  end loop;
  return new;
end;
$$;
revoke all on function public.phase9_reconcile_project_participation_change() from public,anon,authenticated;

drop trigger if exists project_phase9_participation_reconcile on public.projects;
create trigger project_phase9_participation_reconcile
after update of participation_mode,min_team_size,target_team_size,max_team_size
on public.projects
for each row execute function public.phase9_reconcile_project_participation_change();

-- -----------------------------------------------------------------------------
-- 5. Canonical capacity snapshot: target never blocks readiness and reservations
-- are visible without being double-counted after consumption.
-- -----------------------------------------------------------------------------
create or replace function public.phase9_project_run_capacity(
  p_project_id uuid,
  p_run_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  project_row public.projects%rowtype;
  run_row public.project_runs%rowtype;
  minimum_members integer;
  target_members integer;
  maximum_members integer;
  occupied integer:=0;
  reserved integer:=0;
  used_capacity integer:=0;
  late_join_allowed boolean:=false;
  now_at timestamptz:=now();
begin
  select * into project_row from public.projects where id=p_project_id;
  if project_row.id is null then raise exception using errcode='P0002',message='PROJECT_NOT_FOUND'; end if;

  if p_run_id is not null then
    select * into run_row from public.project_runs where id=p_run_id and project_id=p_project_id;
    if run_row.id is null then raise exception using errcode='P0002',message='PROJECT_RUN_NOT_FOUND'; end if;
    minimum_members:=greatest(coalesce(run_row.required_team_size,run_row.team_size_threshold,1),1);
    select count(*)::integer into occupied from public.project_members
      where project_run_id=p_run_id and membership_status in ('waiting','active');
  else
    minimum_members:=case when project_row.participation_mode='solo' then 1
      else greatest(coalesce(project_row.min_team_size,project_row.team_size_threshold,1),1) end;
    select count(*)::integer into occupied from public.project_members
      where project_id=p_project_id and membership_status in ('waiting','active');
  end if;

  target_members:=greatest(minimum_members,coalesce(project_row.target_team_size,minimum_members));
  maximum_members:=case when project_row.participation_mode='solo' then 1
    else greatest(target_members,coalesce(project_row.max_team_size,target_members)) end;
  select count(*)::integer into reserved from public.project_offers
    where project_id=p_project_id and status in ('pending','accepted')
      and capacity_released_at is null and capacity_consumed_at is null;
  used_capacity:=occupied+reserved;

  if p_run_id is not null then
    late_join_allowed:=coalesce(run_row.has_started,false)=true
      and run_row.status='active'
      and coalesce(run_row.recruitment_open,true)=true
      and coalesce(project_row.late_joining_enabled,true)=true
      and (project_row.late_joining_cutoff_at is null or now_at<project_row.late_joining_cutoff_at)
      and used_capacity<maximum_members;
  end if;

  return jsonb_build_object(
    'project_id',p_project_id,'run_id',p_run_id,'participation_mode',project_row.participation_mode,
    'minimum',minimum_members,'target',target_members,'maximum',maximum_members,
    'occupied',occupied,'reserved',reserved,'used_capacity',used_capacity,
    'available',greatest(maximum_members-used_capacity,0),
    'ready',occupied>=minimum_members and occupied<=maximum_members,
    'target_reached',occupied>=target_members,
    'capacity_available',used_capacity<maximum_members,
    'late_join_allowed',late_join_allowed
  );
end;
$$;
revoke all on function public.phase9_project_run_capacity(uuid,uuid) from public,anon,authenticated;
grant execute on function public.phase9_project_run_capacity(uuid,uuid) to service_role;

create index if not exists project_members_project_live_capacity_idx
  on public.project_members(project_id,project_run_id,user_id)
  where membership_status in ('waiting','active');
create index if not exists project_runs_forming_participation_idx
  on public.project_runs(project_id,required_team_size)
  where has_started=false and status='forming';

comment on function public.phase9_reconcile_run_participation(uuid) is
  'Canonical Phase 9 participation readiness transition. Minimum controls readiness, target never blocks, AUTO schedules exactly +6h, loss invalidates schedule, restored readiness creates a new window.';
