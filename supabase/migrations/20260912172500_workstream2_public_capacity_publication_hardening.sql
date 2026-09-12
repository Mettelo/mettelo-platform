-- Workstream 2 — canonical public capacity/recruitment and publication hardening.
-- Additive/superseding only. Historical projects/runs/memberships are not rewritten.

-- Public capacity is a privacy-safe projection of the current canonical run and
-- project geometry. Applications never count as members. Pending/accepted offers
-- reserve hard-capacity but are reported separately from confirmed membership.
create or replace function public.get_public_project_capacity(p_project_id uuid)
returns table(
  project_id uuid,
  participation_mode text,
  confirmed_members integer,
  reserved_members integer,
  occupied_places integer,
  min_team_size integer,
  target_team_size integer,
  max_team_size integer,
  capacity_available boolean,
  recruitment_state text
)
language plpgsql
security definer
stable
set search_path=public
as $$
declare
  v_project public.projects%rowtype;
  v_run public.project_runs%rowtype;
  v_confirmed integer:=0;
  v_reserved integer:=0;
  v_max integer;
begin
  select * into v_project
  from public.projects p
  where p.id=p_project_id
    and p.visibility='public'
    and p.status in ('pilot','recruiting','open','forming','active','review','completed');
  if not found then return; end if;

  select * into v_run
  from public.project_runs r
  where r.project_id=p_project_id
    and r.status in ('forming','active','review','paused')
  order by
    case r.status when 'active' then 0 when 'forming' then 1 when 'review' then 2 else 3 end,
    r.run_number desc
  limit 1;

  if v_run.id is not null then
    select count(*)::integer into v_confirmed
    from public.project_members pm
    where pm.project_run_id=v_run.id
      and pm.membership_status in ('waiting','active');
  else
    -- A published project without a run may still be forming its first cohort.
    -- Count only live canonical memberships; applications remain excluded.
    select count(*)::integer into v_confirmed
    from public.project_members pm
    where pm.project_id=p_project_id
      and pm.project_run_id is null
      and pm.membership_status in ('waiting','active');
  end if;

  select count(*)::integer into v_reserved
  from public.project_offers o
  where o.project_id=p_project_id
    and (v_run.id is null or o.project_run_id=v_run.id)
    and o.status in ('pending','accepted')
    and o.capacity_released_at is null
    and o.capacity_consumed_at is null;

  v_max:=case
    when v_project.participation_mode='solo' then 1
    else greatest(coalesce(v_project.max_team_size,v_project.target_team_size,v_project.min_team_size,v_project.team_size_threshold,1),1)
  end;

  return query select
    v_project.id,
    v_project.participation_mode,
    v_confirmed,
    v_reserved,
    v_confirmed+v_reserved,
    case when v_project.participation_mode='solo' then 1 else v_project.min_team_size end,
    case when v_project.participation_mode='solo' then 1 else v_project.target_team_size end,
    v_max,
    (
      coalesce(v_project.applications_open,false)=true
      and v_confirmed+v_reserved<v_max
      and (v_run.id is null or (v_run.status='forming' or coalesce(v_run.recruitment_open,false)=true))
    ),
    case
      when v_project.status='completed' then 'completed'
      when v_confirmed+v_reserved>=v_max then 'full'
      when coalesce(v_project.applications_open,false) is not true then 'closed'
      when v_run.id is not null and v_run.status='active' and coalesce(v_run.recruitment_open,false) is not true then 'joining_closed'
      when v_run.id is not null and v_run.status in ('review','paused') then 'closed'
      when v_project.status='active' then 'active'
      when v_project.participation_mode='solo' then 'open'
      when v_confirmed>=greatest(coalesce(v_project.min_team_size,v_project.team_size_threshold,1),1) then 'ready_for_eligibility'
      when v_confirmed+v_reserved>0 then 'team_forming'
      else 'open'
    end;
end;
$$;
revoke all on function public.get_public_project_capacity(uuid) from public;
grant execute on function public.get_public_project_capacity(uuid) to anon,authenticated,service_role;

-- Catalogue projection avoids N per-card privileged queries and exposes only the
-- same safe aggregate fields as the single-project function.
create or replace function public.get_public_project_capacities()
returns table(
  project_id uuid,
  participation_mode text,
  confirmed_members integer,
  reserved_members integer,
  occupied_places integer,
  min_team_size integer,
  target_team_size integer,
  max_team_size integer,
  capacity_available boolean,
  recruitment_state text
)
language sql
security definer
stable
set search_path=public
as $$
  select c.*
  from public.projects p
  cross join lateral public.get_public_project_capacity(p.id) c
  where p.visibility='public'
    and p.status in ('pilot','recruiting','open','forming','active','review','completed')
  order by p.created_at desc,p.id desc;
$$;
revoke all on function public.get_public_project_capacities() from public;
grant execute on function public.get_public_project_capacities() to anon,authenticated,service_role;

-- New projects must enter governance as non-public drafts. This closes the INSERT
-- hole that an UPDATE-only publication trigger cannot protect. Existing rows and
-- migration reconstruction are unaffected because this trigger is installed only
-- after all historical migrations have completed.
create or replace function public.workstream2_guard_project_public_insert()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if new.visibility='public'
     or new.status in ('pilot','recruiting','open','forming','active','review','completed')
     or coalesce(new.applications_open,false)=true then
    raise exception using errcode='23514',message='PROJECT_MUST_ENTER_AS_GOVERNED_DRAFT';
  end if;
  return new;
end;
$$;
revoke all on function public.workstream2_guard_project_public_insert() from public,anon,authenticated;

drop trigger if exists workstream2_guard_project_public_insert on public.projects;
create trigger workstream2_guard_project_public_insert
before insert on public.projects
for each row execute function public.workstream2_guard_project_public_insert();
