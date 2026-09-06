-- Phase 8 -> later team-formation compatibility.
-- Accepted Offers reserve capacity until canonical membership exists. When team
-- formation creates that membership, the same reservation is marked consumed so
-- the member and Offer are never counted twice. AUTO memberships have no Offer
-- and are unaffected.

alter table public.project_offers
  add column if not exists capacity_consumed_at timestamptz;

comment on column public.project_offers.capacity_consumed_at is
  'Set when a canonical project_members row consumes an accepted Offer reservation. A consumed accepted Offer remains historical ACCEPTED evidence but no longer counts as a separate reserved place.';

alter table public.project_offers
  drop constraint if exists project_offers_state_timestamps_check;

alter table public.project_offers
  add constraint project_offers_state_timestamps_check check (
    (status='pending' and accepted_at is null and declined_at is null and expired_at is null and capacity_released_at is null and capacity_consumed_at is null) or
    (status='accepted' and accepted_at is not null and declined_at is null and expired_at is null and capacity_released_at is null) or
    (status='declined' and declined_at is not null and accepted_at is null and expired_at is null and capacity_released_at is not null and capacity_consumed_at is null) or
    (status='expired' and expired_at is not null and accepted_at is null and declined_at is null and capacity_released_at is not null and capacity_consumed_at is null)
  );

create index if not exists project_offers_active_reservation_idx
  on public.project_offers(project_id,status)
  where status in ('pending','accepted')
    and capacity_released_at is null
    and capacity_consumed_at is null;

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

  perform pg_advisory_xact_lock(hashtextextended(project.id::text,7));

  maximum_members:=greatest(coalesce(project.max_team_size,project.target_team_size,project.team_size_threshold,project.min_team_size,1),1);
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

-- Prevent legacy/generic application mutation from reopening or silently
-- withdrawing a terminal Phase 8 decision. ACCEPTED is allowed to advance only
-- into the later team/readiness states. This does not affect AUTO applications,
-- because they have no project_offers row.
create or replace function public.phase8_guard_offer_application_terminal_state()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  offer_state text;
begin
  if new.status is not distinct from old.status then return new; end if;

  select status into offer_state
  from public.project_offers
  where application_id=old.id
  limit 1;

  if offer_state is null then return new; end if;

  if offer_state='accepted' and old.status='accepted' and new.status not in ('waiting_for_team','team_complete') then
    raise exception using errcode='23514',message='PHASE8_ACCEPTED_TERMINAL';
  end if;
  if offer_state='declined' and old.status='declined' then
    raise exception using errcode='23514',message='PHASE8_DECLINED_TERMINAL';
  end if;
  if offer_state='expired' and old.status='expired' then
    raise exception using errcode='23514',message='PHASE8_EXPIRED_TERMINAL';
  end if;

  return new;
end;
$$;

revoke all on function public.phase8_guard_offer_application_terminal_state() from public,anon,authenticated;

drop trigger if exists project_application_phase8_terminal_guard on public.project_applications;
create trigger project_application_phase8_terminal_guard
before update of status on public.project_applications
for each row execute function public.phase8_guard_offer_application_terminal_state();

-- Canonical membership creation consumes exactly one accepted reservation. The
-- update happens under the same project advisory lock used for Offer capacity.
create or replace function public.phase8_consume_offer_reservation_on_membership()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  consumed public.project_offers%rowtype;
begin
  if new.membership_status not in ('waiting','active') then return new; end if;

  perform pg_advisory_xact_lock(hashtextextended(new.project_id::text,7));

  select * into consumed
  from public.project_offers
  where project_id=new.project_id
    and user_id=new.user_id
    and status='accepted'
    and capacity_released_at is null
    and capacity_consumed_at is null
  order by accepted_at asc
  limit 1
  for update;

  if consumed.id is null then return new; end if;

  update public.project_offers
  set capacity_consumed_at=now(),
      project_run_id=coalesce(project_run_id,new.project_run_id),
      updated_at=now()
  where id=consumed.id;

  insert into public.project_activity_log(
    project_id,project_run_id,event_type,actor_type,actor_user_id,from_status,to_status,metadata
  ) values (
    new.project_id,new.project_run_id,'offer_capacity_consumed','system',null,'accepted','accepted',
    jsonb_build_object(
      'offer_id',consumed.id,
      'application_id',consumed.application_id,
      'membership_id',new.id,
      'capacity_consumed',true
    )
  );

  return new;
end;
$$;

revoke all on function public.phase8_consume_offer_reservation_on_membership() from public,anon,authenticated;

drop trigger if exists project_member_phase8_offer_consumption on public.project_members;
create trigger project_member_phase8_offer_consumption
after insert or update of membership_status,project_run_id on public.project_members
for each row
when (new.membership_status in ('waiting','active'))
execute function public.phase8_consume_offer_reservation_on_membership();
