-- Capability Paths V1 Phase 2: Admin lifecycle governance.
-- Additive only. No workbook data is imported by this migration.

alter table public.capability_paths
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists updated_by uuid references public.profiles(id) on delete set null,
  add column if not exists published_by uuid references public.profiles(id) on delete set null,
  add column if not exists archived_by uuid references public.profiles(id) on delete set null,
  add column if not exists restored_at timestamptz,
  add column if not exists restored_by uuid references public.profiles(id) on delete set null;

create index if not exists capability_paths_updated_at_idx
  on public.capability_paths(updated_at desc);

comment on column public.capability_paths.created_by is 'Admin user who created the path.';
comment on column public.capability_paths.updated_by is 'Admin user who most recently changed path authoring data.';
comment on column public.capability_paths.published_by is 'Admin user who most recently published the path.';
comment on column public.capability_paths.archived_by is 'Admin user who most recently archived the path. Preserved after restore.';
comment on column public.capability_paths.restored_at is 'Most recent restore-to-draft time. Archive history remains preserved.';
comment on column public.capability_paths.restored_by is 'Admin user who most recently restored an archived path to draft.';

create table if not exists public.capability_path_lifecycle_events(
  id uuid primary key default gen_random_uuid(),
  path_id uuid not null references public.capability_paths(id) on delete cascade,
  event_type text not null check(event_type in ('created','published','archived','restored','moved_to_draft')),
  actor_user_id uuid references public.profiles(id) on delete set null,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists capability_path_lifecycle_events_path_time_idx
  on public.capability_path_lifecycle_events(path_id,occurred_at desc);
alter table public.capability_path_lifecycle_events enable row level security;
revoke all on table public.capability_path_lifecycle_events from anon,authenticated;
grant all on table public.capability_path_lifecycle_events to service_role;
comment on table public.capability_path_lifecycle_events is 'Append-only Capability Path lifecycle history. Routine authoring never deletes these events.';

-- These privileged replace functions are executable only by service_role.
-- The calling server route authenticates the human Admin before invoking them.
create or replace function public.admin_replace_capability_path_structure(
  p_path_id uuid,
  p_stages jsonb,
  p_placements jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  stage_row jsonb;
  placement_row jsonb;
  resolved_stage uuid;
begin
  if not exists(select 1 from public.capability_paths where id=p_path_id) then
    raise exception 'Capability path not found';
  end if;

  delete from public.capability_path_projects where path_id=p_path_id;
  delete from public.capability_path_stages where path_id=p_path_id;

  for stage_row in select value from jsonb_array_elements(coalesce(p_stages,'[]'::jsonb)) loop
    insert into public.capability_path_stages(path_id,slug,name,description,position)
    values(
      p_path_id,
      lower(regexp_replace(trim(stage_row->>'slug'),'[^a-zA-Z0-9]+','-','g')),
      trim(stage_row->>'name'),
      nullif(trim(stage_row->>'description'),''),
      (stage_row->>'position')::integer
    );
  end loop;

  for placement_row in select value from jsonb_array_elements(coalesce(p_placements,'[]'::jsonb)) loop
    select id into resolved_stage
    from public.capability_path_stages
    where path_id=p_path_id and slug=trim(placement_row->>'stage_slug');

    if resolved_stage is null then
      raise exception 'Placement stage does not belong to this path';
    end if;

    insert into public.capability_path_projects(
      path_id,project_id,stage_id,position,competency_focus,capability_built,
      prerequisite_project_id,prerequisite_mode,path_outcome,placement_type
    ) values(
      p_path_id,
      (placement_row->>'project_id')::uuid,
      resolved_stage,
      (placement_row->>'position')::integer,
      trim(placement_row->>'competency_focus'),
      trim(placement_row->>'capability_built'),
      nullif(placement_row->>'prerequisite_project_id','')::uuid,
      coalesce(nullif(placement_row->>'prerequisite_mode',''),'recommended'),
      nullif(trim(placement_row->>'path_outcome'),''),
      coalesce(nullif(placement_row->>'placement_type',''),'recommended')
    );
  end loop;
end;
$$;

revoke all on function public.admin_replace_capability_path_structure(uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.admin_replace_capability_path_structure(uuid,jsonb,jsonb) to service_role;

create or replace function public.admin_replace_project_capabilities(
  p_project_id uuid,
  p_capability_ids uuid[]
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  capability_id uuid;
begin
  if not exists(select 1 from public.projects where id=p_project_id) then
    raise exception 'Project not found';
  end if;

  if exists(
    select 1 from unnest(coalesce(p_capability_ids,array[]::uuid[])) requested(id)
    left join public.capabilities c on c.id=requested.id and c.is_active=true
    where c.id is null
  ) then
    raise exception 'One or more capabilities are invalid or inactive';
  end if;

  delete from public.project_capabilities where project_id=p_project_id;
  foreach capability_id in array coalesce(p_capability_ids,array[]::uuid[]) loop
    insert into public.project_capabilities(project_id,capability_id)
    values(p_project_id,capability_id)
    on conflict(project_id,capability_id) do nothing;
  end loop;
end;
$$;

revoke all on function public.admin_replace_project_capabilities(uuid,uuid[]) from public,anon,authenticated;
grant execute on function public.admin_replace_project_capabilities(uuid,uuid[]) to service_role;
