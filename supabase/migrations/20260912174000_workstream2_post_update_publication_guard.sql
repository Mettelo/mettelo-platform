-- Workstream 2 — publication readiness must be evaluated against the row that will persist.
--
-- The earlier BEFORE trigger correctly centralised publication authority, but the
-- blocker function reads public.projects. During a BEFORE trigger that query sees
-- the pre-update row, which means a single direct UPDATE could combine a lifecycle
-- transition with invalid NEW scalar values. An AFTER trigger is still fully
-- transactional in PostgreSQL: raising here aborts and rolls back the UPDATE, while
-- allowing the blocker function to evaluate the actual post-update canonical row.

create or replace function public.workstream2_guard_project_publication()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_blockers text[];
  v_public boolean;
begin
  v_public := new.visibility='public'
    and new.status in ('pilot','recruiting','open','forming','active','review');

  if v_public then
    v_blockers:=public.workstream2_publication_blockers(new.id);
    if cardinality(v_blockers)>0 then
      raise exception 'PROJECT_NOT_PUBLICATION_READY:%',array_to_string(v_blockers,',')
        using errcode='23514';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.workstream2_guard_project_publication() from public,anon,authenticated;

drop trigger if exists workstream2_guard_project_publication on public.projects;
create trigger workstream2_guard_project_publication
after update on public.projects
for each row execute function public.workstream2_guard_project_publication();

comment on function public.workstream2_guard_project_publication() is
  'Transactional post-update publication guard. Every update to a live public project is re-evaluated by the single Workstream 2 database publication blocker authority.';
