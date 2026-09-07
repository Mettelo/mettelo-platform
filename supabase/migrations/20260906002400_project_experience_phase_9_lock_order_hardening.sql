-- Phase 9 cross-phase lock-order hardening.
--
-- Phase 8 originally consumed an accepted Offer reservation after membership
-- insertion while taking its historical advisory lock namespace (7). Phase 9's
-- canonical membership capacity guard takes namespace (9) before that trigger.
-- An Offer transition can take 7 and then 9, so retaining membership 9 -> 7
-- creates an avoidable deadlock cycle under concurrent Offer/membership writes.
--
-- Reservation consumption now re-enters the already-canonical Phase 9 capacity
-- lock instead. Offer creation is finally serialized by the Phase 9 Offer guard,
-- and membership formation is serialized by the Phase 9 membership guard, so
-- all capacity-changing boundaries converge on one lock without deleting any
-- Phase 8 history or introducing a second reservation system.

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

  perform public.phase9_lock_project_capacity(new.project_id);

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
      'capacity_consumed',true,
      'capacity_lock','phase9'
    )
  );

  return new;
end;
$$;

revoke all on function public.phase8_consume_offer_reservation_on_membership() from public,anon,authenticated;
