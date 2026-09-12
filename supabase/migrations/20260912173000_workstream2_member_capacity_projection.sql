-- Workstream 2 — member-safe canonical capacity projection.
-- Aggregates only team geometry/count/state; never exposes member identities or run IDs.
create or replace function public.get_member_project_capacities(p_project_ids uuid[])
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
  v_confirmed integer;
  v_reserved integer;
  v_max integer;
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTH_REQUIRED'; end if;
  if coalesce(array_length(p_project_ids,1),0)>250 then raise exception using errcode='22023',message='TOO_MANY_PROJECTS'; end if;

  for v_project in
    select p.* from public.projects p
    where p.id=any(coalesce(p_project_ids,'{}'::uuid[]))
      and p.visibility in ('public','members')
      and p.status in ('pilot','recruiting','open','forming','active','review','completed')
  loop
    v_run:=null;v_confirmed:=0;v_reserved:=0;
    select * into v_run from public.project_runs r
    where r.project_id=v_project.id and r.status in ('forming','active','review','paused')
    order by case r.status when 'active' then 0 when 'forming' then 1 when 'review' then 2 else 3 end,r.run_number desc
    limit 1;

    if v_run.id is not null then
      select count(*)::integer into v_confirmed from public.project_members pm
      where pm.project_run_id=v_run.id and pm.membership_status in ('waiting','active');
    else
      select count(*)::integer into v_confirmed from public.project_members pm
      where pm.project_id=v_project.id and pm.project_run_id is null and pm.membership_status in ('waiting','active');
    end if;

    select count(*)::integer into v_reserved from public.project_offers o
    where o.project_id=v_project.id
      and (v_run.id is null or o.project_run_id=v_run.id)
      and o.status in ('pending','accepted') and o.capacity_released_at is null and o.capacity_consumed_at is null;

    v_max:=case when v_project.participation_mode='solo' then 1 else greatest(coalesce(v_project.max_team_size,v_project.target_team_size,v_project.min_team_size,v_project.team_size_threshold,1),1) end;

    project_id:=v_project.id;
    participation_mode:=v_project.participation_mode;
    confirmed_members:=v_confirmed;
    reserved_members:=v_reserved;
    occupied_places:=v_confirmed+v_reserved;
    min_team_size:=case when v_project.participation_mode='solo' then 1 else v_project.min_team_size end;
    target_team_size:=case when v_project.participation_mode='solo' then 1 else v_project.target_team_size end;
    max_team_size:=v_max;
    capacity_available:=coalesce(v_project.applications_open,false)=true and occupied_places<v_max and (v_run.id is null or v_run.status='forming' or coalesce(v_run.recruitment_open,false)=true);
    recruitment_state:=case
      when v_project.status='completed' then 'completed'
      when occupied_places>=v_max then 'full'
      when coalesce(v_project.applications_open,false) is not true then 'closed'
      when v_run.id is not null and v_run.status='active' and coalesce(v_run.recruitment_open,false) is not true then 'joining_closed'
      when v_run.id is not null and v_run.status in ('review','paused') then 'closed'
      when v_project.status='active' then 'active'
      when v_project.participation_mode='solo' then 'open'
      when v_confirmed>=greatest(coalesce(v_project.min_team_size,v_project.team_size_threshold,1),1) then 'ready_for_eligibility'
      when occupied_places>0 then 'team_forming'
      else 'open'
    end;
    return next;
  end loop;
end;
$$;
revoke all on function public.get_member_project_capacities(uuid[]) from public;
grant execute on function public.get_member_project_capacities(uuid[]) to authenticated,service_role;
