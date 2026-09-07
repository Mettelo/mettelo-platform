-- Project Experience Phase 8: durable project offers and explicit member response.
--
-- Boundaries:
--   * OFFERED selection creates a durable reservation, not membership.
--   * ACCEPT / DECLINE / EXPIRE are explicit offer lifecycle transitions.
--   * Accepted offers remain capacity-reserving until later team-formation phases
--     convert them into canonical membership.
--   * Decline/expiry releases capacity.

create table if not exists public.project_offers (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.project_applications(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  project_run_id uuid references public.project_runs(id) on delete set null,
  status text not null default 'pending',
  offered_at timestamptz not null default now(),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  declined_at timestamptz,
  expired_at timestamptz,
  offered_by_user_id uuid references auth.users(id) on delete set null,
  capacity_reserved_at timestamptz not null default now(),
  capacity_released_at timestamptz,
  reminder_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_offers_application_unique unique(application_id),
  constraint project_offers_status_check check (status in ('pending','accepted','declined','expired')),
  constraint project_offers_expiry_check check (expires_at > offered_at),
  constraint project_offers_state_timestamps_check check (
    (status='pending' and accepted_at is null and declined_at is null and expired_at is null and capacity_released_at is null) or
    (status='accepted' and accepted_at is not null and declined_at is null and expired_at is null and capacity_released_at is null) or
    (status='declined' and declined_at is not null and accepted_at is null and expired_at is null and capacity_released_at is not null) or
    (status='expired' and expired_at is not null and accepted_at is null and declined_at is null and capacity_released_at is not null)
  )
);

comment on table public.project_offers is
  'Canonical Project Experience offer/reservation record. Offer selection is distinct from application review and later project membership.';
comment on column public.project_offers.capacity_reserved_at is
  'Timestamp at which this offer began consuming one project place. Pending and accepted offers continue to reserve capacity until a later phase consumes the reservation into membership.';
comment on column public.project_offers.capacity_released_at is
  'Set only when the reservation is released by decline or expiry in Phase 8.';
comment on column public.project_offers.reminder_sent_at is
  'Bounded Phase 8 offer-expiry reminder marker used to prevent duplicate reminder sends.';

create index if not exists project_offers_project_status_idx
  on public.project_offers(project_id,status);
create index if not exists project_offers_user_status_idx
  on public.project_offers(user_id,status,offered_at desc);
create index if not exists project_offers_pending_expiry_idx
  on public.project_offers(expires_at)
  where status='pending';
create index if not exists project_offers_pending_reminder_idx
  on public.project_offers(expires_at)
  where status='pending' and reminder_sent_at is null;
create index if not exists project_offers_run_idx
  on public.project_offers(project_run_id)
  where project_run_id is not null;

alter table public.project_offers enable row level security;

drop policy if exists project_offers_member_select_own on public.project_offers;
create policy project_offers_member_select_own
on public.project_offers
for select
to authenticated
using (user_id=auth.uid());

drop policy if exists project_offers_admin_select_all on public.project_offers;
create policy project_offers_admin_select_all
on public.project_offers
for select
to authenticated
using (coalesce(auth.jwt()->'app_metadata'->>'role','')='admin');

grant select on public.project_offers to authenticated;
revoke insert,update,delete on public.project_offers from anon,authenticated;

-- Phase 8 introduces EXPIRED as a first-class application tracker outcome.
alter table public.project_applications
  drop constraint if exists project_applications_status_check;

alter table public.project_applications
  add constraint project_applications_status_check
  check (
    status in (
      'submitted',
      'in_review',
      'clarification_requested',
      'shortlisted',
      'offered',
      'approved',
      'accepted',
      'waiting_for_team',
      'team_complete',
      'declined',
      'expired',
      'withdrawn'
    )
  );

-- Capacity validation for any transition into OFFERED. This trigger is additive to
-- the Phase 7 review RPC and closes the Phase 8 gap where ACCEPTED offers still
-- reserve a place before later team-formation creates membership.
create or replace function public.phase8_validate_offer_capacity()
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

revoke all on function public.phase8_validate_offer_capacity() from public,anon,authenticated;

drop trigger if exists project_application_phase8_offer_capacity on public.project_applications;
create trigger project_application_phase8_offer_capacity
before update of status on public.project_applications
for each row
when (new.status='offered' and old.status is distinct from new.status)
execute function public.phase8_validate_offer_capacity();

-- Convert the Phase 7 OFFERED transition into a durable offer reservation inside
-- the same transaction. Programme default validity is 72 hours until a future
-- project-level offer-policy setting is introduced deliberately.
create or replace function public.phase8_create_offer_from_application()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
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
    on conflict (application_id) do nothing;
  end if;
  return new;
end;
$$;

revoke all on function public.phase8_create_offer_from_application() from public,anon,authenticated;

drop trigger if exists project_application_phase8_offer_create on public.project_applications;
create trigger project_application_phase8_offer_create
after update of status on public.project_applications
for each row
when (new.status='offered' and old.status is distinct from new.status)
execute function public.phase8_create_offer_from_application();

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
        'status',offer_row.status,
        'already_in_state',true,
        'creates_membership',false
      );
    end if;
    raise exception using errcode='23514',message='OFFER_NOT_PENDING';
  end if;

  if offer_row.expires_at<=now_at then
    update public.project_offers
    set status='expired',expired_at=now_at,capacity_released_at=now_at,updated_at=now_at
    where id=offer_row.id;

    update public.project_applications
    set status='expired',updated_at=now_at
    where id=offer_row.application_id and status='offered';

    insert into public.project_activity_log(
      project_id,project_run_id,event_type,actor_type,actor_user_id,from_status,to_status,metadata
    ) values (
      offer_row.project_id,offer_row.project_run_id,'project_offer_expired','system',null,'pending','expired',
      jsonb_build_object('offer_id',offer_row.id,'application_id',offer_row.application_id,'source','member_response_expiry_guard')
    );

    raise exception using errcode='23514',message='OFFER_EXPIRED';
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

-- Service-only expiry worker. SKIP LOCKED makes repeated/overlapping cron runs safe.
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
        offer_row.project_id,offer_row.project_run_id,'project_offer_expired','system','pending','expired',
        jsonb_build_object('offer_id',offer_row.id,'application_id',offer_row.application_id,'source','phase8_expiry_worker')
      );
      expired_count:=expired_count+1;
    end if;
  end loop;

  return jsonb_build_object('expired',expired_count);
end;
$$;

revoke all on function public.phase8_expire_project_offers(integer) from public,anon,authenticated;
grant execute on function public.phase8_expire_project_offers(integer) to service_role;

-- Claim at most one bounded reminder per pending offer during the final 24 hours.
-- Marking before delivery is intentional dedupe protection; offer acceptance/decline
-- remains available even if a reminder provider is unavailable.
create or replace function public.phase8_claim_offer_reminders(
  p_limit integer default 100
)
returns table(
  offer_id uuid,
  application_id uuid,
  project_id uuid,
  user_id uuid,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path=public
as $$
begin
  return query
  with candidates as (
    select id
    from public.project_offers
    where status='pending'
      and reminder_sent_at is null
      and expires_at>now()
      and expires_at<=now()+interval '24 hours'
    order by expires_at asc
    for update skip locked
    limit greatest(1,least(coalesce(p_limit,100),500))
  ), claimed as (
    update public.project_offers o
    set reminder_sent_at=now(),updated_at=now()
    from candidates c
    where o.id=c.id
    returning o.id,o.application_id,o.project_id,o.user_id,o.expires_at
  )
  select c.id,c.application_id,c.project_id,c.user_id,c.expires_at from claimed c;
end;
$$;

revoke all on function public.phase8_claim_offer_reminders(integer) from public,anon,authenticated;
grant execute on function public.phase8_claim_offer_reminders(integer) to service_role;
