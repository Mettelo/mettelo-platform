-- Feature 2: admin-managed contribution-role catalogue and multi-role applications.

create table if not exists public.project_role_catalogue (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null unique,
  description text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.project_role_catalogue enable row level security;

drop policy if exists "active project role catalogue public read" on public.project_role_catalogue;
create policy "active project role catalogue public read" on public.project_role_catalogue
for select to anon, authenticated using (active or coalesce((select auth.jwt()->'app_metadata'->>'role'),'')='admin');

insert into public.project_role_catalogue(slug,title,sort_order) values
('data-analyst','Data Analyst',10),
('data-engineer','Data Engineer',20),
('data-scientist','Data Scientist',30),
('ml-engineer','ML Engineer',40),
('ai-ml-researcher','AI/ML Researcher',50),
('bi-analytics-engineer','BI/Analytics Engineer',60),
('product-analyst','Product Analyst',70),
('project-manager-lead','Project Manager/Lead',80),
('business-analyst','Business Analyst',90),
('qa-testing','QA/Testing',100),
('technical-writer-documentation','Technical Writer/Documentation',110),
('ui-ux-designer','UI/UX Designer',120),
('frontend-developer','Frontend Developer',130),
('backend-developer','Backend Developer',140),
('devops-infrastructure','DevOps/Infrastructure',150),
('marketing-content','Marketing/Content',160),
('community-mentorship','Community/Mentorship',170)
on conflict (slug) do update set title=excluded.title, active=true, sort_order=excluded.sort_order, updated_at=now();

create table if not exists public.project_application_roles (
  application_id uuid not null references public.project_applications(id) on delete cascade,
  role_catalogue_id uuid not null references public.project_role_catalogue(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key(application_id, role_catalogue_id)
);

alter table public.project_application_roles enable row level security;

drop policy if exists "members read own application roles" on public.project_application_roles;
create policy "members read own application roles" on public.project_application_roles
for select to authenticated using (
  exists(select 1 from public.project_applications a where a.id=application_id and (a.user_id=(select auth.uid()) or coalesce((select auth.jwt()->'app_metadata'->>'role'),'')='admin'))
);

drop policy if exists "members add own application roles" on public.project_application_roles;
create policy "members add own application roles" on public.project_application_roles
for insert to authenticated with check (
  exists(select 1 from public.project_applications a where a.id=application_id and a.user_id=(select auth.uid()))
);
