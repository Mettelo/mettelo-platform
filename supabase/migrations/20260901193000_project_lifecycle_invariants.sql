-- Project lifecycle invariants.
-- Defence in depth for Admin creation, workbook imports and future write paths.

-- Normalise legacy combinations before installing the invariant trigger.
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

-- Role capacity is a per-run invariant. The application UI and approval API both
-- check it for useful errors, but this trigger is authoritative and race-safe.
create or replace function public.guard_project_member_role_capacity()
returns trigger
language plpgsql
set search_path=public
as $$
declare
  role_project uuid;
  run_project uuid;
  max_openings integer;
  occupied integer;
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

  select project_id into run_project
  from public.project_runs
  where id=new.project_run_id;

  if run_project is null or run_project<>new.project_id then
    raise exception using errcode='23514', message='Project run is not valid for this project';
  end if;

  -- Serialize competing approvals for the same run + role before counting.
  perform pg_advisory_xact_lock(hashtextextended(new.project_run_id::text||':'||new.project_role_id::text,0));

  select count(*)::integer into occupied
  from public.project_members
  where project_run_id=new.project_run_id
    and project_role_id=new.project_role_id
    and membership_status in ('waiting','active')
    and id<>new.id;

  if occupied>=max_openings then
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
