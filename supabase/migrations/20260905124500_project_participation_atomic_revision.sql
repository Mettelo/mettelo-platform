-- Project Experience Phase 3: atomically revise canonical participation while
-- preserving the same project record and governance history.

create or replace function public.apply_project_participation_revision(
  target_project_id uuid,
  actor_user_id uuid,
  actor_scope_value text,
  target_participation_mode text,
  target_min_team_size integer,
  target_target_team_size integer,
  target_max_team_size integer
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  current_status text;
  previous_mode text;
  previous_min integer;
  previous_target integer;
  previous_max integer;
begin
  if actor_scope_value not in ('project_architect','admin') then
    raise exception 'INVALID_ACTOR_SCOPE';
  end if;

  if target_participation_mode not in ('solo','team','flexible') then
    raise exception 'INVALID_PARTICIPATION_MODE';
  end if;

  if target_min_team_size is null or target_target_team_size is null or target_max_team_size is null
     or target_min_team_size < 1 or target_max_team_size > 50
     or target_min_team_size > target_target_team_size
     or target_target_team_size > target_max_team_size then
    raise exception 'INVALID_PARTICIPATION_CAPACITY';
  end if;

  if target_participation_mode='solo'
     and (target_min_team_size<>1 or target_target_team_size<>1 or target_max_team_size<>1) then
    raise exception 'INVALID_SOLO_CAPACITY';
  end if;

  if target_participation_mode='team' and target_min_team_size<2 then
    raise exception 'INVALID_TEAM_CAPACITY';
  end if;

  if target_participation_mode='flexible' and target_min_team_size<>1 then
    raise exception 'INVALID_FLEXIBLE_CAPACITY';
  end if;

  select governance_status,participation_mode,min_team_size,target_team_size,max_team_size
  into current_status,previous_mode,previous_min,previous_target,previous_max
  from public.projects
  where id=target_project_id
  for update;

  if current_status is null then raise exception 'PROJECT_NOT_FOUND'; end if;
  if current_status not in ('draft','changes_requested') then raise exception 'PROJECT_NOT_EDITABLE'; end if;

  update public.projects
  set participation_mode=target_participation_mode,
      min_team_size=target_min_team_size,
      target_team_size=target_target_team_size,
      max_team_size=target_max_team_size,
      team_size_threshold=target_min_team_size,
      updated_at=now()
  where id=target_project_id;

  insert into public.project_governance_events(
    project_id,actor_user_id,actor_scope,event_type,from_status,to_status,reason,metadata
  ) values (
    target_project_id,
    actor_user_id,
    actor_scope_value,
    'project_participation_updated',
    current_status,
    current_status,
    'Canonical project participation and capacity updated.',
    jsonb_build_object(
      'previous',jsonb_build_object('mode',previous_mode,'min',previous_min,'target',previous_target,'max',previous_max),
      'current',jsonb_build_object('mode',target_participation_mode,'min',target_min_team_size,'target',target_target_team_size,'max',target_max_team_size),
      'formation_threshold',target_min_team_size
    )
  );
end;
$$;

revoke all on function public.apply_project_participation_revision(uuid,uuid,text,text,integer,integer,integer) from public,anon,authenticated;
grant execute on function public.apply_project_participation_revision(uuid,uuid,text,text,integer,integer,integer) to service_role,postgres;
