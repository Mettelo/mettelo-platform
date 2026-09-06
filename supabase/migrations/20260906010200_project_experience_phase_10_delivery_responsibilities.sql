-- Project Experience Phase 10: canonical delivery responsibility ownership.
--
-- project_roles.responsibilities[] remains the project-defined responsibility
-- vocabulary. This migration adds only the missing many-to-many ownership
-- relation between canonical project_members and those responsibility values.
-- It deliberately does NOT create another role/responsibility catalogue.

create table if not exists public.project_member_responsibilities (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  project_run_id uuid not null references public.project_runs(id) on delete cascade,
  project_member_id uuid not null references public.project_members(id) on delete cascade,
  source_project_role_id uuid references public.project_roles(id) on delete restrict,
  responsibility text not null check (char_length(btrim(responsibility)) between 1 and 160),
  assignment_status text not null default 'active' check (assignment_status in ('active','released')),
  assigned_by uuid references public.profiles(id) on delete set null,
  assignment_reason text,
  assigned_at timestamptz not null default now(),
  released_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint project_member_responsibility_release_check check (
    (assignment_status='active' and released_at is null)
    or (assignment_status='released' and released_at is not null)
  )
);

create unique index if not exists project_member_responsibilities_one_live_assignment
  on public.project_member_responsibilities(project_member_id,lower(btrim(responsibility)))
  where assignment_status='active';
create index if not exists project_member_responsibilities_run_active_idx
  on public.project_member_responsibilities(project_run_id,assignment_status,responsibility);
create index if not exists project_member_responsibilities_project_active_idx
  on public.project_member_responsibilities(project_id,assignment_status,responsibility);
create index if not exists project_member_responsibilities_member_history_idx
  on public.project_member_responsibilities(project_member_id,assigned_at desc);

alter table public.project_member_responsibilities enable row level security;

drop policy if exists project_member_responsibilities_member_read on public.project_member_responsibilities;
create policy project_member_responsibilities_member_read
on public.project_member_responsibilities
for select
to authenticated
using (
  exists (
    select 1
    from public.project_members viewer
    where viewer.project_run_id=project_member_responsibilities.project_run_id
      and viewer.user_id=auth.uid()
      and viewer.membership_status in ('waiting','active','completed')
  )
);

-- No authenticated INSERT/UPDATE/DELETE policies are created. Normal members
-- may read the roster responsibilities for their own run but cannot self-assign,
-- assign another member, or manufacture a responsibility through direct Supabase.

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
      from public.project_roles pr,
           unnest(coalesce(pr.responsibilities,array[]::text[])) as item(value)
      where pr.id=new.source_project_role_id
        and lower(btrim(item.value))=lower(btrim(new.responsibility))
    ) into responsibility_exists;
  else
    select exists (
      select 1
      from public.project_roles pr,
           unnest(coalesce(pr.responsibilities,array[]::text[])) as item(value)
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

drop trigger if exists project_member_responsibility_context_guard on public.project_member_responsibilities;
create trigger project_member_responsibility_context_guard
before insert or update
on public.project_member_responsibilities
for each row execute function public.phase10_validate_delivery_responsibility_row();

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
  from public.project_roles pr,
       unnest(coalesce(pr.responsibilities,array[]::text[])) as item(value)
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

create or replace function public.phase10_release_delivery_responsibility(
  p_assignment_id uuid,
  p_actor_user_id uuid default null,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  assignment_row public.project_member_responsibilities%rowtype;
  project_row public.projects%rowtype;
  run_row public.project_runs%rowtype;
begin
  select project_id into assignment_row.project_id
  from public.project_member_responsibilities where id=p_assignment_id;
  if assignment_row.project_id is null then
    raise exception using errcode='P0002',message='RESPONSIBILITY_ASSIGNMENT_NOT_FOUND';
  end if;

  select * into project_row from public.projects
  where id=assignment_row.project_id for update;
  perform public.phase9_lock_project_capacity(project_row.id);

  select * into assignment_row from public.project_member_responsibilities
  where id=p_assignment_id for update;
  if assignment_row.id is null then
    raise exception using errcode='P0002',message='RESPONSIBILITY_ASSIGNMENT_NOT_FOUND';
  end if;
  if assignment_row.assignment_status='released' then
    return jsonb_build_object('released',false,'already_released',true,'assignment_id',assignment_row.id);
  end if;

  select * into run_row from public.project_runs
  where id=assignment_row.project_run_id and project_id=project_row.id
  for update;
  if run_row.id is null then
    raise exception using errcode='23514',message='RESPONSIBILITY_RUN_PROJECT_MISMATCH';
  end if;

  update public.project_member_responsibilities
  set assignment_status='released',released_at=now(),updated_at=now()
  where id=assignment_row.id;

  insert into public.project_activity_log(
    project_id,project_run_id,event_type,actor_type,actor_user_id,from_status,to_status,metadata
  ) values (
    project_row.id,run_row.id,'formation_responsibility_released',
    case when p_actor_user_id is null then 'system' else 'user' end,
    p_actor_user_id,run_row.status,run_row.status,
    jsonb_build_object(
      'assignment_id',assignment_row.id,
      'membership_id',assignment_row.project_member_id,
      'responsibility',assignment_row.responsibility,
      'reason',nullif(btrim(coalesce(p_reason,'')),'')
    )
  );

  return jsonb_build_object('released',true,'already_released',false,'assignment_id',assignment_row.id);
end;
$$;

revoke all on function public.phase10_release_delivery_responsibility(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.phase10_release_delivery_responsibility(uuid,uuid,text) to service_role;

-- The Phase 10 v1 RPC overloaded project_role_id as if it were a delivery
-- responsibility. Remove that write surface now that delivery ownership has a
-- normalized relation. project_members.project_role_id remains untouched for
-- compatibility with older architecture; Phase 10 no longer mutates it.
drop function if exists public.phase10_assign_member_responsibility(uuid,uuid,boolean,uuid);

-- Reuse the established project_members.team_role leadership architecture, but
-- give lead confirmation its own explicit, auditable server-only boundary.
create or replace function public.phase10_confirm_project_lead(
  p_membership_id uuid,
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
  previous_lead public.project_members%rowtype;
begin
  select project_id into member_row.project_id
  from public.project_members where id=p_membership_id;
  if member_row.project_id is null then
    raise exception using errcode='P0002',message='MEMBERSHIP_NOT_FOUND';
  end if;

  select * into project_row from public.projects
  where id=member_row.project_id for update;
  perform public.phase9_lock_project_capacity(project_row.id);

  select * into member_row from public.project_members
  where id=p_membership_id and project_id=project_row.id
  for update;
  if member_row.id is null or member_row.project_run_id is null then
    raise exception using errcode='P0002',message='MEMBERSHIP_NOT_FOUND';
  end if;
  if member_row.membership_status not in ('waiting','active') then
    raise exception using errcode='23514',message='PROJECT_LEAD_REQUIRES_LIVE_MEMBERSHIP';
  end if;

  select * into run_row from public.project_runs
  where id=member_row.project_run_id and project_id=project_row.id
  for update;
  if run_row.id is null then
    raise exception using errcode='23514',message='MEMBERSHIP_RUN_PROJECT_MISMATCH';
  end if;
  if run_row.status not in ('forming','active') then
    raise exception using errcode='23514',message='PROJECT_LEAD_REQUIRES_FORMING_OR_ACTIVE_RUN';
  end if;
  if greatest(coalesce(run_row.required_team_size,run_row.team_size_threshold,1),1)<=1 then
    raise exception using errcode='23514',message='PROJECT_LEAD_NOT_REQUIRED_FOR_INDEPENDENT_RUN';
  end if;

  select * into previous_lead
  from public.project_members
  where project_run_id=run_row.id
    and membership_status in ('waiting','active')
    and team_role='project_lead'
  order by joined_at asc nulls last,id asc
  limit 1
  for update;

  if previous_lead.id=member_row.id then
    return jsonb_build_object(
      'changed',false,'already_lead',true,
      'membership_id',member_row.id,'run_id',run_row.id,'team_role','project_lead'
    );
  end if;

  if previous_lead.id is not null then
    update public.project_members
    set team_role='contributor'
    where id=previous_lead.id;
  end if;

  update public.project_members
  set team_role='project_lead'
  where id=member_row.id;

  insert into public.project_activity_log(
    project_id,project_run_id,event_type,actor_type,actor_user_id,from_status,to_status,metadata
  ) values (
    project_row.id,run_row.id,'project_lead_confirmed',
    case when p_actor_user_id is null then 'system' else 'user' end,
    p_actor_user_id,run_row.status,run_row.status,
    jsonb_build_object(
      'previous_membership_id',previous_lead.id,
      'previous_user_id',previous_lead.user_id,
      'new_membership_id',member_row.id,
      'new_user_id',member_row.user_id,
      'reason',nullif(btrim(coalesce(p_reason,'')),'')
    )
  );

  return jsonb_build_object(
    'changed',true,'already_lead',false,
    'previous_membership_id',previous_lead.id,
    'membership_id',member_row.id,'run_id',run_row.id,'team_role','project_lead'
  );
end;
$$;

revoke all on function public.phase10_confirm_project_lead(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.phase10_confirm_project_lead(uuid,uuid,text) to service_role;

-- Trigger-level single-lead protection already serializes on the project/capacity
-- lock. This partial unique index adds a storage invariant for the same rule.
do $$
begin
  if exists (
    select 1
    from public.project_members
    where membership_status in ('waiting','active') and team_role='project_lead'
    group by project_run_id
    having count(*)>1
  ) then
    raise exception using errcode='23514',message='EXISTING_MULTIPLE_PROJECT_LEADS';
  end if;
end $$;

create unique index if not exists project_members_one_live_project_lead_per_run
  on public.project_members(project_run_id)
  where membership_status in ('waiting','active') and team_role='project_lead';

comment on table public.project_member_responsibilities is
  'Phase 10 delivery-responsibility ownership. Responsibility values are validated against canonical project_roles.responsibilities[] definitions; this table is assignment state, not another role catalogue.';
comment on function public.phase10_assign_delivery_responsibility(uuid,text,uuid,uuid,text) is
  'Service-only Phase 10 many-to-many delivery responsibility assignment. It never changes member profile identity, application roles, Proof, or project activation.';
comment on function public.phase10_confirm_project_lead(uuid,uuid,text) is
  'Service-only canonical Project Lead confirmation/reassignment using project_members.team_role with audited previous/new Lead state.';
