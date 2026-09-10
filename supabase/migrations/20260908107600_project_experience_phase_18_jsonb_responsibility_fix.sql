-- Phase 18 compatibility repair: project_roles.responsibilities is canonical JSONB.
-- The initial collaboration-need guard accidentally treated it as text[], which
-- breaks Phase 16 replacement handoff and Phase 17 support recovery when they
-- project released responsibilities into Phase 18 collaboration needs.

create or replace function public.phase18_validate_collaboration_need_context()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  run_project uuid;
  role_project uuid;
  responsibility_known boolean:=false;
begin
  select project_id into run_project
  from public.project_runs
  where id=new.project_run_id;

  if run_project is null or run_project<>new.project_id then
    raise exception using errcode='23514',message='COLLABORATION_NEED_RUN_PROJECT_MISMATCH';
  end if;

  if new.source_project_role_id is not null then
    select project_id into role_project
    from public.project_roles
    where id=new.source_project_role_id;

    if role_project is null or role_project<>new.project_id then
      raise exception using errcode='23514',message='COLLABORATION_NEED_ROLE_PROJECT_MISMATCH';
    end if;
  end if;

  if new.responsibility is not null then
    select exists(
      select 1
      from public.project_roles pr
      cross join lateral jsonb_array_elements_text(
        case
          when jsonb_typeof(pr.responsibilities)='array' then pr.responsibilities
          else '[]'::jsonb
        end
      ) as item(value)
      where pr.project_id=new.project_id
        and (new.source_project_role_id is null or pr.id=new.source_project_role_id)
        and lower(btrim(item.value))=lower(btrim(new.responsibility))
    ) into responsibility_known;

    if not responsibility_known then
      raise exception using errcode='23514',message='COLLABORATION_NEED_RESPONSIBILITY_NOT_CANONICAL';
    end if;

    new.responsibility=btrim(new.responsibility);
  end if;

  if new.member_message is not null then
    new.member_message=btrim(new.member_message);
  end if;
  if new.weekly_commitment is not null then
    new.weekly_commitment=nullif(btrim(new.weekly_commitment),'');
  end if;
  new.updated_at=now();
  return new;
end;
$$;

revoke all on function public.phase18_validate_collaboration_need_context() from public,anon,authenticated;

comment on function public.phase18_validate_collaboration_need_context() is
  'Validates Phase 18 collaboration need project/run/role context against the canonical JSONB project responsibility vocabulary.';
