-- Production reconciliation for Mettelo Lab Grow the Team.
-- Restores schema/runtime objects already assumed by the current application.
-- Idempotent by design so fresh environments that applied the original phases are unchanged.

alter table public.projects
  add column if not exists collaboration_marketplace_enabled boolean not null default true,
  add column if not exists project_lead_invites_enabled boolean not null default true,
  add column if not exists team_member_invites_enabled boolean not null default false,
  add column if not exists external_collaboration_invites_enabled boolean not null default false,
  add column if not exists collaboration_social_sharing_enabled boolean not null default false,
  add column if not exists offer_expiry_hours integer not null default 72,
  add column if not exists offer_reminders_enabled boolean not null default true;

do $$
begin
  alter table public.projects
    add constraint projects_offer_expiry_hours_check
    check (offer_expiry_hours between 1 and 720);
exception when duplicate_object then null;
end $$;

alter table public.project_runs
  add column if not exists completion_requested_at timestamptz;

-- Phase 10 responsibility assignment relation used by the Team experience.
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

grant select, insert, update, delete on table public.project_member_responsibilities to service_role;
revoke insert, update, delete on table public.project_member_responsibilities from anon, authenticated;

-- Canonical Phase 9 capacity projection used by Grow Team and invitation APIs.
create or replace function public.phase9_project_run_capacity(
  p_project_id uuid,
  p_run_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  project_row public.projects%rowtype;
  run_row public.project_runs%rowtype;
  minimum_members integer;
  target_members integer;
  maximum_members integer;
  occupied integer:=0;
  reserved integer:=0;
  used_capacity integer:=0;
  late_join_allowed boolean:=false;
  now_at timestamptz:=now();
begin
  select * into project_row from public.projects where id=p_project_id;
  if project_row.id is null then
    raise exception using errcode='P0002',message='PROJECT_NOT_FOUND';
  end if;

  if p_run_id is not null then
    select * into run_row from public.project_runs where id=p_run_id and project_id=p_project_id;
    if run_row.id is null then
      raise exception using errcode='P0002',message='PROJECT_RUN_NOT_FOUND';
    end if;
    minimum_members:=greatest(coalesce(run_row.required_team_size,run_row.team_size_threshold,1),1);
    select count(*)::integer into occupied
    from public.project_members
    where project_run_id=p_run_id and membership_status in ('waiting','active');
  else
    minimum_members:=case
      when project_row.participation_mode='solo' then 1
      else greatest(coalesce(project_row.min_team_size,project_row.team_size_threshold,1),1)
    end;
    select count(*)::integer into occupied
    from public.project_members
    where project_id=p_project_id and membership_status in ('waiting','active');
  end if;

  target_members:=greatest(minimum_members,coalesce(project_row.target_team_size,minimum_members));
  maximum_members:=case
    when project_row.participation_mode='solo' then 1
    else greatest(target_members,coalesce(project_row.max_team_size,target_members))
  end;

  select count(*)::integer into reserved
  from public.project_offers
  where project_id=p_project_id
    and status in ('pending','accepted')
    and capacity_released_at is null
    and capacity_consumed_at is null;

  used_capacity:=occupied+reserved;

  if p_run_id is not null then
    late_join_allowed:=coalesce(run_row.has_started,false)=true
      and run_row.status='active'
      and coalesce(run_row.recruitment_open,true)=true
      and coalesce(project_row.late_joining_enabled,true)=true
      and (project_row.late_joining_cutoff_at is null or now_at<project_row.late_joining_cutoff_at)
      and used_capacity<maximum_members;
  end if;

  return jsonb_build_object(
    'project_id',p_project_id,
    'run_id',p_run_id,
    'participation_mode',project_row.participation_mode,
    'minimum',minimum_members,
    'target',target_members,
    'maximum',maximum_members,
    'occupied',occupied,
    'reserved',reserved,
    'used_capacity',used_capacity,
    'available',greatest(maximum_members-used_capacity,0),
    'ready',occupied>=minimum_members and occupied<=maximum_members,
    'target_reached',occupied>=target_members,
    'capacity_available',used_capacity<maximum_members,
    'late_join_allowed',late_join_allowed
  );
end;
$$;

revoke all on function public.phase9_project_run_capacity(uuid,uuid) from public,anon,authenticated;
grant execute on function public.phase9_project_run_capacity(uuid,uuid) to service_role;

comment on function public.phase9_project_run_capacity(uuid,uuid) is
  'Canonical run-scoped capacity projection used by Mettelo Lab Grow the Team and governed recruitment.';
