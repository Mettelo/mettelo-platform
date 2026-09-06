-- Phase 9 Offer capacity prevalidation.
-- Align the Phase 8 REVIEW_REQUIRED Offer boundary with Phase 9 live capacity:
-- canonical memberships plus pending/accepted reservations that have not been
-- released or consumed into membership.

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
