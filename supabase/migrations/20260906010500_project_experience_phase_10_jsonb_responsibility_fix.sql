-- Project Experience Phase 10: repair canonical responsibility vocabulary reads.
-- project_roles.responsibilities is JSONB in the established schema. The initial
-- Phase 10 functions treated it as text[], which fails at runtime. Keep the
-- existing JSONB catalogue and redefine only the affected Phase 10 functions.

create or replace function public.phase10_validate_delivery_responsibility_row()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  member_project_id uuid;
  member_run_id uuid;
  role_project_id uuid;
  responsibility_exists boolean:=false;
begin
  select project_id,project_run_id
  into member_project_id,member_run_id
  from public.project_members
  where id=new.project_member_id;

  if member_project_id is null then
    raise exception using errcode='P0002',message='MEMBERSHIP_NOT_FOUND';
  end if;
  if member_project_id<>new.project_id or member_run_id is distinct from new.project_run_id then
    raise exception using errcode='23514',message='RESPONSIBILITY_MEMBERSHIP_CONTEXT_MISMATCH';
  end if;

  if not exists (
    select 1 from public.project_runs r
    where r.id=new.project_run_id and r.project_id=new.project_id
  ) then
    raise exception using errcode='23514',message='RESPONSIBILITY_RUN_PROJECT_MISMATCH';
  end if;

  if new.source_project_role_id is not null then
    select project_id into role_project_id
    from public.project_roles
    where id=new.source_project_role_id;
    if role_project_id is null then
      raise exception using errcode='P0002',message='PROJECT_ROLE_NOT_FOUND';
    end if;
    if role_project_id<>new.project_id then
      raise exception using errcode='23514',message='RESPONSIBILITY_ROLE_PROJECT_MISMATCH';
    end if;

    select exists (
      select 1
      from public.project_roles pr
      cross join lateral jsonb_array_elements_text(
        case when jsonb_typeof(pr.responsibilities)='array' then pr.responsibilities else '[]'::jsonb end
      ) as item(value)
      where pr.id=new.source_project_role_id
        and lower(btrim(item.value))=lower(btrim(new.responsibility))
    ) into responsibility_exists;
  else
    select exists (
      select 1
      from public.project_roles pr
      cross join lateral jsonb_array_elements_text(
        case when jsonb_typeof(pr.responsibilities)='array' then pr.responsibilities else '[]'::jsonb end
      ) as item(value)
      where pr.project_id=new.project_id
        and lower(btrim(item.value))=lower(btrim(new.responsibility))
    ) into responsibility_exists;
  end if;

  if not responsibility_exists then
    raise exception using errcode='23514',message='RESPONSIBILITY_NOT_DEFINED_FOR_PROJECT';
  end if;

  new.responsibility=btrim(new.responsibility);
  new.updated_at=now();
  return new;
end;
$$;

revoke all on function public.phase10_validate_delivery_responsibility_row() from public,anon,authenticated;

create or replace function public.phase10_assign_delivery_responsibility(
  p_membership_id uuid,
  p_responsibility text,
  p_source_project_role_id uuid default null,
  p_actor_user_id uuid default null,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  member_row public.project_members%rowtype;
  project_row public.projects%rowtype;
  run_row public.project_runs%rowtype;
  selected_role_id uuid;
  canonical_responsibility text;
  assignment_row public.project_member_responsibilities%rowtype;
begin
  select project_id into member_row.project_id
  from public.project_members where id=p_membership_id;
  if member_row.project_id is null then
    raise exception using errcode='P0002',message='MEMBERSHIP_NOT_FOUND';
  end if;

  select * into project_row from public.projects
  where id=member_row.project_id for update;
  if project_row.id is null then
    raise exception using errcode='P0002',message='PROJECT_NOT_FOUND';
  end if;
  perform public.phase9_lock_project_capacity(project_row.id);

  select * into member_row from public.project_members
  where id=p_membership_id and project_id=project_row.id
  for update;
  if member_row.id is null then
    raise exception using errcode='P0002',message='MEMBERSHIP_NOT_FOUND';
  end if;
  if member_row.membership_status not in ('waiting','active') or member_row.project_run_id is null then
    raise exception using errcode='23514',message='RESPONSIBILITY_REQUIRES_LIVE_MEMBERSHIP';
  end if;

  select * into run_row from public.project_runs
  where id=member_row.project_run_id and project_id=project_row.id
  for update;
  if run_row.id is null then
    raise exception using errcode='23514',message='MEMBERSHIP_RUN_PROJECT_MISMATCH';
  end if;
  if run_row.status not in ('forming','active') then
    raise exception using errcode='23514',message='RESPONSIBILITY_REQUIRES_FORMING_OR_ACTIVE_RUN';
  end if;

  select pr.id,item.value
  into selected_role_id,canonical_responsibility
  from public.project_roles pr
  cross join lateral jsonb_array_elements_text(
    case when jsonb_typeof(pr.responsibilities)='array' then pr.responsibilities else '[]'::jsonb end
  ) as item(value)
  where pr.project_id=project_row.id
    and (p_source_project_role_id is null or pr.id=p_source_project_role_id)
    and lower(btrim(item.value))=lower(btrim(coalesce(p_responsibility,'')))
  order by pr.id,item.value
  limit 1;

  if selected_role_id is null or canonical_responsibility is null then
    raise exception using errcode='23514',message='RESPONSIBILITY_NOT_DEFINED_FOR_PROJECT';
  end if;

  select * into assignment_row
  from public.project_member_responsibilities
  where project_member_id=member_row.id
    and lower(btrim(responsibility))=lower(btrim(canonical_responsibility))
    and assignment_status='active'
  order by assigned_at asc,id asc
  limit 1
  for update;

  if assignment_row.id is not null then
    return jsonb_build_object(
      'assigned',false,'already_assigned',true,
      'assignment_id',assignment_row.id,
      'membership_id',member_row.id,
      'run_id',run_row.id,
      'responsibility',assignment_row.responsibility,
      'project_active',run_row.status='active'
    );
  end if;

  insert into public.project_member_responsibilities(
    project_id,project_run_id,project_member_id,source_project_role_id,
    responsibility,assignment_status,assigned_by,assignment_reason
  ) values (
    project_row.id,run_row.id,member_row.id,selected_role_id,
    canonical_responsibility,'active',p_actor_user_id,nullif(btrim(coalesce(p_reason,'')),'')
  ) returning * into assignment_row;

  insert into public.project_activity_log(
    project_id,project_run_id,event_type,actor_type,actor_user_id,from_status,to_status,metadata
  ) values (
    project_row.id,run_row.id,'formation_responsibility_assigned',
    case when p_actor_user_id is null then 'system' else 'user' end,
    p_actor_user_id,run_row.status,run_row.status,
    jsonb_build_object(
      'assignment_id',assignment_row.id,
      'membership_id',member_row.id,
      'user_id',member_row.user_id,
      'source_project_role_id',selected_role_id,
      'responsibility',canonical_responsibility,
      'reason',nullif(btrim(coalesce(p_reason,'')),'')
    )
  );

  return jsonb_build_object(
    'assigned',true,'already_assigned',false,
    'assignment_id',assignment_row.id,
    'membership_id',member_row.id,
    'run_id',run_row.id,
    'responsibility',assignment_row.responsibility,
    'project_active',run_row.status='active'
  );
end;
$$;

revoke all on function public.phase10_assign_delivery_responsibility(uuid,text,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.phase10_assign_delivery_responsibility(uuid,text,uuid,uuid,text) to service_role;
