-- Phase 21 release-gate repair: project_roles.responsibilities is canonical JSONB.
-- The Phase 18/21 collaboration-need validator previously attempted to COALESCE
-- that JSONB column with text[], causing PostgreSQL 42804 during Phase 16-18
-- replacement/recruitment journeys. Keep the same governance rules while
-- reading the canonical JSONB array correctly.

create or replace function public.phase18_validate_collaboration_need_context()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  run_row public.project_runs%rowtype;
  project_row public.projects%rowtype;
  role_project uuid;
  responsibility_known boolean:=false;
begin
  select * into run_row from public.project_runs where id=new.project_run_id;
  if run_row.id is null or run_row.project_id<>new.project_id then
    raise exception using errcode='23514',message='COLLABORATION_NEED_RUN_PROJECT_MISMATCH';
  end if;

  select * into project_row from public.projects where id=new.project_id;
  if project_row.id is null then
    raise exception using errcode='P0002',message='COLLABORATION_NEED_PROJECT_NOT_FOUND';
  end if;

  if new.status='active' then
    if coalesce(project_row.collaboration_marketplace_enabled,false) is not true then
      raise exception using errcode='42501',message='COLLABORATION_MARKETPLACE_DISABLED';
    end if;
    if project_row.status in ('completed','cancelled','archived') then
      raise exception using errcode='23514',message='COLLABORATION_NEED_PROJECT_CLOSED';
    end if;
    if coalesce(project_row.late_joining_enabled,false) is not true then
      raise exception using errcode='23514',message='COLLABORATION_NEED_LATE_JOINING_DISABLED';
    end if;
    if project_row.late_joining_cutoff_at is not null and project_row.late_joining_cutoff_at<=now() then
      raise exception using errcode='23514',message='COLLABORATION_NEED_JOINING_WINDOW_CLOSED';
    end if;
    if run_row.status not in ('forming','active') or coalesce(run_row.recruitment_open,false) is not true then
      raise exception using errcode='23514',message='COLLABORATION_NEED_RUN_RECRUITMENT_CLOSED';
    end if;
  end if;

  if new.source_project_role_id is not null then
    select project_id into role_project from public.project_roles where id=new.source_project_role_id;
    if role_project is null or role_project<>new.project_id then
      raise exception using errcode='23514',message='COLLABORATION_NEED_ROLE_PROJECT_MISMATCH';
    end if;
  end if;

  if new.responsibility is not null then
    select exists(
      select 1
      from public.project_roles pr
      cross join lateral jsonb_array_elements_text(coalesce(pr.responsibilities,'[]'::jsonb)) item(value)
      where pr.project_id=new.project_id
        and (new.source_project_role_id is null or pr.id=new.source_project_role_id)
        and lower(btrim(item.value))=lower(btrim(new.responsibility))
    ) into responsibility_known;
    if not responsibility_known then
      raise exception using errcode='23514',message='COLLABORATION_NEED_RESPONSIBILITY_NOT_CANONICAL';
    end if;
    new.responsibility=btrim(new.responsibility);
  end if;

  if new.member_message is not null then new.member_message=btrim(new.member_message); end if;
  if new.weekly_commitment is not null then new.weekly_commitment=nullif(btrim(new.weekly_commitment),''); end if;
  new.updated_at=now();
  return new;
end;
$$;

revoke all on function public.phase18_validate_collaboration_need_context() from public,anon,authenticated;
