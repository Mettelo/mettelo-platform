-- Workstream 2 — live canonical child edits must never leave a published project
-- in a state that the publication gate itself would reject. This closes the direct
-- table/API bypass path around the projects-row lifecycle trigger.

create or replace function public.workstream2_guard_live_definition_child()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_project_id uuid;
  v_live boolean;
  v_blockers text[];
begin
  if tg_op='DELETE' then
    v_project_id:=nullif(to_jsonb(old)->>'project_id','')::uuid;
  else
    v_project_id:=nullif(to_jsonb(new)->>'project_id','')::uuid;
  end if;

  if v_project_id is null then
    if tg_op='DELETE' then return old; else return new; end if;
  end if;

  select (p.visibility='public' and p.status in ('pilot','recruiting','open','forming','active','review'))
    into v_live
  from public.projects p where p.id=v_project_id;

  if coalesce(v_live,false) then
    v_blockers:=public.workstream2_publication_blockers(v_project_id);
    if cardinality(v_blockers)>0 then
      raise exception 'LIVE_PROJECT_DEFINITION_INVALID:%',array_to_string(v_blockers,',')
        using errcode='23514';
    end if;
  end if;

  if tg_op='DELETE' then return old; else return new; end if;
end;
$$;

revoke all on function public.workstream2_guard_live_definition_child() from public,anon,authenticated;

do $$
declare
  t text;
  trigger_name text;
begin
  foreach t in array array[
    'project_problem_briefs','project_roles','project_data_sources','project_deliverables',
    'project_success_criteria','project_acceptance_criteria','project_dependencies','project_milestones',
    'project_capabilities','project_role_families','project_domains','project_tools','project_methods'
  ] loop
    if to_regclass('public.'||t) is not null then
      trigger_name:='workstream2_live_definition_guard_'||t;
      execute format('drop trigger if exists %I on public.%I',trigger_name,t);
      execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.workstream2_guard_live_definition_child()',trigger_name,t);
    end if;
  end loop;
end;
$$;

comment on function public.workstream2_guard_live_definition_child() is
  'Transactional Workstream 2 guard preventing direct canonical child mutations from leaving a live public project below the authoritative publication contract.';
