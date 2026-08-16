-- Phase 8 — Organisation, Partnership & Support

alter table public.form_submissions
  add column if not exists workflow_stage text,
  add column if not exists next_follow_up_at timestamptz,
  add column if not exists last_contacted_at timestamptz,
  add column if not exists resolution_summary text;

alter table public.form_submissions drop constraint if exists form_submissions_workflow_stage_check;
alter table public.form_submissions add constraint form_submissions_workflow_stage_check
  check (workflow_stage is null or workflow_stage in ('new','reviewing','qualified','discovery_call','proposal','active','closed'));

create index if not exists form_submissions_follow_up_idx
  on public.form_submissions(next_follow_up_at)
  where next_follow_up_at is not null and status <> 'resolved';

create table if not exists public.form_submission_notes (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.form_submissions(id) on delete cascade,
  author_user_id uuid references auth.users(id) on delete set null,
  note text not null check (char_length(note) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index if not exists form_submission_notes_submission_idx on public.form_submission_notes(submission_id,created_at desc);
alter table public.form_submission_notes enable row level security;

create table if not exists public.form_submission_history (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.form_submissions(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  from_stage text,
  to_stage text,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists form_submission_history_submission_idx on public.form_submission_history(submission_id,created_at desc);
alter table public.form_submission_history enable row level security;

create table if not exists public.form_submission_documents (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.form_submissions(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  content_type text not null default 'application/pdf',
  size_bytes bigint not null check (size_bytes > 0),
  uploaded_by uuid references auth.users(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists form_submission_documents_submission_idx on public.form_submission_documents(submission_id,created_at desc);
alter table public.form_submission_documents enable row level security;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('intake-proposals','intake-proposals',false,10485760,array['application/pdf'])
on conflict (id) do update set public=false,file_size_limit=10485760,allowed_mime_types=array['application/pdf'];

alter table public.newsletter_subscribers
  add column if not exists marketing_preferences jsonb not null default '{"projects":true,"events":true,"opportunities":true,"insights":true}'::jsonb,
  add column if not exists unsubscribe_token uuid not null default gen_random_uuid(),
  add column if not exists unsubscribed_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists newsletter_subscribers_unsubscribe_token_idx on public.newsletter_subscribers(unsubscribe_token);

comment on column public.newsletter_subscribers.marketing_preferences is
  'Marketing newsletter topics only. Transactional account, project, recruitment and security communications are controlled separately.';
