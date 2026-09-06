-- Phase 9 Offer/capacity unification.
--
-- Supersedes Phase 8 pre-offer and member-response capacity checks so they:
--   * use the canonical Phase 9 project-capacity lock;
--   * acquire project lock before Offer row lock on member response;
--   * exclude already-consumed accepted Offer history from live reservations;
--   * retain the existing Phase 8 eligibility, expiry and explicit response model.

create or replace function public.phase8_validate_offer_eligibility_and_capacity()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  project public.projects%rowtype;
  maximum_members integer;
  occupied integer:=0;
  reserved integer:=0;
begin
  if new.status<>'offered' or old.status='offered' then return new; end if;

  select * into project from public.projects where id=new.project_id for update;
  if project.id is null then raise exception using errcode='P0002',message='PROJECT_NOT_FOUND'; end if;

  if public.effective_project_admission_mode(project.project_type,project.admission_mode)<>'review_required' then
    raise exception using errcode='23514',message='OFFER_REQUIRES_REVIEW_REQUIRED';
  end if;
  if new.admission_decision='auto_qualified' then
    raise exception using errcode='23514',message='AUTO_OFFER_FORBIDDEN';
  end if;

  perform public.phase9_lock_project_capacity(project.id);

  maximum_members:=case when project.participation_mode='solo' then 1 else greatest(
    coalesce(project.max_team_size,project.target_team_size,project.team_size_threshold,project.min_team_size,1),1
  ) end;

  select count(*)::integer into occupied
  from public.project_members
  where project_id=project.id and membership_status in ('waiting','active');

  select count(*)::integer into reserved
  from public.project_offers
  where project_id=project.id
    and status in ('pending','accepted')
    and capacity_released_at is null
    and capacity_consumed_at is null;

  if occupied+reserved>=maximum_members then
    raise exception using errcode='23514',message='OFFER_CAPACITY_FULL';
  end if;
  return new;
end;
$$;

revoke all on function public.phase8_validate_offer_eligibility_and_capacity() from public,anon,authenticated;

create or replace function public.phase8_respond_to_project_offer(
  p_offer_id uuid,
  p_action text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  offer_hint record;
  offer_row public.project_offers%rowtype;
  app public.project_applications%rowtype;
  project public.projects%rowtype;
  actor uuid:=auth.uid();
  now_at timestamptz:=now();
  existing_membership integer:=0;
  maximum_members integer:=0;
  occupied integer:=0;
  reserved integer:=0;
  next_status text;
begin
  if actor is null then raise exception using errcode='42501',message='AUTH_REQUIRED'; end if;
  if p_action not in ('accept','decline') then raise exception using errcode='23514',message='INVALID_OFFER_ACTION'; end if;

  -- Read only the routing key first. Do not take the Offer row lock before the
  -- project capacity lock, otherwise membership formation (project -> Offer row)
  -- could deadlock with response (Offer row -> project).
  select id,project_id,user_id into offer_hint
  from public.project_offers
  where id=p_offer_id and user_id=actor;
  if offer_hint.id is null then raise exception using errcode='P0002',message='OFFER_NOT_FOUND'; end if;

  perform public.phase9_lock_project_capacity(offer_hint.project_id);

  select * into offer_row
  from public.project_offers
  where id=p_offer_id and user_id=actor
  for update;
  if offer_row.id is null then raise exception using errcode='P0002',message='OFFER_NOT_FOUND'; end if;

  if offer_row.status<>'pending' then
    if (p_action='accept' and offer_row.status='accepted') or
       (p_action='decline' and offer_row.status='declined') then
      return jsonb_build_object(
        'offer_id',offer_row.id,'application_id',offer_row.application_id,
        'project_id',offer_row.project_id,'status',offer_row.status,
        'already_in_state',true,'creates_membership',false,
        'capacity_released',offer_row.capacity_released_at is not null
      );
    end if;
    raise exception using errcode='23514',message='OFFER_NOT_PENDING';
  end if;

  if offer_row.expires_at<=now_at then
    update public.project_offers
    set status='expired',expired_at=now_at,capacity_released_at=now_at,updated_at=now_at
    where id=offer_row.id and status='pending';

    update public.project_applications
    set status='expired',updated_at=now_at
    where id=offer_row.application_id and status='offered';

    insert into public.project_activity_log(
      project_id,project_run_id,event_type,actor_type,actor_user_id,from_status,to_status,metadata
    ) values (
      offer_row.project_id,offer_row.project_run_id,'offer_expired','system',null,'offered','expired',
      jsonb_build_object('offer_id',offer_row.id,'application_id',offer_row.application_id,
        'source','member_response_expiry_guard','capacity_released',true)
    );

    return jsonb_build_object(
      'offer_id',offer_row.id,'application_id',offer_row.application_id,'project_id',offer_row.project_id,
      'status','expired','expired',true,'creates_membership',false,'capacity_released',true
    );
  end if;

  select * into app from public.project_applications where id=offer_row.application_id for update;
  if app.id is null or app.user_id<>actor then raise exception using errcode='P0002',message='APPLICATION_NOT_FOUND'; end if;
  if app.status<>'offered' then raise exception using errcode='23514',message='APPLICATION_NOT_OFFERED'; end if;

  select * into project from public.projects where id=offer_row.project_id for update;
  if project.id is null then raise exception using errcode='P0002',message='PROJECT_NOT_FOUND'; end if;
  if public.effective_project_admission_mode(project.project_type,project.admission_mode)<>'review_required' then
    raise exception using errcode='23514',message='OFFER_REQUIRES_REVIEW_REQUIRED';
  end if;
  if project.status in ('cancelled','completed','archived') then
    raise exception using errcode='23514',message='PROJECT_NOT_JOINABLE';
  end if;

  if p_action='accept' then
    select count(*)::integer into existing_membership
    from public.project_members
    where project_id=offer_row.project_id
      and user_id=actor
      and membership_status in ('waiting','active','completed');
    if existing_membership>0 then raise exception using errcode='23514',message='ALREADY_PARTICIPATING'; end if;

    if offer_row.capacity_released_at is not null or offer_row.capacity_reserved_at is null or offer_row.capacity_consumed_at is not null then
      raise exception using errcode='23514',message='OFFER_RESERVATION_INVALID';
    end if;

    maximum_members:=case when project.participation_mode='solo' then 1 else greatest(
      coalesce(project.max_team_size,project.target_team_size,project.team_size_threshold,project.min_team_size,1),1
    ) end;

    select count(*)::integer into occupied
    from public.project_members
    where project_id=offer_row.project_id and membership_status in ('waiting','active');

    select count(*)::integer into reserved
    from public.project_offers
    where project_id=offer_row.project_id
      and status in ('pending','accepted')
      and capacity_released_at is null
      and capacity_consumed_at is null;

    -- Current pending Offer is already one of the live reservations, so equality
    -- with maximum is valid. Only an over-capacity invariant is rejected.
    if occupied+reserved>maximum_members then
      raise exception using errcode='23514',message='OFFER_RESERVATION_INVALID';
    end if;
  end if;

  next_status:=case when p_action='accept' then 'accepted' else 'declined' end;

  if p_action='accept' then
    update public.project_offers
    set status='accepted',accepted_at=now_at,updated_at=now_at
    where id=offer_row.id and status='pending';
  else
    update public.project_offers
    set status='declined',declined_at=now_at,capacity_released_at=now_at,updated_at=now_at
    where id=offer_row.id and status='pending';
  end if;

  update public.project_applications set status=next_status,updated_at=now_at
  where id=app.id and status='offered';

  insert into public.project_activity_log(
    project_id,project_run_id,event_type,actor_type,actor_user_id,from_status,to_status,metadata
  ) values (
    offer_row.project_id,offer_row.project_run_id,
    case when p_action='accept' then 'offer_accepted' else 'offer_declined' end,
    'user',actor,'offered',next_status,
    jsonb_build_object(
      'offer_id',offer_row.id,'application_id',offer_row.application_id,
      'creates_membership',false,'capacity_released',p_action='decline',
      'decision_seconds',greatest(0,extract(epoch from (now_at-offer_row.offered_at))::bigint)
    )
  );

  return jsonb_build_object(
    'offer_id',offer_row.id,'application_id',offer_row.application_id,'project_id',offer_row.project_id,
    'status',next_status,'creates_membership',false,'capacity_released',p_action='decline'
  );
end;
$$;

revoke all on function public.phase8_respond_to_project_offer(uuid,text) from public,anon;
grant execute on function public.phase8_respond_to_project_offer(uuid,text) to authenticated;
