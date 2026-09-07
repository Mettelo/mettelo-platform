-- Phase 9 Offer lock-order hardening.
--
-- A pending -> accepted response preserves the same live reservation. Phase 8
-- already locks that Offer row before updating its status. Re-acquiring the
-- Phase 9 project-capacity advisory lock from the Offer trigger for this
-- reservation-neutral transition can invert the membership path (capacity lock
-- -> Offer row) and create a row-lock/advisory-lock deadlock.
--
-- Only transitions that can ADD or MOVE live reserved capacity need the Phase 9
-- capacity guard. Reservation-neutral pending <-> accepted transitions within the
-- same project retain their existing reserved place and therefore return without
-- taking a new advisory lock. Terminal/released/consumed states likewise add no
-- capacity and return immediately.

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
  old_live boolean:=false;
  new_live boolean:=false;
begin
  new_live:=new.status in ('pending','accepted')
    and new.capacity_released_at is null
    and new.capacity_consumed_at is null;

  if not new_live then return new; end if;

  if tg_op='UPDATE' then
    old_live:=old.status in ('pending','accepted')
      and old.capacity_released_at is null
      and old.capacity_consumed_at is null;

    -- No capacity is added or moved: preserve the existing reservation without
    -- introducing row-lock -> advisory-lock inversion during member acceptance.
    if old_live and old.project_id is not distinct from new.project_id then
      return new;
    end if;
  end if;

  select * into project_row
  from public.projects
  where id=new.project_id
  for update;
  if project_row.id is null then
    raise exception using errcode='P0002',message='PROJECT_NOT_FOUND';
  end if;

  perform public.phase9_lock_project_capacity(new.project_id);

  maximum_members:=case
    when project_row.participation_mode='solo' then 1
    else greatest(coalesce(project_row.max_team_size,project_row.target_team_size,project_row.min_team_size,project_row.team_size_threshold,1),1)
  end;

  select count(*)::integer into occupied
  from public.project_members
  where project_id=new.project_id
    and membership_status in ('waiting','active');

  select count(*)::integer into reserved
  from public.project_offers
  where project_id=new.project_id
    and status in ('pending','accepted')
    and capacity_released_at is null
    and capacity_consumed_at is null
    and (tg_op='INSERT' or id<>new.id);

  if occupied+reserved>=maximum_members then
    raise exception using errcode='23514',message='OFFER_CAPACITY_FULL';
  end if;

  return new;
end;
$$;

revoke all on function public.phase9_guard_offer_capacity() from public,anon,authenticated;
