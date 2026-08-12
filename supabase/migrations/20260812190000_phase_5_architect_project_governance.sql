-- Phase 5: governed Project Architect projects.
-- Committed for the integrated release; do not apply to production per-phase.

alter table public.projects
  add column if not exists created_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists governance_status text not null default 'draft',
  add column if not exists risk_level text not null default 'standard',
  add column if not exists risk_reasons text[] not null default '{}',
  add column if not exists admin_review_required boolean not null default false,
  add column if not exists governance_submitted_at timestamptz,
  add column if not exists governance_decided_at timestamptz,
  add column if not exists governance_paused_at timestamptz,
  add column if not exists admin_approved_at timestamptz;

alter table public.projects drop constraint if exists projects_governance_status_check;
alter table public.projects add constraint projects_governance_status_check check (
  governance_status in ('draft','submitted','changes_requested','approved','recruiting','forming','active','review','completed','denied','paused')
);
alter table public.projects drop constraint if exists projects_risk_level_check;
alter table public.projects add constraint projects_risk_level_check check (risk_level in ('standard','controlled','prohibited'));

create table if not exists public.project_architect_assignments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict,
  assignment_role text not null check (assignment_role in ('creating_architect','reviewing_architect','managing_architect','architect_collaborator')),
  assignment_status text not null default 'active' check (assignment_status in ('active','reassigned','removed')),
  assigned_by_user_id uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  ended_at timestamptz,
  unique(project_id,user_id,assignment_role)
);

create unique index if not exists project_one_active_creator_idx on public.project_architect_assignments(project_id) where assignment_role='creating_architect' and assignment_status='active';
create unique index if not exists project_one_active_reviewer_idx on public.project_architect_assignments(project_id) where assignment_role='reviewing_architect' and assignment_status='active';
create unique index if not exists project_one_active_manager_idx on public.project_architect_assignments(project_id) where assignment_role='managing_architect' and assignment_status='active';
create index if not exists architect_assignment_user_queue_idx on public.project_architect_assignments(user_id,assignment_status,assignment_role);

create table if not exists public.project_governance_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_scope text not null check (actor_scope in ('project_architect','admin','system')),
  event_type text not null,
  from_status text,
  to_status text,
  reason text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists project_governance_events_project_time_idx on public.project_governance_events(project_id,created_at desc);

create or replace function public.mettelo_is_project_architect(target_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.account_identities where user_id=target_user and account_type='project_architect');
$$;

create or replace function public.mettelo_is_assigned_architect(target_project uuid, roles text[] default array['creating_architect','reviewing_architect','managing_architect','architect_collaborator'])
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.project_architect_assignments where project_id=target_project and user_id=auth.uid() and assignment_status='active' and assignment_role=any(roles));
$$;

create or replace function public.guard_architect_assignment()
returns trigger language plpgsql security definer set search_path=public as $$
declare creator uuid;
begin
  if not public.mettelo_is_project_architect(new.user_id) then raise exception 'Only an approved Project Architect can receive an architect assignment'; end if;
  select created_by_user_id into creator from public.projects where id=new.project_id;
  if new.assignment_role='reviewing_architect' and creator=new.user_id then raise exception 'A Project Architect cannot review their own project'; end if;
  return new;
end $$;

drop trigger if exists guard_project_architect_assignment on public.project_architect_assignments;
create trigger guard_project_architect_assignment before insert or update on public.project_architect_assignments for each row execute function public.guard_architect_assignment();

create or replace function public.guard_project_governance_transition()
returns trigger language plpgsql set search_path=public as $$
begin
  if new.risk_level='prohibited' and new.governance_status not in ('draft','changes_requested','denied','paused') then raise exception 'Prohibited projects cannot proceed'; end if;
  if new.risk_level='controlled' and new.governance_status='approved' and new.admin_approved_at is null then raise exception 'Controlled projects require Admin approval'; end if;
  if new.risk_level='controlled' and new.governance_status='approved' and not exists(
    select 1 from public.project_governance_events e where e.project_id=new.id and e.event_type='review_recommend_admin'
  ) then raise exception 'Controlled projects require an independent Architect recommendation'; end if;
  if new.governance_status='approved' and not exists(
    select 1 from public.project_architect_assignments a where a.project_id=new.id and a.assignment_role='reviewing_architect' and a.assignment_status='active' and a.user_id is distinct from new.created_by_user_id
  ) then raise exception 'Independent Project Architect review is required'; end if;
  return new;
end $$;

drop trigger if exists guard_project_governance_transition on public.projects;
create trigger guard_project_governance_transition before update of governance_status,risk_level,admin_approved_at on public.projects for each row execute function public.guard_project_governance_transition();

create or replace function public.prevent_governance_event_mutation()
returns trigger language plpgsql as $$ begin raise exception 'Project governance history is immutable'; end $$;
drop trigger if exists prevent_governance_event_update on public.project_governance_events;
create trigger prevent_governance_event_update before update or delete on public.project_governance_events for each row execute function public.prevent_governance_event_mutation();

alter table public.project_architect_assignments enable row level security;
alter table public.project_governance_events enable row level security;

create policy "assigned architects read assignments" on public.project_architect_assignments for select to authenticated using (
  user_id=auth.uid() or public.mettelo_is_assigned_architect(project_id) or coalesce(auth.jwt()->'app_metadata'->>'role','')='admin'
);
create policy "assigned architects read governance history" on public.project_governance_events for select to authenticated using (
  public.mettelo_is_assigned_architect(project_id) or coalesce(auth.jwt()->'app_metadata'->>'role','')='admin'
);

revoke all on public.project_architect_assignments,public.project_governance_events from anon,authenticated;
grant select on public.project_architect_assignments,public.project_governance_events to authenticated;
grant all on public.project_architect_assignments,public.project_governance_events to service_role;
revoke all on function public.mettelo_is_project_architect(uuid),public.mettelo_is_assigned_architect(uuid,text[]) from public;
grant execute on function public.mettelo_is_project_architect(uuid),public.mettelo_is_assigned_architect(uuid,text[]) to authenticated,service_role;
