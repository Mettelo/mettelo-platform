-- Project Experience Phase 3: extend the existing canonical atomic revision
-- boundary with participation/capacity fields. The function signature and
-- permissions remain unchanged so current API callers keep one transaction.

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
  participation_value text := coalesce(nullif(btrim(payload->>'participation_mode'),''),'team');
  min_value integer := greatest(1,least(50,coalesce((payload->>'min_team_size')::integer,(payload->>'team_size_threshold')::integer,5)));
  target_value integer;
  max_value integer;
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

  if participation_value not in ('solo','team','flexible') then
    raise exception 'INVALID_PARTICIPATION_MODE';
  end if;

  if participation_value='solo' then
    min_value := 1;
    target_value := 1;
    max_value := 1;
  else
    target_value := greatest(1,least(50,coalesce((payload->>'target_team_size')::integer,min_value)));
    max_value := greatest(1,least(50,coalesce((payload->>'max_team_size')::integer,target_value)));
    if min_value > target_value or target_value > max_value then
      raise exception 'INVALID_PARTICIPATION_CAPACITY';
    end if;
    if participation_value='team' and min_value < 2 then
      raise exception 'INVALID_TEAM_MINIMUM';
    end if;
    if participation_value='flexible' and min_value <> 1 then
      raise exception 'INVALID_FLEXIBLE_MINIMUM';
    end if;
  end if;

  -- Existing canonical update owns all current project-definition children and
  -- resource history protections. Keep that authority intact.
  perform public.apply_project_experience_draft_update(
    target_project_id,
    actor_user_id,
    payload || jsonb_build_object('team_size_threshold',min_value),
    target_risk_level,
    target_risk_reasons,
    target_admin_review_required
  );

  -- Same transaction, same project row, no parallel participation subsystem.
  update public.projects
  set
    participation_mode=participation_value,
    min_team_size=min_value,
    target_team_size=target_value,
    max_team_size=max_value,
    team_size_threshold=min_value,
    updated_at=now()
  where id=target_project_id;

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
      'participation_mode',participation_value,
      'min_team_size',min_value,
      'target_team_size',target_value,
      'max_team_size',max_value,
      'atomic_revision',true
    )
  );
end;
$$;

revoke all on function public.apply_project_experience_draft_revision(uuid,uuid,text,jsonb,text,text[],boolean) from public,anon,authenticated;
grant execute on function public.apply_project_experience_draft_revision(uuid,uuid,text,jsonb,text,text[],boolean) to service_role,postgres;
