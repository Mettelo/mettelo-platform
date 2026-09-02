-- Future-proof Capability Paths imports for the reusable Open Project lifecycle.
-- The historical importer intentionally creates new projects as private Drafts and
-- does not define named participation roles. After the entire batch commit finishes,
-- create one transparent default role only when the imported project still has no
-- explicit roles. If a future importer supplies named roles before marking the batch
-- imported, this trigger leaves those roles untouched.

create or replace function public.ensure_imported_open_project_default_roles()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if new.status<>'imported' or old.status='imported' then
    return new;
  end if;

  insert into public.project_roles(project_id,title,discipline,description,skills,openings)
  select
    p.id,
    'Project Contributor',
    null,
    'Contribute to the project deliverables with the team. Project-specific responsibilities are confirmed during team formation.',
    '{}'::text[],
    greatest(coalesce(p.team_size_threshold,1),1)
  from public.capability_path_import_project_origins origin
  join public.projects p on p.id=origin.project_id
  where origin.batch_id=new.id
    and origin.was_existing=false
    and p.project_type='open'
    and not exists(
      select 1 from public.project_roles existing
      where existing.project_id=p.id
    );

  return new;
end;
$$;

drop trigger if exists trg_ensure_imported_open_project_default_roles on public.capability_path_import_batches;
create trigger trg_ensure_imported_open_project_default_roles
after update of status on public.capability_path_import_batches
for each row
execute function public.ensure_imported_open_project_default_roles();

-- Idempotent backfill for any previously imported new Open Project that still has
-- no participation role. This does not publish, reopen, or otherwise change project
-- lifecycle state; publication remains a governed Admin action.
insert into public.project_roles(project_id,title,discipline,description,skills,openings)
select
  p.id,
  'Project Contributor',
  null,
  'Contribute to the project deliverables with the team. Project-specific responsibilities are confirmed during team formation.',
  '{}'::text[],
  greatest(coalesce(p.team_size_threshold,1),1)
from public.capability_path_import_project_origins origin
join public.capability_path_import_batches batch on batch.id=origin.batch_id and batch.status='imported'
join public.projects p on p.id=origin.project_id
where origin.was_existing=false
  and p.project_type='open'
  and not exists(
    select 1 from public.project_roles existing
    where existing.project_id=p.id
  );
