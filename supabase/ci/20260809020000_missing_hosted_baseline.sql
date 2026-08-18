-- CI compatibility baseline for hosted objects that pre-date the repository migration history.
-- This file is applied only by scripts/prepare-local-supabase.mjs in an ephemeral local stack.
-- Production remains authoritative until these objects are reconciled into canonical migrations.

create extension if not exists pgcrypto;

-- Taxonomy objects existed in the hosted database before the current migration history.
create table if not exists public.domains (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null unique,
  description text,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.tools (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null unique,
  category text not null,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.methods (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null unique,
  category text not null default 'analytics',
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.project_domains (
  project_id uuid not null references public.projects(id) on delete cascade,
  domain_id uuid not null references public.domains(id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key(project_id,domain_id)
);

create table if not exists public.project_tools (
  project_id uuid not null references public.projects(id) on delete cascade,
  tool_id uuid not null references public.tools(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(project_id,tool_id)
);

create table if not exists public.project_methods (
  project_id uuid not null references public.projects(id) on delete cascade,
  method_id uuid not null references public.methods(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(project_id,method_id)
);

create table if not exists public.career_roles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  team text,
  employment_type text not null default 'contract',
  location text,
  work_arrangement text,
  salary_text text,
  summary text not null,
  responsibilities text not null,
  requirements text not null,
  nice_to_have text,
  application_questions jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft','published','closed','archived')),
  published_at timestamptz,
  closes_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  eligibility text,
  expected_response_days integer default 14 check (expected_response_days is null or expected_response_days > 0),
  application_process text
);

create table if not exists public.career_applications (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.career_roles(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  email text not null,
  phone text,
  location text,
  linkedin_url text,
  portfolio_url text,
  cv_path text,
  work_authorisation text,
  motivation text not null,
  relevant_experience text not null,
  answers jsonb not null default '{}'::jsonb,
  status text not null default 'submitted' check (status in ('submitted','in_review','shortlisted','interview','offer','hired','rejected','withdrawn')),
  admin_notes text,
  interview_at timestamptz,
  interview_details text,
  offer_details text,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  interview_timezone text,
  interview_format text,
  interview_url text,
  interviewer text,
  interview_instructions text,
  offer_salary_rate text,
  offer_start_date date,
  offer_employment_type text,
  offer_manager text,
  offer_working_arrangement text,
  offer_conditions text,
  offer_acceptance_deadline timestamptz,
  offer_personal_message text,
  withdrawn_at timestamptz
);

create table if not exists public.career_application_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.career_applications(id) on delete cascade,
  from_status text,
  to_status text not null,
  note text,
  actor_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.content_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text not null default '',
  body text not null default '',
  author_name text not null default 'Mettelo Editorial',
  author_user_id uuid references auth.users(id) on delete set null,
  content_type text not null default 'insight' check (content_type in ('news','insight','research','company_update','career','community','product')),
  featured_image text,
  featured_image_alt text,
  seo_title text,
  seo_description text,
  status text not null default 'draft' check (status in ('draft','published','unpublished','archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  recipient_email text not null,
  template_key text not null,
  subject text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','queued','sending','sent','failed','retrying','dead_letter','cancelled')),
  attempts integer not null default 0,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  event_key text,
  dedupe_key text,
  next_attempt_at timestamptz,
  last_attempt_at timestamptz,
  provider_message_id text,
  max_attempts integer not null default 5,
  permanent_failure boolean not null default false,
  dead_letter_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.email_delivery_attempts (
  id uuid primary key default gen_random_uuid(),
  outbox_id uuid not null references public.email_outbox(id) on delete cascade,
  attempt_number integer not null,
  status text not null check (status in ('sending','sent','failed','permanent_failure')),
  provider_message_id text,
  error_message text,
  http_status integer,
  attempted_at timestamptz not null default now()
);

create table if not exists public.notification_event_catalogue (
  event_key text primary key,
  product_area text not null,
  description text not null,
  default_channel text not null check (default_channel in ('in_app','email_and_in_app','admin_only','none')),
  urgency text not null default 'normal' check (urgency in ('low','normal','high','critical')),
  action_required boolean not null default false,
  retryable boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  event_key text not null references public.notification_event_catalogue(event_key) on delete cascade,
  in_app_enabled boolean not null default true,
  email_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id,event_key)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  application_id uuid references public.project_applications(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  action_url text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  event_key text,
  dedupe_key text,
  channel text not null default 'in_app'
);

create table if not exists public.project_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  run_number integer not null default 1,
  status text not null default 'forming' check (status in ('forming','active','paused','review','completed','cancelled')),
  team_size_threshold integer not null default 5,
  kickoff_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id,run_number)
);

alter table public.domains enable row level security;
alter table public.tools enable row level security;
alter table public.methods enable row level security;
alter table public.project_domains enable row level security;
alter table public.project_tools enable row level security;
alter table public.project_methods enable row level security;
alter table public.career_roles enable row level security;
alter table public.career_applications enable row level security;
alter table public.career_application_events enable row level security;
alter table public.content_posts enable row level security;
alter table public.email_outbox enable row level security;
alter table public.email_delivery_attempts enable row level security;
alter table public.notification_event_catalogue enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notifications enable row level security;
alter table public.project_runs enable row level security;

create policy "active domains are public" on public.domains for select to anon,authenticated using (is_active);
create policy "active tools are public" on public.tools for select to anon,authenticated using (is_active);
create policy "active methods are public" on public.methods for select to anon,authenticated using (is_active);
create policy "public can view published career roles" on public.career_roles
  for select using (status='published' and (closes_at is null or closes_at > now()));
create policy "members can view own career applications" on public.career_applications
  for select to authenticated using (user_id=(select auth.uid()));
create policy "members can view own career application events" on public.career_application_events
  for select to authenticated using (exists(select 1 from public.career_applications ca where ca.id=application_id and ca.user_id=(select auth.uid())));
create policy "published content is public" on public.content_posts
  for select to anon,authenticated using (status='published' and published_at is not null and published_at <= now());
create policy "catalogue readable by authenticated users" on public.notification_event_catalogue
  for select to authenticated using (true);
create policy "users manage own notification preferences" on public.notification_preferences
  for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "notifications_select_own" on public.notifications
  for select to authenticated using (user_id=(select auth.uid()));
create policy "notifications_update_own" on public.notifications
  for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy "Public can view runs for public projects" on public.project_runs
  for select to anon,authenticated using (public.is_admin() or exists(select 1 from public.projects p where p.id=project_id and p.visibility='public'));

create index if not exists idx_project_domains_domain on public.project_domains(domain_id,project_id);
create index if not exists idx_project_tools_tool on public.project_tools(tool_id,project_id);
create index if not exists idx_project_methods_method on public.project_methods(method_id,project_id);
create index if not exists idx_career_applications_role on public.career_applications(role_id);
create index if not exists idx_career_applications_user on public.career_applications(user_id);
create index if not exists idx_career_application_events_application on public.career_application_events(application_id,created_at desc);
create index if not exists idx_email_outbox_status on public.email_outbox(status,next_attempt_at,created_at);
create unique index if not exists idx_email_outbox_dedupe on public.email_outbox(dedupe_key) where dedupe_key is not null;
create index if not exists idx_notifications_user_created on public.notifications(user_id,created_at desc);
create index if not exists idx_notifications_application on public.notifications(application_id) where application_id is not null;
create index if not exists idx_project_runs_project on public.project_runs(project_id);

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('career-cvs','career-cvs',false,10485760,array['application/pdf']::text[])
on conflict (id) do nothing;
