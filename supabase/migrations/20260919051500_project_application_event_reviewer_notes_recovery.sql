-- Production backend integrity reconciliation.
-- Repairs schema objects used by deployed user/admin mutation routes when hosted
-- production has skipped or partially applied historical feature migrations.
-- Every change is additive/idempotent and preserves existing data.

-- Project Application review/audit compatibility.
alter table public.project_application_events
  add column if not exists reviewer_notes text,
  add column if not exists note text;

comment on column public.project_application_events.reviewer_notes is
  'Reviewer notes captured with canonical project application status transitions when available.';
comment on column public.project_application_events.note is
  'Human-readable audit note used by governed legacy-intake conversion and related application events.';

-- Admin Intake operational CRM/history compatibility.
alter table public.form_submissions
  add column if not exists workflow_stage text,
  add column if not exists next_follow_up_at timestamptz,
  add column if not exists last_contacted_at timestamptz,
  add column if not exists resolution_summary text;

create table if not exists public.form_submission_notes (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.form_submissions(id) on delete cascade,
  author_user_id uuid references auth.users(id) on delete set null,
  note text not null check (char_length(btrim(note)) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index if not exists form_submission_notes_submission_created_idx
  on public.form_submission_notes(submission_id,created_at desc);
alter table public.form_submission_notes enable row level security;
revoke all on table public.form_submission_notes from public,anon,authenticated;
grant select,insert,update,delete on table public.form_submission_notes to service_role;

create table if not exists public.form_submission_history (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.form_submissions(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  detail jsonb not null default '{}'::jsonb,
  from_stage text,
  to_stage text,
  created_at timestamptz not null default now()
);
create index if not exists form_submission_history_submission_created_idx
  on public.form_submission_history(submission_id,created_at desc);
alter table public.form_submission_history enable row level security;
revoke all on table public.form_submission_history from public,anon,authenticated;
grant select,insert,update,delete on table public.form_submission_history to service_role;

-- Completion review compatibility. Older hosted schemas may have never received
-- the delivery-workspace completion request table; current APIs require both the
-- historical requested_at field and created_at compatibility projection.
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
  created_at timestamptz not null default now()
);
alter table public.project_completion_requests
  add column if not exists requested_at timestamptz not null default now(),
  add column if not exists created_at timestamptz not null default now();
create unique index if not exists project_completion_requests_one_pending_idx
  on public.project_completion_requests(project_run_id) where status='pending';
create index if not exists project_completion_requests_run_created_idx
  on public.project_completion_requests(project_run_id,created_at desc);
create index if not exists project_completion_requests_run_idx
  on public.project_completion_requests(project_run_id,requested_at desc);
alter table public.project_completion_requests enable row level security;
grant select,insert,update,delete on table public.project_completion_requests to service_role;

-- Delivery history objects required by current Lab and Phase 19 immutability.
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
  created_at timestamptz not null default now()
);
create index if not exists project_task_events_task_created_idx
  on public.project_task_events(task_id,created_at desc);
create index if not exists project_task_events_run_created_idx
  on public.project_task_events(project_run_id,created_at desc);
alter table public.project_task_events enable row level security;
grant select on public.project_task_events to authenticated;
grant select,insert,update,delete on public.project_task_events to service_role;
revoke insert,update,delete on public.project_task_events from anon,authenticated;

create table if not exists public.project_data_source_versions (
  id uuid primary key default gen_random_uuid(),
  data_source_id uuid not null references public.project_data_sources(id) on delete cascade,
  project_run_id uuid not null references public.project_runs(id) on delete cascade,
  version_label text not null,
  external_url text not null,
  change_summary text,
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists project_data_source_versions_source_created_idx
  on public.project_data_source_versions(data_source_id,created_at desc);
alter table public.project_data_source_versions enable row level security;
grant select on public.project_data_source_versions to authenticated;
grant select,insert,update,delete on public.project_data_source_versions to service_role;
revoke insert,update,delete on public.project_data_source_versions from anon,authenticated;
