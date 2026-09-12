-- Workstream 2 — make structured acceptance criteria and dependencies first-class
-- parts of the existing atomic Project Architect draft revision. No second project
-- model or save path is introduced: this function remains the single transaction
-- that updates the canonical draft and its governance audit event.

create or replace function public.apply_project_experience_draft_revision(
  target_project_id uuid,
  actor_user_id uuid,
  actor_scope_value text,
  payload jsonb,
  target_risk_level text,
  target_risk_reasons text[],
  target_admin_review_required boolean
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  current_status text;
  acceptance_record record;
  dependency_record record;
  resource_count integer := jsonb_array_length(coalesce(payload->'resources','[]'::jsonb));
  deliverable_count integer := jsonb_array_length(coalesce(payload->'deliverables','[]'::jsonb));
  criterion_count integer := jsonb_array_length(coalesce(payload->'success_criteria','[]'::jsonb));
  acceptance_count integer := jsonb_array_length(coalesce(payload->'acceptance_criteria','[]'::jsonb));
  dependency_count integer := jsonb_array_length(coalesce(payload->'dependencies','[]'::jsonb));
  milestone_count integer := jsonb_array_length(coalesce(payload->'milestones','[]'::jsonb));
  role_count integer := jsonb_array_length(coalesce(payload->'roles','[]'::jsonb));
  capability_count integer := jsonb_array_length(coalesce(payload->'capabilities','[]'::jsonb));
  now_at timestamptz := now();
begin
  if actor_scope_value not in ('project_architect','admin') then
    raise exception 'INVALID_ACTOR_SCOPE';
  end if;

  select p.governance_status into current_status
  from public.projects p
  where p.id=target_project_id
  for update;
  if current_status is null then raise exception 'PROJECT_NOT_FOUND'; end if;
  if current_status not in ('draft','changes_requested') then raise exception 'PROJECT_NOT_EDITABLE'; end if;

  -- Existing canonical updater remains authoritative for project, brief, resources,
  -- deliverables, success criteria, milestones, roles and capabilities.
  perform public.apply_project_experience_draft_update(
    target_project_id,
    actor_user_id,
    payload,
    target_risk_level,
    target_risk_reasons,
    target_admin_review_required
  );

  -- Remove omitted pre-existing rows before processing inserts. New incoming rows use
  -- id=null and receive database UUIDs, so deleting after insertion would incorrectly
  -- classify those freshly-created rows as omitted from the incoming ID set.
  delete from public.project_acceptance_criteria a
  where a.project_id=target_project_id
    and not exists(
      select 1 from jsonb_to_recordset(coalesce(payload->'acceptance_criteria','[]'::jsonb)) as incoming(id uuid)
      where incoming.id=a.id
    );

  for acceptance_record in
    select * from jsonb_to_recordset(coalesce(payload->'acceptance_criteria','[]'::jsonb))
      as a(id uuid,criterion text,is_required boolean,visibility text,sort_order integer)
  loop
    if acceptance_record.id is null then
      insert into public.project_acceptance_criteria(project_id,criterion,is_required,visibility,sort_order)
      values(
        target_project_id,
        acceptance_record.criterion,
        coalesce(acceptance_record.is_required,true),
        coalesce(acceptance_record.visibility,'public'),
        coalesce(acceptance_record.sort_order,0)
      );
    else
      update public.project_acceptance_criteria set
        criterion=acceptance_record.criterion,
        is_required=coalesce(acceptance_record.is_required,true),
        visibility=coalesce(acceptance_record.visibility,'public'),
        sort_order=coalesce(acceptance_record.sort_order,0),
        updated_at=now_at
      where id=acceptance_record.id and project_id=target_project_id;
      if not found then raise exception 'ACCEPTANCE_CRITERION_NOT_IN_PROJECT'; end if;
    end if;
  end loop;

  delete from public.project_dependencies d
  where d.project_id=target_project_id
    and not exists(
      select 1 from jsonb_to_recordset(coalesce(payload->'dependencies','[]'::jsonb)) as incoming(id uuid)
      where incoming.id=d.id
    );

  for dependency_record in
    select * from jsonb_to_recordset(coalesce(payload->'dependencies','[]'::jsonb))
      as d(id uuid,title text,description text,dependency_type text,is_required boolean,visibility text,sort_order integer)
  loop
    if dependency_record.id is null then
      insert into public.project_dependencies(project_id,title,description,dependency_type,is_required,visibility,sort_order)
      values(
        target_project_id,
        dependency_record.title,
        dependency_record.description,
        coalesce(dependency_record.dependency_type,'other'),
        coalesce(dependency_record.is_required,true),
        coalesce(dependency_record.visibility,'public'),
        coalesce(dependency_record.sort_order,0)
      );
    else
      update public.project_dependencies set
        title=dependency_record.title,
        description=dependency_record.description,
        dependency_type=coalesce(dependency_record.dependency_type,'other'),
        is_required=coalesce(dependency_record.is_required,true),
        visibility=coalesce(dependency_record.visibility,'public'),
        sort_order=coalesce(dependency_record.sort_order,0),
        updated_at=now_at
      where id=dependency_record.id and project_id=target_project_id;
      if not found then raise exception 'DEPENDENCY_NOT_IN_PROJECT'; end if;
    end if;
  end loop;

  insert into public.project_governance_events(
    project_id,actor_user_id,actor_scope,event_type,from_status,to_status,reason,metadata
  ) values (
    target_project_id,
    actor_user_id,
    actor_scope_value,
    'project_definition_updated',
    current_status,
    current_status,
    'Canonical project draft updated in place.',
    jsonb_build_object(
      'resources',resource_count,
      'deliverables',deliverable_count,
      'success_criteria',criterion_count,
      'acceptance_criteria',acceptance_count,
      'dependencies',dependency_count,
      'milestones',milestone_count,
      'roles',role_count,
      'capabilities',capability_count,
      'risk_level',target_risk_level,
      'atomic_revision',true
    )
  );
end;
$$;

revoke all on function public.apply_project_experience_draft_revision(uuid,uuid,text,jsonb,text,text[],boolean) from public,anon,authenticated;
grant execute on function public.apply_project_experience_draft_revision(uuid,uuid,text,jsonb,text,text[],boolean) to service_role,postgres;