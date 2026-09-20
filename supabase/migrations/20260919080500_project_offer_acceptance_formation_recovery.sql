

-- Current Submit Interest stores 'flexible', not the historical 'either' token.
-- Flexible-independent is a one-person effective path; explicit Team keeps the
-- configured collaborative minimum.
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
    when p_mode='flexible' and p_preference in ('solo','flexible','either') then 1
    else greatest(coalesce(p_minimum,1),1)
  end
$$;

revoke all on function public.phase9_effective_participation_threshold(text,text,integer)
  from public,anon,authenticated;
grant execute on function public.phase9_effective_participation_threshold(text,text,integer)
  to service_role;

-- Project journey recovery: accepted REVIEW_REQUIRED offers must use the current
-- Submit Interest vocabulary (solo/team/flexible) and form canonical membership.
-- This supersedes the stale Phase 10 legacy 'either' preference assumption.
--
-- An accepted REVIEW_REQUIRED Offer may enter an already-active canonical run only
-- when the Phase 9 late-joining contract permits it. An active run is never
-- bypassed by manufacturing a new forming cohort. The existing project_runs,
-- project_members, Offer reservation, capacity and activity architectures remain
-- authoritative.

create or replace function public.phase10_form_accepted_offer(
  p_application_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  app public.project_applications%rowtype;
  offer_row public.project_offers%rowtype;
  project_row public.projects%rowtype;
  run_row public.project_runs%rowtype;
  existing_member public.project_members%rowtype;
  project_id_hint uuid;
  preference text;
  required_members integer:=1;
  next_run integer:=1;
  team_geometry boolean:=false;
  late_join boolean:=false;
  capacity_snapshot jsonb;
  occupied integer:=0;
  reserved integer:=0;
  maximum_members integer:=1;
  now_at timestamptz:=now();
begin
  select a.project_id into project_id_hint
  from public.project_applications a
  where a.id=p_application_id;
  if project_id_hint is null then
    raise exception using errcode='P0002',message='APPLICATION_NOT_FOUND';
  end if;

  -- Canonical capacity-changing lock order: project -> Phase 9 capacity lock.
  select * into project_row
  from public.projects
  where id=project_id_hint
  for update;
  if project_row.id is null then
    raise exception using errcode='P0002',message='PROJECT_NOT_FOUND';
  end if;
  perform public.phase9_lock_project_capacity(project_row.id);

  select * into app
  from public.project_applications
  where id=p_application_id and project_id=project_row.id
  for update;
  if app.id is null then
    raise exception using errcode='P0002',message='APPLICATION_NOT_FOUND';
  end if;

  select * into offer_row
  from public.project_offers
  where application_id=app.id
  for update;
  if offer_row.id is null
     or offer_row.status<>'accepted'
     or offer_row.capacity_released_at is not null then
    raise exception using errcode='23514',message='ACCEPTED_OFFER_REQUIRED';
  end if;
  if offer_row.project_id<>project_row.id or offer_row.user_id<>app.user_id then
    raise exception using errcode='23514',message='OFFER_APPLICATION_IDENTITY_MISMATCH';
  end if;

  if public.effective_project_admission_mode(project_row.project_type,project_row.admission_mode)<>'review_required' then
    raise exception using errcode='23514',message='FORMATION_REQUIRES_REVIEW_REQUIRED';
  end if;
  if app.admission_decision='auto_qualified' then
    raise exception using errcode='23514',message='AUTO_MEMBERSHIP_ALREADY_OWNED_BY_PHASE6';
  end if;
  if project_row.status in ('cancelled','completed','archived') then
    raise exception using errcode='23514',message='PROJECT_NOT_JOINABLE';
  end if;

  preference:=public.project_application_effective_participation(
    project_row.participation_mode,
    app.participation_preference,
    app.flexible_preference
  );
  if preference not in ('solo','team','flexible') then
    raise exception using errcode='23514',message='PARTICIPATION_PREFERENCE_REQUIRED';
  end if;

  required_members:=public.phase9_effective_participation_threshold(
    project_row.participation_mode,
    preference,
    project_row.min_team_size
  );
  team_geometry:=project_row.participation_mode='team'
    or (project_row.participation_mode='flexible' and preference='team');

  -- Idempotency is project-lifecycle scoped. A retry never creates a second live
  -- membership or consumes a second Offer reservation.
  select * into existing_member
  from public.project_members
  where project_id=project_row.id
    and user_id=app.user_id
    and membership_status in ('waiting','active')
  order by joined_at asc nulls last,id asc
  limit 1
  for update;

  if existing_member.id is not null then
    if offer_row.capacity_consumed_at is null then
      update public.project_members
      set membership_status=existing_member.membership_status
      where id=existing_member.id;
    end if;
    update public.project_applications
    set project_run_id=coalesce(project_run_id,existing_member.project_run_id),
        status=case
          when existing_member.membership_status='active' and status='accepted' then 'team_complete'
          when status='accepted' then 'waiting_for_team'
          else status
        end,
        updated_at=now_at
    where id=app.id;
    return jsonb_build_object(
      'formed',false,
      'already_formed',true,
      'late_join',existing_member.membership_status='active',
      'application_id',app.id,
      'offer_id',offer_row.id,
      'membership_id',existing_member.id,
      'run_id',existing_member.project_run_id,
      'required_team_size',required_members,
      'participation_preference',preference,
      'membership_status',existing_member.membership_status
    );
  end if;

  -- A started active run has priority over every forming/new-run path. Phase 9
  -- owns whether that run can accept a late participant. If it cannot, formation
  -- fails explicitly rather than silently creating a second cohort.
  select * into run_row
  from public.project_runs
  where project_id=project_row.id
    and status='active'
    and coalesce(has_started,false)=true
  order by run_number desc,id desc
  limit 1
  for update;

  if run_row.id is not null then
    capacity_snapshot:=public.phase9_project_run_capacity(project_row.id,run_row.id);
    occupied:=coalesce((capacity_snapshot->>'occupied')::integer,0);
    reserved:=coalesce((capacity_snapshot->>'reserved')::integer,0);
    maximum_members:=coalesce((capacity_snapshot->>'maximum')::integer,1);

    -- Preserve the Phase 16 replacement-capacity handoff: the accepted Offer
    -- being converted into membership must not count against itself. Other live
    -- reservations remain protected by the canonical capacity contract.
    if offer_row.capacity_consumed_at is null then
      reserved:=greatest(reserved-1,0);
    end if;

    if coalesce(run_row.recruitment_open,true)<>true
       or coalesce(project_row.late_joining_enabled,true)<>true
       or (project_row.late_joining_cutoff_at is not null and now_at>=project_row.late_joining_cutoff_at)
       or occupied+reserved>=maximum_members then
      raise exception using errcode='23514',message='LATE_JOIN_NOT_ALLOWED';
    end if;
    late_join:=true;
  else
    -- Collaborative pre-start formation reuses the canonical compatible forming
    -- run. Solo/Flexible-independent keeps the existing threshold-1 geometry.
    if team_geometry then
      select * into run_row
      from public.project_runs
      where project_id=project_row.id
        and status='forming'
        and coalesce(has_started,false)=false
        and required_team_size=required_members
      order by run_number asc
      limit 1
      for update;
    end if;

    if run_row.id is null then
      select coalesce(max(run_number),0)+1
      into next_run
      from public.project_runs
      where project_id=project_row.id;

      insert into public.project_runs(
        project_id,run_number,status,team_size_threshold,required_team_size,has_started,recruitment_open
      ) values (
        project_row.id,next_run,'forming',required_members,required_members,false,true
      )
      returning * into run_row;

      insert into public.project_activity_log(
        project_id,project_run_id,event_type,actor_type,from_status,to_status,metadata
      ) values (
        project_row.id,run_row.id,'cohort_created','system',null,'forming',
        jsonb_build_object(
          'source','phase10_accepted_offer_formation',
          'run_number',run_row.run_number,
          'required_team_size',required_members,
          'participation_preference',preference
        )
      );
    end if;
  end if;

  -- Membership capacity and accepted-Offer reservation conversion are enforced
  -- by the existing Phase 8/9 triggers under the same project capacity lock.
  insert into public.project_members(
    project_id,project_run_id,user_id,project_role_id,team_role,membership_status,activated_at
  ) values (
    project_row.id,run_row.id,app.user_id,null,'contributor',
    case when late_join then 'active' else 'waiting' end,
    case when late_join then now_at else null end
  )
  returning * into existing_member;

  update public.project_applications
  set project_run_id=run_row.id,
      status=case when late_join then 'team_complete' else 'waiting_for_team' end,
      updated_at=now_at
  where id=app.id and status='accepted';
  if not found then
    raise exception using errcode='23514',message='APPLICATION_FORMATION_STATE_CHANGED';
  end if;

  insert into public.project_activity_log(
    project_id,project_run_id,event_type,actor_type,actor_user_id,from_status,to_status,metadata
  ) values (
    project_row.id,run_row.id,
    case when late_join then 'project_member_late_joined' else 'project_membership_formed' end,
    'system',null,'accepted',case when late_join then 'team_complete' else 'waiting_for_team' end,
    jsonb_build_object(
      'application_id',app.id,
      'offer_id',offer_row.id,
      'membership_id',existing_member.id,
      'user_id',app.user_id,
      'required_team_size',required_members,
      'participation_mode',project_row.participation_mode,
      'participation_preference',preference,
      'late_join',late_join,
      'reused_active_run',late_join,
      'creates_active_project',false
    )
  );

  -- Joining an active run must not restart it, alter kickoff/history, or create a
  -- new six-hour readiness window. Forming runs still delegate participation
  -- readiness to the canonical Phase 9 reconciler.
  if not late_join then
    perform public.phase9_reconcile_run_participation(run_row.id);
  end if;

  return jsonb_build_object(
    'formed',true,
    'already_formed',false,
    'late_join',late_join,
    'application_id',app.id,
    'offer_id',offer_row.id,
    'membership_id',existing_member.id,
    'run_id',run_row.id,
    'run_number',run_row.run_number,
    'required_team_size',required_members,
    'participation_preference',preference,
    'membership_status',case when late_join then 'active' else 'waiting' end,
    'project_active',late_join
  );
end;
$$;

revoke all on function public.phase10_form_accepted_offer(uuid) from public,anon,authenticated;
grant execute on function public.phase10_form_accepted_offer(uuid) to service_role;

comment on function public.phase10_form_accepted_offer(uuid) is
  'Service-only Phase 10 accepted-Offer formation. Reuses a canonical active run for Phase-9-permitted late joining; otherwise reuses/creates only an appropriate forming run. Never activates or restarts a project.';


-- Reconcile durable accepted Offers that were stranded before the application
-- route began invoking Phase 10. Historical rows without trustworthy current
-- participation evidence are deliberately left explicit and untouched.
do $$
declare
  candidate record;
  formed jsonb;
  readiness jsonb;
  activated jsonb;
begin
  for candidate in
    select
      a.id as application_id,
      a.project_id,
      a.participation_preference,
      a.flexible_preference
    from public.project_applications a
    join public.project_offers o on o.application_id=a.id
    join public.projects p on p.id=a.project_id
    where a.status='accepted'
      and a.participation_preference in ('solo','team','flexible')
      and o.status='accepted'
      and o.accepted_at is not null
      and o.capacity_released_at is null
      and o.capacity_consumed_at is null
      and public.effective_project_admission_mode(p.project_type,p.admission_mode)='review_required'
      and p.status not in ('cancelled','completed','archived')
    order by o.accepted_at asc,o.id asc
  loop
    begin
      formed:=public.phase10_form_accepted_offer(candidate.application_id);

      -- One-person review-required paths must not remain queued after a valid
      -- acceptance. Re-use the canonical Phase 11 readiness projection and
      -- atomic Phase 9 activation authority. Team paths continue formation.
      if coalesce((formed->>'required_team_size')::integer,0)=1
         and coalesce(formed->>'participation_preference','') in ('solo','flexible')
         and nullif(formed->>'run_id','') is not null then
        readiness:=public.phase11_project_start_readiness(
          candidate.project_id,
          (formed->>'run_id')::uuid
        );

        if coalesce((readiness->>'ready')::boolean,false) then
          activated:=public.phase9_activate_project_run(
            candidate.project_id,
            (formed->>'run_id')::uuid,
            'manual',
            null
          );

          insert into public.project_activity_log(
            project_id,project_run_id,event_type,actor_type,from_status,to_status,metadata
          ) values (
            candidate.project_id,
            (formed->>'run_id')::uuid,
            'accepted_offer_recovery_reconciled',
            'system',
            'accepted',
            case when coalesce((activated->>'started')::boolean,false)
                   or coalesce((activated->>'already_started')::boolean,false)
                 then 'active' else 'waiting_for_team' end,
            jsonb_build_object(
              'application_id',candidate.application_id,
              'formation',formed,
              'readiness',readiness,
              'activation',activated,
              'source','20260919080500_project_offer_acceptance_formation_recovery'
            )
          );
        end if;
      end if;
    exception when others then
      -- Do not invent or coerce ambiguous historical participation. A malformed
      -- legacy row stays explicit for governed Admin recovery instead of making
      -- the migration unsafe or silently rewriting member intent.
      raise warning 'accepted Offer reconciliation skipped application %: %',
        candidate.application_id,sqlerrm;
    end;
  end loop;
end
$$;
