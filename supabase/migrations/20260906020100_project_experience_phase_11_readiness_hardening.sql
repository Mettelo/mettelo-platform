-- Project Experience Phase 11 — final readiness hardening.
--
-- This migration remains additive to the existing Phase 3/9/10 architecture:
-- * project_experience_readiness remains the canonical project-definition source;
-- * project_runs/project_members remain the run and membership authorities;
-- * phase9_reconcile_run_participation remains the one AUTO scheduling transition;
-- * phase9_activate_project_run remains the one database ACTIVE transition.
--
-- Phase 11 adds explicit safe reason codes and removes Phase 9's accidental
-- hard-coding of the six-hour window. 360 minutes remains the product default,
-- but a governed project may configure another positive delay.

-- ---------------------------------------------------------------------------
-- Configurable AUTO intervention window (default 360 minutes).
-- ---------------------------------------------------------------------------
alter table public.projects alter column auto_start_delay_minutes set default 360;
alter table public.projects drop constraint if exists projects_phase9_auto_start_window_check;
alter table public.projects drop constraint if exists projects_phase11_auto_start_window_check;
alter table public.projects add constraint projects_phase11_auto_start_window_check
check (
  admission_mode <> 'auto'
  or auto_start_delay_minutes between 1 and 10080
);

comment on column public.projects.auto_start_delay_minutes is
  'Governed AUTO intervention window in minutes. Defaults to 360. Phase 11 scheduling must consume this field rather than hard-code six hours.';

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
  delay_minutes integer:=360;
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
  delay_minutes:=greatest(coalesce(project_row.auto_start_delay_minutes,360),1);

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

  -- REVIEW_REQUIRED/Partner participation readiness never invokes the AUTO window.
  if effective_admission<>'auto' then
    return jsonb_build_object('state','participation_ready','ready',true,'filled',filled,'required_team_size',required_members,'scheduled_start_at',null);
  end if;

  -- Do not reset an existing valid schedule when an ordinary additional member joins.
  if run_row.scheduled_start_at is null and project_row.auto_start_paused_at is null and run_row.auto_start_paused_at is null then
    due_at:=coalesce(run_row.start_ready_at,now_at)+make_interval(mins=>delay_minutes);
    update public.project_runs
    set scheduled_start_at=due_at,start_scheduled_at=coalesce(start_scheduled_at,now_at),
        auto_start_failure=null,updated_at=now_at
    where id=run_row.id and has_started=false and scheduled_start_at is null
    returning * into run_row;
    insert into public.project_activity_log(project_id,project_run_id,event_type,actor_type,from_status,to_status,metadata)
    values(project_row.id,run_row.id,'project_start_scheduled','system','forming','forming',
      jsonb_build_object('scheduled_start_at',run_row.scheduled_start_at,'required_team_size',required_members,'filled',filled,'delay_minutes',delay_minutes,'source','phase9_participation_threshold'));
  else
    select * into run_row from public.project_runs where id=p_run_id;
  end if;

  return jsonb_build_object('state','start_scheduled','ready',true,'filled',filled,'required_team_size',required_members,'scheduled_start_at',run_row.scheduled_start_at,'delay_minutes',delay_minutes);
end;
$$;
revoke all on function public.phase9_reconcile_run_participation(uuid) from public,anon,authenticated;
grant execute on function public.phase9_reconcile_run_participation(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- One server-authoritative final readiness projection with safe reason codes.
-- Lower-case legacy blocker names are retained for compatibility while
-- reason_codes is the stable Phase 11/Admin contract.
-- ---------------------------------------------------------------------------
create or replace function public.phase11_project_start_readiness(
  p_project_id uuid,
  p_run_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  project_row public.projects%rowtype;
  run_row public.project_runs%rowtype;
  readiness_row record;
  brief_row record;
  effective_admission text;
  required_members integer:=1;
  target_members integer:=1;
  maximum_members integer:=1;
  filled integer:=0;
  invalid_members integer:=0;
  missing_responsibilities integer:=0;
  lead_count integer:=0;
  missing_accepted_offers integer:=0;
  canonical_milestones integer:=0;
  private_resource_gaps integer:=0;
  project_blockers text[]:='{}'::text[];
  team_blockers text[]:='{}'::text[];
  system_blockers text[]:='{}'::text[];
  reason_codes text[]:='{}'::text[];
  project_ready boolean:=false;
  team_ready boolean:=false;
  system_ready boolean:=false;
begin
  if p_project_id is null or p_run_id is null then
    raise exception using errcode='23514',message='PROJECT_AND_RUN_REQUIRED';
  end if;

  select * into project_row from public.projects where id=p_project_id;
  if project_row.id is null then raise exception using errcode='P0002',message='PROJECT_NOT_FOUND'; end if;

  select * into run_row from public.project_runs where id=p_run_id and project_id=p_project_id;
  if run_row.id is null then raise exception using errcode='P0002',message='PROJECT_RUN_NOT_FOUND'; end if;

  select publication_ready,lab_ready,missing_requirements,publication_blockers
  into readiness_row
  from public.project_experience_readiness
  where project_id=p_project_id;

  select project_id,key_questions,in_scope,out_of_scope
  into brief_row
  from public.project_problem_briefs
  where project_id=p_project_id;

  effective_admission:=public.effective_project_admission_mode(project_row.project_type,project_row.admission_mode);
  required_members:=greatest(coalesce(run_row.required_team_size,run_row.team_size_threshold,1),1);
  target_members:=greatest(required_members,coalesce(project_row.target_team_size,required_members));
  maximum_members:=case when project_row.participation_mode='solo' then 1
    else greatest(coalesce(project_row.max_team_size,target_members),required_members) end;

  select count(*)::integer into filled
  from public.project_members
  where project_run_id=p_run_id and membership_status in ('waiting','active');

  select count(*)::integer into invalid_members
  from public.project_members
  where project_run_id=p_run_id
    and membership_status in ('waiting','active')
    and project_id<>p_project_id;

  if project_row.status in ('cancelled','completed','archived') then
    project_blockers:=array_append(project_blockers,'project_lifecycle');
    reason_codes:=array_append(reason_codes,'RECRUITMENT_STATE_INVALID');
  end if;
  if readiness_row is null or coalesce(readiness_row.publication_ready,false)=false then
    project_blockers:=array_append(project_blockers,case when readiness_row is null then 'project_readiness_unavailable' else 'project_definition' end);
    reason_codes:=array_append(reason_codes,'PROJECT_INCOMPLETE');
  end if;
  if brief_row is null
     or jsonb_array_length(coalesce(brief_row.key_questions,'[]'::jsonb))=0
     or jsonb_array_length(coalesce(brief_row.in_scope,'[]'::jsonb))=0
     or jsonb_array_length(coalesce(brief_row.out_of_scope,'[]'::jsonb))=0 then
    project_blockers:=array_append(project_blockers,'project_alignment');
    reason_codes:=array_append(reason_codes,'PROJECT_INCOMPLETE');
  end if;

  if invalid_members>0 then
    team_blockers:=array_append(team_blockers,'membership_invalid');
    reason_codes:=array_append(reason_codes,'MEMBERSHIP_INVALID');
  end if;
  if filled<required_members then
    team_blockers:=array_append(team_blockers,'team_size');
    reason_codes:=array_append(reason_codes,'TEAM_BELOW_MINIMUM');
  end if;
  if filled>maximum_members then
    team_blockers:=array_append(team_blockers,'capacity');
    reason_codes:=array_append(reason_codes,'TEAM_ABOVE_MAXIMUM');
  end if;

  -- REVIEW_REQUIRED participation must be backed by a real accepted Offer.
  -- AUTO does not manufacture or require an Offer.
  if effective_admission='review_required' then
    select count(*)::integer into missing_accepted_offers
    from public.project_members m
    where m.project_run_id=p_run_id
      and m.membership_status in ('waiting','active')
      and not exists (
        select 1 from public.project_offers o
        where o.project_id=p_project_id
          and o.user_id=m.user_id
          and o.status='accepted'
      );
    if missing_accepted_offers>0 then
      team_blockers:=array_append(team_blockers,'offer_acceptance');
      reason_codes:=array_append(reason_codes,'OFFER_NOT_ACCEPTED');
    end if;
  end if;

  -- Independent threshold-1 delivery has no artificial Team-only Lead or
  -- responsibility gate. Multi-member delivery keeps Phase 10's current
  -- normalized assignment authority pending the required/optional vocabulary
  -- refinement tracked by the Phase 11 acceptance review.
  if required_members>1 then
    select count(*)::integer into missing_responsibilities
    from public.project_members m
    where m.project_run_id=p_run_id and m.membership_status in ('waiting','active')
      and not exists (
        select 1 from public.project_member_responsibilities r
        where r.project_member_id=m.id and r.project_run_id=p_run_id and r.assignment_status='active'
      );
    if missing_responsibilities>0 then
      team_blockers:=array_append(team_blockers,'responsibility_coverage');
      reason_codes:=array_append(reason_codes,'RESPONSIBILITY_GAP');
    end if;

    select count(*)::integer into lead_count
    from public.project_members
    where project_run_id=p_run_id and membership_status in ('waiting','active') and team_role='project_lead';
    if lead_count=0 then
      team_blockers:=array_append(team_blockers,'project_lead');
      reason_codes:=array_append(reason_codes,'LEAD_REQUIRED');
    elsif lead_count>1 then
      team_blockers:=array_append(team_blockers,'multiple_project_leads');
      reason_codes:=array_append(reason_codes,'MEMBERSHIP_INVALID');
    end if;
  end if;

  if run_row.status<>'forming' or coalesce(run_row.has_started,false)=true then
    system_blockers:=array_append(system_blockers,'run_lifecycle');
    reason_codes:=array_append(reason_codes,'RECRUITMENT_STATE_INVALID');
  end if;
  if run_row.auto_start_blocked_at is not null then
    system_blockers:=array_append(system_blockers,'auto_start_blocked');
    reason_codes:=array_append(reason_codes,'PROJECT_BLOCKED');
  end if;
  if project_row.auto_start_paused_at is not null or run_row.auto_start_paused_at is not null then
    system_blockers:=array_append(system_blockers,'start_paused');
    reason_codes:=array_append(reason_codes,'PROJECT_PAUSED');
  end if;
  if readiness_row is null or coalesce(readiness_row.lab_ready,false)=false then
    system_blockers:=array_append(system_blockers,'lab_readiness');
    reason_codes:=array_append(reason_codes,'LAB_NOT_READY');
  end if;

  select count(*)::integer into canonical_milestones
  from public.project_milestones
  where project_id=p_project_id and project_run_id is null;
  if canonical_milestones=0 then
    system_blockers:=array_append(system_blockers,'first_milestone');
    reason_codes:=array_append(reason_codes,'MILESTONE_NOT_READY');
  end if;

  -- A governed private/team resource that is expected to use internal storage
  -- must have a storage location before start. Optional/public resources are not
  -- made blockers merely by being absent.
  select count(*)::integer into private_resource_gaps
  from public.project_data_sources ds
  where ds.project_id=p_project_id and ds.project_run_id is null
    and coalesce(ds.sensitivity,'internal')<>'public'
    and ds.governance_status='green'
    and ds.internal_storage_policy='permitted'
    and nullif(btrim(coalesce(ds.internal_storage_url,'')),'') is null;
  if private_resource_gaps>0 then
    system_blockers:=array_append(system_blockers,'private_resource');
    reason_codes:=array_append(reason_codes,'RESOURCE_NOT_READY');
  end if;

  project_ready:=cardinality(project_blockers)=0;
  team_ready:=cardinality(team_blockers)=0;
  system_ready:=cardinality(system_blockers)=0;

  return jsonb_build_object(
    'state',case when project_ready and team_ready and system_ready then 'READY' else 'NOT_READY' end,
    'ready',project_ready and team_ready and system_ready,
    'reason_codes',to_jsonb(array(select distinct x from unnest(reason_codes) as x)),
    'project',jsonb_build_object(
      'ready',project_ready,'blockers',to_jsonb(project_blockers),
      'publication_ready',coalesce(readiness_row.publication_ready,false),
      'missing_requirements',coalesce(to_jsonb(readiness_row.missing_requirements),'[]'::jsonb),
      'publication_blockers',coalesce(to_jsonb(readiness_row.publication_blockers),'[]'::jsonb),
      'alignment_ready',brief_row is not null
        and jsonb_array_length(coalesce(brief_row.key_questions,'[]'::jsonb))>0
        and jsonb_array_length(coalesce(brief_row.in_scope,'[]'::jsonb))>0
        and jsonb_array_length(coalesce(brief_row.out_of_scope,'[]'::jsonb))>0
    ),
    'team',jsonb_build_object(
      'ready',team_ready,'blockers',to_jsonb(team_blockers),'filled',filled,
      'required_team_size',required_members,'target_team_size',target_members,'maximum_team_size',maximum_members,
      'invalid_members',invalid_members,'missing_accepted_offers',missing_accepted_offers,
      'missing_responsibility_members',missing_responsibilities,'project_lead_count',lead_count
    ),
    'system',jsonb_build_object(
      'ready',system_ready,'blockers',to_jsonb(system_blockers),
      'lab_ready',coalesce(readiness_row.lab_ready,false),
      'permissions_ready',invalid_members=0,
      'private_resources_ready',private_resource_gaps=0,
      'first_milestone_ready',canonical_milestones>0,
      'run_status',run_row.status,'has_started',coalesce(run_row.has_started,false),
      'start_blocked',run_row.auto_start_blocked_at is not null,
      'start_paused',project_row.auto_start_paused_at is not null or run_row.auto_start_paused_at is not null
    ),
    'blockers',to_jsonb(project_blockers||team_blockers||system_blockers)
  );
end;
$$;

comment on function public.phase11_project_start_readiness(uuid,uuid) is
  'Service-only Phase 11 final readiness projection. Returns Project/Team/System readiness plus safe reason_codes and consumes canonical Phase 3/9/10 data without a duplicate lifecycle.';
revoke all on function public.phase11_project_start_readiness(uuid,uuid) from public,anon,authenticated;
grant execute on function public.phase11_project_start_readiness(uuid,uuid) to service_role;
