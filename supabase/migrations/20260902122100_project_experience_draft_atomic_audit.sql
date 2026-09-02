-- Project Experience V2 Phase 4: couple the canonical draft revision and its
-- governance audit event in one PostgreSQL transaction.

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
  resource_count integer := jsonb_array_length(coalesce(payload->'resources','[]'::jsonb));
  deliverable_count integer := jsonb_array_length(coalesce(payload->'deliverables','[]'::jsonb));
  criterion_count integer := jsonb_array_length(coalesce(payload->'success_criteria','[]'::jsonb));
  milestone_count integer := jsonb_array_length(coalesce(payload->'milestones','[]'::jsonb));
  role_count integer := jsonb_array_length(coalesce(payload->'roles','[]'::jsonb));
  capability_count integer := jsonb_array_length(coalesce(payload->'capabilities','[]'::jsonb));
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

  perform public.apply_project_experience_draft_update(
    target_project_id,
    actor_user_id,
    payload,
    target_risk_level,
    target_risk_reasons,
    target_admin_review_required
  );

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
