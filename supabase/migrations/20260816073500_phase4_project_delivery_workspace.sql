-- Phase 4 — Project Delivery Workspace

alter table public.project_tasks
  add column if not exists blocker_reason text,
  add column if not exists blocked_at timestamptz,
  add column if not exists blocked_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists priority text not null default 'normal',
  add column if not exists acceptance_criteria text,
  add column if not exists created_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists last_review_comment text;

alter table public.project_tasks drop constraint if exists project_tasks_status_check;
update public.project_tasks set status='ready_for_review' where status='review';
alter table public.project_tasks add constraint project_tasks_status_check check (status = any (array['todo'::text,'in_progress'::text,'blocked'::text,'ready_for_review'::text,'done'::text]));
alter table public.project_tasks drop constraint if exists project_tasks_priority_check;
alter table public.project_tasks add constraint project_tasks_priority_check check (priority = any (array['low'::text,'normal'::text,'high'::text,'urgent'::text]));

create table if not exists public.project_task_events (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.project_tasks(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  project_run_id uuid references public.project_runs(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  from_status text,
  to_status text,
  comment text,
  evidence_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint project_task_events_type_check check (event_type = any (array['created'::text,'status_changed'::text,'blocked'::text,'unblocked'::text,'review_requested'::text,'changes_requested'::text,'approved'::text,'evidence_updated'::text,'assigned'::text]))
);
create index if not exists project_task_events_task_created_idx on public.project_task_events(task_id,created_at desc);
create index if not exists project_task_events_run_created_idx on public.project_task_events(project_run_id,created_at desc);

alter table public.project_discussions
  add column if not exists linked_entity_type text,
  add column if not exists linked_entity_id uuid;
alter table public.project_discussions drop constraint if exists project_discussions_linked_entity_type_check;
alter table public.project_discussions add constraint project_discussions_linked_entity_type_check check (linked_entity_type is null or linked_entity_type = any (array['task'::text,'data_source'::text,'event'::text,'deliverable'::text]));

create table if not exists public.project_discussion_reads (
  project_run_id uuid not null references public.project_runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  last_read_message_id uuid references public.project_discussions(id) on delete set null,
  primary key(project_run_id,user_id)
);
create index if not exists project_discussion_reads_user_idx on public.project_discussion_reads(user_id,last_read_at desc);

alter table public.project_data_sources
  add column if not exists provenance text,
  add column if not exists download_policy text not null default 'team_only',
  add column if not exists publish_policy text not null default 'not_permitted';
alter table public.project_data_sources drop constraint if exists project_data_sources_download_policy_check;
alter table public.project_data_sources add constraint project_data_sources_download_policy_check check (download_policy = any (array['allowed'::text,'team_only'::text,'not_allowed'::text]));
alter table public.project_data_sources drop constraint if exists project_data_sources_publish_policy_check;
alter table public.project_data_sources add constraint project_data_sources_publish_policy_check check (publish_policy = any (array['permitted'::text,'approval_required'::text,'not_permitted'::text]));

create table if not exists public.project_data_source_versions (
  id uuid primary key default gen_random_uuid(),
  data_source_id uuid not null references public.project_data_sources(id) on delete cascade,
  project_run_id uuid not null references public.project_runs(id) on delete cascade,
  version_label text not null,
  external_url text not null,
  change_summary text,
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint project_data_source_versions_url_check check (external_url ~* '^https://')
);
create index if not exists project_data_source_versions_source_created_idx on public.project_data_source_versions(data_source_id,created_at desc);

create table if not exists public.project_completion_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  project_run_id uuid not null references public.project_runs(id) on delete cascade,
  requested_by_user_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'pending',
  readiness_snapshot jsonb not null default '{}'::jsonb,
  review_notes text,
  reviewed_by_user_id uuid references auth.users(id) on delete set null,
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  constraint project_completion_requests_status_check check (status = any (array['pending'::text,'changes_requested'::text,'approved'::text]))
);
create unique index if not exists project_completion_requests_one_pending_idx on public.project_completion_requests(project_run_id) where status='pending';
create index if not exists project_completion_requests_run_idx on public.project_completion_requests(project_run_id,requested_at desc);

alter table public.project_runs
  add column if not exists kickoff_notified_at timestamptz,
  add column if not exists completion_requested_at timestamptz;

alter table public.project_task_events enable row level security;
alter table public.project_discussion_reads enable row level security;
alter table public.project_data_source_versions enable row level security;
alter table public.project_completion_requests enable row level security;

drop policy if exists "project members read task events" on public.project_task_events;
create policy "project members read task events" on public.project_task_events for select to authenticated using (
  exists (select 1 from public.project_members pm where pm.project_run_id=project_task_events.project_run_id and pm.user_id=(select auth.uid()) and pm.membership_status in ('active','completed'))
  or (select auth.jwt()->'app_metadata'->>'role')='admin'
);

drop policy if exists "members manage own discussion read state" on public.project_discussion_reads;
create policy "members manage own discussion read state" on public.project_discussion_reads for all to authenticated using (
  user_id=(select auth.uid()) and exists (select 1 from public.project_members pm where pm.project_run_id=project_discussion_reads.project_run_id and pm.user_id=(select auth.uid()) and pm.membership_status in ('active','completed'))
) with check (
  user_id=(select auth.uid()) and exists (select 1 from public.project_members pm where pm.project_run_id=project_discussion_reads.project_run_id and pm.user_id=(select auth.uid()) and pm.membership_status in ('active','completed'))
);

drop policy if exists "project members read data versions" on public.project_data_source_versions;
create policy "project members read data versions" on public.project_data_source_versions for select to authenticated using (
  exists (select 1 from public.project_members pm where pm.project_run_id=project_data_source_versions.project_run_id and pm.user_id=(select auth.uid()) and pm.membership_status in ('active','completed'))
  or (select auth.jwt()->'app_metadata'->>'role')='admin'
);

drop policy if exists "project members read completion requests" on public.project_completion_requests;
create policy "project members read completion requests" on public.project_completion_requests for select to authenticated using (
  exists (select 1 from public.project_members pm where pm.project_run_id=project_completion_requests.project_run_id and pm.user_id=(select auth.uid()) and pm.membership_status in ('active','completed'))
  or (select auth.jwt()->'app_metadata'->>'role')='admin'
);
