-- Project lifecycle invariants.
-- Defence in depth for Admin creation, workbook imports and future write paths.

-- Existing draft records are normalised to the canonical safe draft state.
update public.projects
set visibility='private', applications_open=false, updated_at=now()
where status='draft' and (visibility<>'private' or applications_open=true);

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
  if new.status='draft' and (new.visibility<>'private' or new.applications_open=true) then
    raise exception 'Draft projects must be private with applications closed';
  end if;
  if new.applications_open=true and new.visibility<>'public' then
    raise exception 'Projects accepting applications must be public';
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
before insert or update of project_type,status,visibility,applications_open,partner_name
on public.projects
for each row execute function public.enforce_project_lifecycle_invariants();

create or replace function public.guard_partner_single_run()
returns trigger
language plpgsql
set search_path=public
as $$
declare kind text;
begin
  select project_type into kind from public.projects where id=new.project_id;
  if kind='partner' and exists(
    select 1 from public.project_runs where project_id=new.project_id and id<>coalesce(new.id,'00000000-0000-0000-0000-000000000000'::uuid)
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
