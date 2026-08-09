-- Core Mettelo product-domain schema
-- Builds on 20260809_launch_readiness.sql

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

alter table public.profiles
  add column if not exists headline text,
  add column if not exists bio text,
  add column if not exists linkedin_url text,
  add column if not exists github_url text,
  add column if not exists skills text[] not null default '{}',
  add column if not exists is_public boolean not null default false;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text not null,
  problem_statement text,
  status text not null default 'draft' check (status in ('draft','pilot','recruiting','active','review','completed','archived')),
  visibility text not null default 'public' check (visibility in ('public','members','private')),
  location text,
  duration_weeks integer,
  weekly_commitment text,
  application_deadline timestamptz,
  starts_at timestamptz,
  ends_at timestamptz,
  github_url text,
  lead_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_roles (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  discipline text,
  description text,
  skills text[] not null default '{}',
  openings integer not null default 1 check (openings > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.project_applications (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  project_role_id uuid references public.project_roles(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  portfolio_url text,
  contribution_statement text not null,
  availability text,
  status text not null default 'submitted' check (status in ('submitted','in_review','shortlisted','accepted','declined','withdrawn')),
  reviewer_notes text,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id,user_id,project_role_id)
);

create table if not exists public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_role_id uuid references public.project_roles(id) on delete set null,
  team_role text not null default 'contributor' check (team_role in ('contributor','project_lead','reviewer','mentor')),
  joined_at timestamptz not null default now(),
  completed_at timestamptz,
  unique(project_id,user_id)
);

create table if not exists public.contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  contribution_type text not null check (contribution_type in ('analysis','engineering','research','design','documentation','qa','leadership','mentoring','community','open_source','other')),
  title text not null,
  description text,
  evidence_url text,
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','rejected')),
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  organisation text,
  opportunity_type text not null check (opportunity_type in ('job','referral','volunteer','fellowship','freelance','consulting','project','other')),
  summary text,
  location text,
  eligibility text,
  source_url text,
  access_level text not null default 'public' check (access_level in ('public','members')),
  status text not null default 'draft' check (status in ('draft','published','closed','archived')),
  published_at timestamptz,
  closes_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.saved_opportunities (
  user_id uuid not null references auth.users(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  saved_at timestamptz not null default now(),
  primary key(user_id,opportunity_id)
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  event_type text not null check (event_type in ('ama','workshop','showcase','networking','build_sprint','webinar','meetup','other')),
  summary text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location_label text,
  registration_url text,
  replay_url text,
  status text not null default 'draft' check (status in ('draft','published','completed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_registrations (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  registered_at timestamptz not null default now(),
  attended boolean,
  primary key(event_id,user_id)
);

create table if not exists public.spotlights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  title text not null,
  category text not null,
  summary text not null,
  evidence_url text,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  website text,
  organisation_type text,
  status text not null default 'prospect' check (status in ('prospect','active','inactive')),
  created_at timestamptz not null default now()
);

create table if not exists public.partnerships (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  title text not null,
  partnership_type text,
  status text not null default 'discovery' check (status in ('discovery','scoping','active','completed','declined')),
  owner_user_id uuid references auth.users(id) on delete set null,
  starts_at date,
  ends_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects enable row level security;
alter table public.project_roles enable row level security;
alter table public.project_applications enable row level security;
alter table public.project_members enable row level security;
alter table public.contributions enable row level security;
alter table public.opportunities enable row level security;
alter table public.saved_opportunities enable row level security;
alter table public.events enable row level security;
alter table public.event_registrations enable row level security;
alter table public.spotlights enable row level security;
alter table public.organisations enable row level security;
alter table public.partnerships enable row level security;

create policy "public projects readable" on public.projects for select using (visibility='public' and status in ('pilot','recruiting','active','review','completed') or public.is_admin());
create policy "member projects readable" on public.projects for select using (visibility='members' and auth.uid() is not null);
create policy "admins manage projects" on public.projects for all using (public.is_admin()) with check (public.is_admin());

create policy "roles readable with project" on public.project_roles for select using (exists(select 1 from public.projects p where p.id=project_id and ((p.visibility='public' and p.status in ('pilot','recruiting','active','review','completed')) or (p.visibility='members' and auth.uid() is not null) or public.is_admin())));
create policy "admins manage project roles" on public.project_roles for all using (public.is_admin()) with check (public.is_admin());

create policy "users read own applications" on public.project_applications for select using (auth.uid()=user_id or public.is_admin());
create policy "users create own applications" on public.project_applications for insert with check (auth.uid()=user_id);
create policy "users withdraw own applications" on public.project_applications for update using (auth.uid()=user_id or public.is_admin()) with check (auth.uid()=user_id or public.is_admin());
create policy "admins manage applications" on public.project_applications for all using (public.is_admin()) with check (public.is_admin());

create policy "members read own project memberships" on public.project_members for select using (auth.uid()=user_id or public.is_admin());
create policy "admins manage project memberships" on public.project_members for all using (public.is_admin()) with check (public.is_admin());

create policy "public verified contributions readable" on public.contributions for select using ((verification_status='verified' and is_public) or auth.uid()=user_id or public.is_admin());
create policy "users create own contributions" on public.contributions for insert with check (auth.uid()=user_id);
create policy "admins manage contributions" on public.contributions for all using (public.is_admin()) with check (public.is_admin());

create policy "published opportunities readable" on public.opportunities for select using ((status='published' and (access_level='public' or auth.uid() is not null)) or public.is_admin());
create policy "admins manage opportunities" on public.opportunities for all using (public.is_admin()) with check (public.is_admin());
create policy "users manage own saved opportunities" on public.saved_opportunities for all using (auth.uid()=user_id) with check (auth.uid()=user_id);

create policy "published events readable" on public.events for select using (status in ('published','completed') or public.is_admin());
create policy "admins manage events" on public.events for all using (public.is_admin()) with check (public.is_admin());
create policy "users manage own event registrations" on public.event_registrations for all using (auth.uid()=user_id or public.is_admin()) with check (auth.uid()=user_id or public.is_admin());

create policy "published spotlights readable" on public.spotlights for select using (status='published' or public.is_admin());
create policy "admins manage spotlights" on public.spotlights for all using (public.is_admin()) with check (public.is_admin());

create policy "admins manage organisations" on public.organisations for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage partnerships" on public.partnerships for all using (public.is_admin()) with check (public.is_admin());

create index if not exists idx_projects_status on public.projects(status);
create index if not exists idx_project_applications_user on public.project_applications(user_id);
create index if not exists idx_project_applications_project on public.project_applications(project_id);
create index if not exists idx_contributions_user on public.contributions(user_id);
create index if not exists idx_opportunities_status on public.opportunities(status,published_at desc);
create index if not exists idx_events_status_starts on public.events(status,starts_at);
create index if not exists idx_form_submissions_type_status on public.form_submissions(form_type,status,created_at desc);
