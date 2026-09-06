-- Project Experience Phase 10: canonical team formation.
--
-- Phase 10 converts an ACCEPTED REVIEW_REQUIRED Offer into the existing
-- project_runs + project_members architecture exactly once. It does not activate
-- the project and it does not create or depend on a second project_teams source
-- of truth.
--
-- Canonical lock order is inherited from Phase 9:
--   project row -> Phase 9 project-capacity lock -> application/offer -> run -> membership.

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
  preference text;
  required_members integer:=1;
  next_run integer:=1;
  team_geometry boolean:=false;
  now_at timestamptz:=now();
begin
  -- Resolve the project without locking application/Offer rows first so every
  -- capacity-changing Phase 9/10 path keeps one lock order.
  select a.project_id
  into app.project_id
  from public.project_applications a
  where a.id=p_application_id;
  if app.project_id is null then
    raise exception using errcode='P0002',message='APPLICATION_NOT_FOUND';
  end if;

  select * into project_row
  from public.projects
  where id=app.project_id
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
  if offer_row.id is null then
    raise exception using errcode='23514',message='ACCEPTED_OFFER_REQUIRED';
  end if;
  if offer_row.status<>'accepted'
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

  preference:=case
    when project_row.participation_mode='solo' then 'solo'
    when project_row.participation_mode='team' then 'team'
    when project_row.participation_mode='flexible' and app.participation_preference in ('solo','team','either') then app.participation_preference
    else null
  end;
  if preference is null then
    raise exception using errcode='23514',message='PARTICIPATION_PREFERENCE_REQUIRED';
  end if;

  required_members:=public.phase9_effective_participation_threshold(
    project_row.participation_mode,
    preference,
    project_row.min_team_size
  );
  team_geometry:=project_row.participation_mode='team'
    or (project_row.participation_mode='flexible' and preference='team');

  -- Idempotency: AUTO or another governed formation transaction may already have
  -- established membership. Never create a second live membership.
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
      -- Re-fire the existing reservation-consumption boundary without changing
      -- membership semantics. The Phase 8/9 trigger consumes exactly one Offer.
      update public.project_members
      set membership_status=existing_member.membership_status
      where id=existing_member.id;
    end if;
    update public.project_applications
    set project_run_id=coalesce(project_run_id,existing_member.project_run_id),
        status=case when status='accepted' then 'waiting_for_team' else status end,
        updated_at=now_at
    where id=app.id;
    return jsonb_build_object(
      'formed',false,
      'already_formed',true,
      'application_id',app.id,
      'offer_id',offer_row.id,
      'membership_id',existing_member.id,
      'run_id',existing_member.project_run_id,
      'required_team_size',required_members,
      'participation_preference',preference
    );
  end if;

  -- Collaborative formation reuses the canonical unstarted forming run. Solo and
  -- Flexible independent formation use their own run, matching Phase 6 geometry.
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

  -- Phase 9 membership-capacity trigger revalidates membership + live Offer
  -- reservations under the same capacity lock. The Phase 8/9 consumption trigger
  -- then converts this member's accepted reservation to occupied capacity.
  insert into public.project_members(
    project_id,project_run_id,user_id,project_role_id,team_role,membership_status
  ) values (
    project_row.id,run_row.id,app.user_id,null,'contributor','waiting'
  )
  returning * into existing_member;

  update public.project_applications
  set project_run_id=run_row.id,
      status='waiting_for_team',
      updated_at=now_at
  where id=app.id and status='accepted';

  if not found then
    raise exception using errcode='23514',message='APPLICATION_FORMATION_STATE_CHANGED';
  end if;

  insert into public.project_activity_log(
    project_id,project_run_id,event_type,actor_type,actor_user_id,from_status,to_status,metadata
  ) values (
    project_row.id,run_row.id,'project_membership_formed','system',null,'accepted','waiting_for_team',
    jsonb_build_object(
      'application_id',app.id,
      'offer_id',offer_row.id,
      'membership_id',existing_member.id,
      'user_id',app.user_id,
      'required_team_size',required_members,
      'participation_mode',project_row.participation_mode,
      'participation_preference',preference,
      'role_assignment_pending',team_geometry,
      'creates_active_project',false
    )
  );

  return jsonb_build_object(
    'formed',true,
    'already_formed',false,
    'application_id',app.id,
    'offer_id',offer_row.id,
    'membership_id',existing_member.id,
    'run_id',run_row.id,
    'run_number',run_row.run_number,
    'required_team_size',required_members,
    'participation_preference',preference,
    'membership_status','waiting',
    'project_active',false
  );
end;
$$;

revoke all on function public.phase10_form_accepted_offer(uuid) from public,anon,authenticated;
grant execute on function public.phase10_form_accepted_offer(uuid) to service_role;

comment on function public.phase10_form_accepted_offer(uuid) is
  'Service-only Phase 10 transaction that converts one accepted REVIEW_REQUIRED Offer into canonical waiting project membership and a canonical forming run without activating the project.';
