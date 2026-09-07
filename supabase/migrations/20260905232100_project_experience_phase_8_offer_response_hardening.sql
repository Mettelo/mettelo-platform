-- Phase 8 hardening: preserve expiry writes and return expired-offer details for
-- canonical scheduled communication. This intentionally replaces functions from
-- 20260905232000 before the branch is eligible to merge.

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

  -- Do not raise after expiring: PostgreSQL exceptions roll back the transaction.
  -- Return the durable EXPIRED result so the HTTP layer can explain the conflict.
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
      offer_row.project_id,offer_row.project_run_id,'project_offer_expired','system',null,'pending','expired',
      jsonb_build_object('offer_id',offer_row.id,'application_id',offer_row.application_id,'source','member_response_expiry_guard')
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
  if project.status in ('cancelled','completed','archived') then
    raise exception using errcode='23514',message='PROJECT_NOT_JOINABLE';
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
    case when p_action='accept' then 'project_offer_accepted' else 'project_offer_declined' end,
    'user',
    actor,
    'pending',
    next_status,
    jsonb_build_object(
      'offer_id',offer_row.id,
      'application_id',offer_row.application_id,
      'creates_membership',false,
      'capacity_released',p_action='decline'
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
  expired_rows jsonb:='[]'::jsonb;
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
        offer_row.project_id,offer_row.project_run_id,'project_offer_expired','system','pending','expired',
        jsonb_build_object('offer_id',offer_row.id,'application_id',offer_row.application_id,'source','phase8_expiry_worker')
      );

      expired_rows:=expired_rows||jsonb_build_array(jsonb_build_object(
        'offer_id',offer_row.id,
        'application_id',offer_row.application_id,
        'project_id',offer_row.project_id,
        'user_id',offer_row.user_id,
        'expires_at',offer_row.expires_at
      ));
      expired_count:=expired_count+1;
    end if;
  end loop;

  return jsonb_build_object('expired',expired_count,'offers',expired_rows);
end;
$$;

revoke all on function public.phase8_expire_project_offers(integer) from public,anon,authenticated;
grant execute on function public.phase8_expire_project_offers(integer) to service_role;
