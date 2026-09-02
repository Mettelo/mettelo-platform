-- Project lifecycle invariants.
-- Defence in depth for Admin creation, workbook imports and future write paths.

-- Normalise legacy combinations before installing the invariant triggers.
update public.projects
set visibility='private', applications_open=false, updated_at=now()
where status='draft' and (visibility<>'private' or applications_open=true);

update public.projects
set applications_open=false, updated_at=now()
where applications_open=true and visibility<>'public';

update public.projects
set applications_open=false, updated_at=now()
where status in ('completed','cancelled','archived') and applications_open=true;

update public.projects
set visibility='private', applications_open=false, updated_at=now()
where status='archived' and (visibility<>'private' or applications_open=true);

-- Partner Projects are single engagements. Once delivery starts, intake is closed.
update public.projects
set applications_open=false, updated_at=now()
where project_type='partner' and status in ('active','review','completed','cancelled','archived') and applications_open=true;

-- A canonical Open Project does not have a one-time intake deadline. Cohorts recur.
update public.projects
set application_deadline=null, updated_at=now()
where project_type='open' and application_deadline is not null;

-- No project may advertise live applications when its configured roles cannot
-- fill the required team. Admin can repair the role configuration and resume intake.
update public.projects p
set applications_open=false, updated_at=now()
where p.applications_open=true
  and coalesce((
    select sum(greatest(r.openings,0))
    from public.project_roles r
    where r.project_id=p.id
  ),0) < greatest(coalesce(p.team_size_threshold,1),1);

create or replace function public.enforce_project_lifecycle_invariants()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  if new.project_type not in ('open','partner') then
    raise exception 'Project type must be open or partner';
  end if;

  if new.project_type='partner' and nullif(btrim(coalesce(new.partner_name,'')),'') is null then
    raise exception 'Partner Project requires a partner name';
  end if;

  if new.project_type='open' and new.application_deadline is not null then
    raise exception 'Open Projects use continuous cohort intake and cannot have a project-level application deadline';
  end if;

  if new.status='draft' and (new.visibility<>'private' or new.applications_open=true) then
    raise exception 'Draft projects must be private with applications closed';
  end if;

  if new.applications_open=true and new.visibility<>'public' then
    raise exception 'Projects accepting applications must be public';
  end if;

  if new.applications_open=true and new.project_type='open' and new.status not in ('pilot','recruiting','open','forming','active','review') then
    raise exception 'Open Project status cannot accept applications';
  end if;

  if new.applications_open=true and new.project_type='partner' and new.status not in ('pilot','recruiting','open','forming') then
    raise exception 'Partner Project intake must close before the engagement starts';
  end if;

  if new.status in ('completed','cancelled','archived') and new.applications_open=true then
    raise exception 'Terminal projects cannot accept applications';
  end if;

  if new.status='archived' and new.visibility<>'private' then
    raise exception 'Archived projects must be private';
  end if;

  -- Returning to Draft is only an authoring correction before operational history.
  -- Once members/applications/delivery evidence exist, Pause or Archive preserves truth.
  if tg_op='UPDATE' and new.status='draft' and old.status<>'draft' and (
    exists(select 1 from public.project_applications a where a.project_id=new.id and a.status not in ('declined','withdrawn'))
    or exists(select 1 from public.project_members m where m.project_id=new.id)
    or exists(select 1 from public.project_runs r where r.project_id=new.id and r.has_started=true)
    or exists(select 1 from public.contributions c where c.project_id=new.id)
  ) then
    raise exception 'Projects with operational history cannot return to Draft';
  end if;

  -- Archiving is permanent catalogue retirement, not a way to strand live work.
  if tg_op='UPDATE' and new.status='archived' and old.status<>'archived' and (
    exists(select 1 from public.project_applications a where a.project_id=new.id and a.status in ('submitted','in_review','shortlisted','approved','accepted','waiting_for_team'))
    or exists(select 1 from public.project_members m where m.project_id=new.id and m.membership_status in ('waiting','active'))
    or exists(select 1 from public.project_runs r where r.project_id=new.id and r.has_started=true and r.status not in ('completed','cancelled'))
  ) then
    raise exception 'Projects with pending applications or live teams cannot be archived';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_project_lifecycle_invariants on public.projects;
create trigger trg_enforce_project_lifecycle_invariants
before insert or update of project_type,status,visibility,applications_open,partner_name,application_deadline
on public.projects
for each row execute function public.enforce_project_lifecycle_invariants();

-- Partner Projects are deliberately one engagement/run. A second run is always an
-- explicit new Partner Project, never an automatic Open Project cohort.
create or replace function public.guard_partner_single_run()
returns trigger
language plpgsql
set search_path=public
as $$
declare kind text;
begin
  select project_type into kind from public.projects where id=new.project_id;
  if kind='partner' and exists(
    select 1 from public.project_runs
    where project_id=new.project_id
      and id<>coalesce(new.id,'00000000-0000-0000-0000-000000000000'::uuid)
  ) then
    raise exception 'Partner Projects support one engagement run only';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_partner_single_run on public.project_runs;
create trigger trg_guard_partner_single_run
before insert or update of project_id
on public.project_runs
for each row execute function public.guard_partner_single_run();

-- Waiting/active membership is a per-run invariant. The API checks first for a
-- useful response, but this trigger is authoritative under concurrent approvals.
create or replace function public.guard_project_member_role_capacity()
returns trigger
language plpgsql
set search_path=public
as $$
declare
  role_project uuid;
  run_project uuid;
  max_openings integer;
  required_team integer;
  occupied_role integer;
  occupied_team integer;
begin
  if new.membership_status not in ('waiting','active') or new.project_role_id is null or new.project_run_id is null then
    return new;
  end if;

  select project_id, openings into role_project, max_openings
  from public.project_roles
  where id=new.project_role_id;

  if role_project is null or role_project<>new.project_id or coalesce(max_openings,0)<1 then
    raise exception using errcode='23514', message='Project member role is not valid for this project';
  end if;

  select project_id, greatest(coalesce(required_team_size,team_size_threshold,1),1)
  into run_project, required_team
  from public.project_runs
  where id=new.project_run_id;

  if run_project is null or run_project<>new.project_id then
    raise exception using errcode='23514', message='Project run is not valid for this project';
  end if;

  -- One lock per run serialises every role assignment in the cohort. This prevents
  -- two different roles racing past the total team threshold as well as same-role races.
  perform pg_advisory_xact_lock(hashtextextended(new.project_run_id::text,0));

  select count(*)::integer into occupied_team
  from public.project_members
  where project_run_id=new.project_run_id
    and membership_status in ('waiting','active')
    and id<>new.id;

  if occupied_team>=required_team then
    raise exception using errcode='23514', message='Project cohort capacity exceeded';
  end if;

  select count(*)::integer into occupied_role
  from public.project_members
  where project_run_id=new.project_run_id
    and project_role_id=new.project_role_id
    and membership_status in ('waiting','active')
    and id<>new.id;

  if occupied_role>=max_openings then
    raise exception using errcode='23514', message='Project role capacity exceeded for this cohort';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_project_member_role_capacity on public.project_members;
create trigger trg_guard_project_member_role_capacity
before insert or update of project_id,project_run_id,project_role_id,membership_status
on public.project_members
for each row execute function public.guard_project_member_role_capacity();

-- A role that already has live members cannot be deleted or reduced below current
-- occupancy. An application-open project also cannot be edited into insufficient
-- total role capacity after it has passed publication checks.
create or replace function public.guard_project_role_configuration()
returns trigger
language plpgsql
set search_path=public
as $$
declare
  pid uuid;
  role_id uuid;
  live_openings boolean;
  required_team integer;
  configured_capacity integer;
  maximum_occupied integer;
begin
  pid:=case when tg_op='DELETE' then old.project_id else new.project_id end;
  role_id:=case when tg_op='DELETE' then old.id else new.id end;

  select applications_open, greatest(coalesce(team_size_threshold,1),1)
  into live_openings, required_team
  from public.projects
  where id=pid;

  select coalesce(max(member_count),0)::integer into maximum_occupied
  from (
    select count(*)::integer as member_count
    from public.project_members
    where project_id=pid
      and project_role_id=role_id
      and membership_status in ('waiting','active')
    group by project_run_id
  ) occupied_by_run;

  if tg_op='DELETE' and maximum_occupied>0 then
    raise exception using errcode='23514', message='A role with waiting or active members cannot be deleted';
  end if;

  if tg_op<>'DELETE' and new.openings<maximum_occupied then
    raise exception using errcode='23514', message='Role openings cannot be lower than current cohort occupancy';
  end if;

  if live_openings=true then
    select coalesce(sum(greatest(openings,0)),0)::integer into configured_capacity
    from public.project_roles
    where project_id=pid;

    if configured_capacity<required_team then
      raise exception using errcode='23514', message='Application-open projects require enough role capacity for the full team';
    end if;
  end if;

  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_project_role_configuration on public.project_roles;
create trigger trg_guard_project_role_configuration
after insert or update of project_id,openings or delete
on public.project_roles
for each row execute function public.guard_project_role_configuration();
