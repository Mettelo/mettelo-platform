-- Phase 9 capacity-change safety.
-- Mode changes are evaluated against their effective resulting maximum, including
-- SOLO => 1 even when an older writer supplied stale capacity fields. This keeps
-- active/forming history valid and prevents configuration from creating an
-- already-overfilled project.

create or replace function public.phase9_validate_project_capacity_change()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  occupied integer:=0;
  reserved integer:=0;
  effective_maximum integer;
begin
  if new.max_team_size is not distinct from old.max_team_size
     and new.participation_mode is not distinct from old.participation_mode then return new; end if;

  perform public.phase9_lock_project_capacity(new.id);
  effective_maximum:=case
    when new.participation_mode='solo' then 1
    else greatest(coalesce(new.max_team_size,new.target_team_size,new.min_team_size,new.team_size_threshold,1),1)
  end;

  select count(*)::integer into occupied
  from public.project_members
  where project_id=new.id and membership_status in ('waiting','active');

  select count(*)::integer into reserved
  from public.project_offers
  where project_id=new.id
    and status in ('pending','accepted')
    and capacity_released_at is null
    and capacity_consumed_at is null;

  if occupied+reserved>effective_maximum then
    raise exception using errcode='23514',message='MAXIMUM_BELOW_CURRENT_CAPACITY';
  end if;
  return new;
end;
$$;

revoke all on function public.phase9_validate_project_capacity_change() from public,anon,authenticated;
