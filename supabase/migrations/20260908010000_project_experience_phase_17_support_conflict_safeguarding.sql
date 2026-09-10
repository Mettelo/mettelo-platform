-- Project Experience Phase 17: Support, Conflict & Safeguarding.
-- Private case management attached to the canonical project/run/membership model.
-- Admin access is intentionally server-mediated through existing capability checks.

create table if not exists public.project_support_cases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  project_run_id uuid not null references public.project_runs(id) on delete cascade,
  reporter_user_id uuid not null references auth.users(id) on delete restrict,
  category text not null,
  description text not null,
  status text not null default 'open',
  assigned_admin_user_id uuid references auth.users(id) on delete set null,
  resolution text,
  internal_notes text,
  recovery_plan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  closed_at timestamptz,
  constraint project_support_cases_category_check check (category in (
    'technical_access','resource_data','project_scope','project_lead_support',
    'team_collaboration','workload','conduct','accessibility_adjustment','other'
  )),
  constraint project_support_cases_status_check check (status in (
    'open','under_review','awaiting_member','recovery_in_progress','escalated','resolved','closed'
  )),
  constraint project_support_cases_description_check check (char_length(btrim(description)) between 20 and 6000),
  constraint project_support_cases_resolution_check check (resolution is null or char_length(btrim(resolution)) between 1 and 6000),
  constraint project_support_cases_internal_notes_check check (internal_notes is null or char_length(internal_notes) <= 12000),
  constraint project_support_cases_recovery_plan_check check (recovery_plan is null or char_length(btrim(recovery_plan)) between 1 and 6000)
);

create table if not exists public.project_support_case_updates (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.project_support_cases(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  body text,
  member_visible boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint project_support_case_updates_action_check check (action in (
    'created','reviewed','assigned','information_requested','member_update','recovery_plan_recorded',
    'responsibility_reassigned','lead_changed','replacement_approved','participation_paused',
    'member_removed','safeguarding_escalated','resolved','closed','reopened'
  )),
  constraint project_support_case_updates_body_check check (body is null or char_length(body) <= 12000),
  constraint project_support_case_updates_metadata_object_check check (jsonb_typeof(metadata)='object')
);

create index if not exists project_support_cases_reporter_idx
  on public.project_support_cases(reporter_user_id,created_at desc);
create index if not exists project_support_cases_run_status_idx
  on public.project_support_cases(project_run_id,status,created_at desc);
create index if not exists project_support_cases_admin_queue_idx
  on public.project_support_cases(status,assigned_admin_user_id,updated_at desc)
  where status<>'closed';
create index if not exists project_support_case_updates_case_idx
  on public.project_support_case_updates(case_id,created_at asc);

create or replace function public.phase17_touch_support_case_updated_at()
returns trigger language plpgsql set search_path=public as $$
begin
  new.updated_at=now();
  return new;
end;
$$;

drop trigger if exists project_support_cases_touch_updated_at on public.project_support_cases;
create trigger project_support_cases_touch_updated_at
before update on public.project_support_cases
for each row execute function public.phase17_touch_support_case_updated_at();

alter table public.project_support_cases enable row level security;
alter table public.project_support_case_updates enable row level security;

-- A signed-in reporter can create a case only for a project/run where they have
-- canonical membership. This deliberately does not require Project Lead approval.
drop policy if exists project_support_cases_reporter_insert on public.project_support_cases;
create policy project_support_cases_reporter_insert
on public.project_support_cases for insert to authenticated
with check (
  reporter_user_id=auth.uid()
  and exists (
    select 1 from public.project_members pm
    where pm.project_id=project_support_cases.project_id
      and pm.project_run_id=project_support_cases.project_run_id
      and pm.user_id=auth.uid()
      and pm.membership_status='active'
  )
  and status='open'
  and assigned_admin_user_id is null
  and resolution is null
  and internal_notes is null
  and recovery_plan is null
  and resolved_at is null
  and closed_at is null
);

-- Reporter can read their own case record. Project Leads and peers receive no
-- implicit access merely because they belong to the same project/run.
drop policy if exists project_support_cases_reporter_select on public.project_support_cases;
create policy project_support_cases_reporter_select
on public.project_support_cases for select to authenticated
using (reporter_user_id=auth.uid());

-- Reporters can see only explicitly member-visible case updates on their own case.
drop policy if exists project_support_case_updates_reporter_select on public.project_support_case_updates;
create policy project_support_case_updates_reporter_select
on public.project_support_case_updates for select to authenticated
using (
  member_visible=true
  and exists (
    select 1 from public.project_support_cases c
    where c.id=project_support_case_updates.case_id
      and c.reporter_user_id=auth.uid()
  )
);

-- No authenticated UPDATE/DELETE policies are defined. Admin case mutation is
-- server-mediated with service_role only after existing Admin capability checks.
-- This keeps private notes and safeguarding detail outside Project Lead/member RLS.
-- Row-level privacy is reinforced with column-level privileges: the reporter can
-- never request Admin-only columns such as internal_notes through PostgREST, even
-- on a row they legitimately own.
revoke all on public.project_support_cases from anon,authenticated;
revoke all on public.project_support_case_updates from anon,authenticated;

grant select (
  id,project_id,project_run_id,reporter_user_id,category,description,status,
  resolution,recovery_plan,created_at,updated_at,resolved_at,closed_at
) on public.project_support_cases to authenticated;
grant insert (
  project_id,project_run_id,reporter_user_id,category,description
) on public.project_support_cases to authenticated;
grant select (
  id,case_id,action,body,created_at
) on public.project_support_case_updates to authenticated;

comment on table public.project_support_cases is
  'Phase 17 private member support/conflict/safeguarding cases. Project Lead membership does not grant case access.';
comment on column public.project_support_cases.description is
  'Confidential in-app member report. Never copy this field into notification or email bodies.';
comment on column public.project_support_cases.internal_notes is
  'Restricted Admin-only notes. Column privileges deny reporter access even to their own case row.';
comment on table public.project_support_case_updates is
  'Phase 17 auditable case actions. Reporter RLS exposes only rows explicitly marked member_visible.';
