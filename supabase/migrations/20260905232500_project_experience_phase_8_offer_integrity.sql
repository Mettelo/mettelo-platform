-- Phase 8 offer integrity hardening.
-- Closes acceptance-time expiry rollback, independently enforces REVIEW_REQUIRED
-- eligibility at the Offer boundary, verifies acceptance conflicts, and emits the
-- canonical Offer analytics/audit events required by the Phase 8 contract.

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
  if new.status<>'offered' or old.status='offered' then
    return new;
  end if;

  select * into project from public.projects where id=new.project_id for update;
  if project.id is null then
    raise exception using errcode='P0002',message='PROJECT_NOT_FOUND';
  end if;

  if public.effective_project_admission_mode(project.project_type,project.admission_mode)<>'review_required' then
    raise exception using errcode='23514',message='OFFER_REQUIRES_REVIEW_REQUIRED';
  end if;

  if new.admission_decision='auto_qualified' then
    raise exception using errcode='23514',message='AUTO_OFFER_FORBIDDEN';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(project.id::text,7));

  maximum_members:=greatest(
    coalesce(project.max_team_size,project.target_team_size,project.team_size_threshold,project.min_team_size,1),
    1
  );

  select count(*)::integer into occupied
  from public.project_members
  where project_id=project.id
    and membership_status in ('waiting','active');

  select count(*)::integer into reserved
  from public.project_offers
  where project_id=project.id
    and status in ('pending','accepted')
    and capacity_released_at is null;

  if occupied+reserved>=maximum_members then
    raise exception using errcode='23514',message='OFFER_CAPACITY_FULL';
  end if;

  return new;
end;
$$;

revoke all on function public.phase8_validate_offer_eligibility_and_capacity() from public,anon,authenticated;

drop trigger if exists project_application_phase8_offer_capacity on public.project_applications;
drop trigger if exists project_application_phase8_offer_eligibility_capacity on public.project_applications;
create trigger project_application_phase8_offer_eligibility_capacity
before update of status on public.project_applications
for each row
when (new.status='offered' and old.status is distinct from new.status)
execute function public.phase8_validate_offer_eligibility_and_capacity();

create or replace function public.phase8_create_offer_from_application()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  created_offer public.project_offers%rowtype;
begin
  if new.status='offered' and old.status is distinct from new.status then
    insert into public.project_offers(
      application_id,
      project_id,
      user_id,
      project_run_id,
      status,
      offered_at,
      expires_at,
      offered_by_user_id,
      capacity_reserved_at
    ) values (
      new.id,
      new.project_id,
      new.user_id,
      new.project_run_id,
      'pending',
      now(),
      now()+interval '72 hours',
      auth.uid(),
      now()
    )
    on conflict (application_id) do nothing
    returning * into created_offer;

    if created_offer.id is not null then
      insert into public.project_activity_log(
        project_id,project_run_id,event_type,actor_type,actor_user_id,from_status,to_status,metadata
      ) values (
        new.project_id,new.project_run_id,'offer_created','user',auth.uid(),old.status,'offered',
        jsonb_build_object(
          'offer_id',created_offer.id,
          'application_id',new.id,
          'expires_at',created_offer.expires_at,
          'capacity_reserved',true
        )
      );
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.phase8_create_offer_from_application() from public,anon,authenticated;

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
  if actor is null then
    raise exception using errcode='42501',message='AUTH_REQUIRED';
  end if;
  if p_action not in ('accept','decline') then
    raise exception using errcode='23514',message='INVALID_OFFER_ACTION';
  end if;

  select * into offer_row
  from public.project_offers
  where id=p_offer_id and user_id=actor
  for update;

  if offer_row.id is null then
    raise exception using errcode='P0002',message='OFFER_NOT_FOUND';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(offer_row.project_id::text,7));

  if offer_row.status<>'pending' then
    if (p_action='accept' and offer_row.status='accepted') or
       (p_action='decline' and offer_row.status='declined') then
      return jsonb_build_object(
        'offer_id',offer_row.id,
        'application_id',offer_row.application_id,
        'project_id',offer_row.project_id,
        'status',offer_row.status,
        'already_in_state',true,
        'creates_membership',false,
        'capacity_released',offer_row.capacity_released_at is not null
      );
    end if;
    raise exception using errcode='23514',message='OFFER_NOT_PENDING';
  end if;

  -- Expiry is committed and returned as a normal domain result rather than raised,
  -- because a raised PostgreSQL exception would roll the expiry transaction back.
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
      jsonb_build_object(
        'offer_id',offer_row.id,
        'application_id',offer_row.application_id,
        'source','member_response_expiry_guard',
        'capacity_released',true
      )
    );

    return jsonb_build_object(
      'offer_id',offer_row.id,
      'application_id',offer_row.application_id,
      'project_id',offer_row.project_id,
      'status','expired',
      'expired',true,
      'creates_membership',false,
      'capacity_released',true
    );
  end if;

  select * into app from public.project_applications where id=offer_row.application_id for update;
  if app.id is null or app.user_id<>actor then
    raise exception using errcode='P0002',message='APPLICATION_NOT_FOUND';
  end if;
  if app.status<>'offered' then
    raise exception using errcode='23514',message='APPLICATION_NOT_OFFERED';
  end if;

  select * into project from public.projects where id=offer_row.project_id for update;
  if project.id is null then
    raise exception using errcode='P0002',message='PROJECT_NOT_FOUND';
  end if;
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
    if existing_membership>0 then
      raise exception using errcode='23514',message='ALREADY_PARTICIPATING';
    end if;

    if offer_row.capacity_released_at is not null or offer_row.capacity_reserved_at is null then
      raise exception using errcode='23514',message='OFFER_RESERVATION_INVALID';
    end if;

    maximum_members:=greatest(
      coalesce(project.max_team_size,project.target_team_size,project.team_size_threshold,project.min_team_size,1),
      1
    );
    select count(*)::integer into occupied
    from public.project_members
    where project_id=offer_row.project_id and membership_status in ('waiting','active');
    select count(*)::integer into reserved
    from public.project_offers
    where project_id=offer_row.project_id
      and status in ('pending','accepted')
      and capacity_released_at is null;
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

  update public.project_applications
  set status=next_status,updated_at=now_at
  where id=app.id and status='offered';

  insert into public.project_activity_log(
    project_id,project_run_id,event_type,actor_type,actor_user_id,from_status,to_status,metadata
  ) values (
    offer_row.project_id,
    offer_row.project_run_id,
    case when p_action='accept' then 'offer_accepted' else 'offer_declined' end,
    'user',
    actor,
    'offered',
    next_status,
    jsonb_build_object(
      'offer_id',offer_row.id,
      'application_id',offer_row.application_id,
      'creates_membership',false,
      'capacity_released',p_action='decline',
      'decision_seconds',greatest(0,extract(epoch from (now_at-offer_row.offered_at))::bigint)
    )
  );

  return jsonb_build_object(
    'offer_id',offer_row.id,
    'application_id',offer_row.application_id,
    'project_id',offer_row.project_id,
    'status',next_status,
    'creates_membership',false,
    'capacity_released',p_action='decline'
  );
end;
$$;

revoke all on function public.phase8_respond_to_project_offer(uuid,text) from public,anon;
grant execute on function public.phase8_respond_to_project_offer(uuid,text) to authenticated;

create or replace function public.phase8_expire_project_offers(
  p_limit integer default 100
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  offer_row public.project_offers%rowtype;
  now_at timestamptz:=now();
  expired_count integer:=0;
begin
  for offer_row in
    select *
    from public.project_offers
    where status='pending' and expires_at<=now_at
    order by expires_at asc
    for update skip locked
    limit greatest(1,least(coalesce(p_limit,100),500))
  loop
    update public.project_offers
    set status='expired',expired_at=now_at,capacity_released_at=now_at,updated_at=now_at
    where id=offer_row.id and status='pending';

    if found then
      update public.project_applications
      set status='expired',updated_at=now_at
      where id=offer_row.application_id and status='offered';

      insert into public.project_activity_log(
        project_id,project_run_id,event_type,actor_type,from_status,to_status,metadata
      ) values (
        offer_row.project_id,offer_row.project_run_id,'offer_expired','system','offered','expired',
        jsonb_build_object(
          'offer_id',offer_row.id,
          'application_id',offer_row.application_id,
          'source','phase8_expiry_worker',
          'capacity_released',true,
          'decision_seconds',greatest(0,extract(epoch from (now_at-offer_row.offered_at))::bigint)
        )
      );
      expired_count:=expired_count+1;
    end if;
  end loop;

  return jsonb_build_object('expired',expired_count);
end;
$$;

revoke all on function public.phase8_expire_project_offers(integer) from public,anon,authenticated;
grant execute on function public.phase8_expire_project_offers(integer) to service_role;
