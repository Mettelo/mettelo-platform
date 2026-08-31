-- Capability Paths V1 Phase 1 foundation.
-- Additive only: existing projects, applications, memberships and Proof remain canonical.

create table if not exists public.capabilities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null unique,
  capability_type text not null,
  description text,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint capabilities_type_check check (capability_type in ('technical','professional'))
);

create table if not exists public.project_capabilities (
  project_id uuid not null references public.projects(id) on delete cascade,
  capability_id uuid not null references public.capabilities(id) on delete cascade,
  importance text not null default 'core',
  evidence_expected boolean not null default false,
  created_at timestamptz not null default now(),
  primary key(project_id,capability_id),
  constraint project_capabilities_importance_check check (importance in ('core','supporting','exposure'))
);

create table if not exists public.capability_paths (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null unique,
  target_role text not null,
  short_description text,
  description text,
  progression_summary text,
  target_outcome text not null,
  status text not null default 'draft',
  sort_order integer not null default 100,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint capability_paths_status_check check (status in ('draft','published','archived'))
);

create table if not exists public.capability_path_stages (
  id uuid primary key default gen_random_uuid(),
  path_id uuid not null references public.capability_paths(id) on delete cascade,
  slug text not null,
  name text not null,
  description text,
  position integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint capability_path_stages_position_check check (position > 0),
  constraint capability_path_stages_path_slug_key unique(path_id,slug),
  constraint capability_path_stages_path_position_key unique(path_id,position),
  constraint capability_path_stages_path_id_id_key unique(path_id,id)
);

create table if not exists public.capability_path_projects (
  path_id uuid not null references public.capability_paths(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  stage_id uuid not null,
  position integer not null,
  competency_focus text not null,
  capability_built text not null,
  prerequisite_project_id uuid,
  prerequisite_mode text not null default 'recommended',
  path_outcome text,
  placement_type text not null default 'recommended',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(path_id,project_id),
  constraint capability_path_projects_position_check check (position > 0),
  constraint capability_path_projects_no_self_prerequisite_check check (prerequisite_project_id is null or prerequisite_project_id <> project_id),
  constraint capability_path_projects_path_position_key unique(path_id,position),
  constraint capability_path_projects_stage_fk foreign key(path_id,stage_id)
    references public.capability_path_stages(path_id,id) on delete restrict,
  constraint capability_path_projects_prerequisite_mode_check check (prerequisite_mode in ('recommended','required')),
  constraint capability_path_projects_placement_type_check check (placement_type in ('recommended','required','optional'))
);

alter table public.capability_path_projects
  drop constraint if exists capability_path_projects_prerequisite_fk;
alter table public.capability_path_projects
  add constraint capability_path_projects_prerequisite_fk
  foreign key(path_id,prerequisite_project_id)
  references public.capability_path_projects(path_id,project_id)
  on delete no action
  deferrable initially deferred;

create table if not exists public.member_capability_paths (
  user_id uuid not null references public.profiles(id) on delete cascade,
  path_id uuid not null references public.capability_paths(id) on delete restrict,
  status text not null default 'following',
  is_primary boolean not null default false,
  started_at timestamptz not null default now(),
  paused_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(user_id,path_id),
  constraint member_capability_paths_status_check check (status in ('following','paused','completed'))
);

create unique index if not exists member_capability_paths_one_primary_idx
  on public.member_capability_paths(user_id)
  where is_primary;
create index if not exists capabilities_type_active_idx on public.capabilities(capability_type,is_active,sort_order);
create index if not exists project_capabilities_capability_idx on public.project_capabilities(capability_id,project_id);
create index if not exists capability_paths_public_idx on public.capability_paths(status,sort_order,name);
create index if not exists capability_path_stages_path_idx on public.capability_path_stages(path_id,position);
create index if not exists capability_path_projects_project_idx on public.capability_path_projects(project_id,path_id);
create index if not exists capability_path_projects_stage_idx on public.capability_path_projects(path_id,stage_id,position);
create index if not exists member_capability_paths_path_idx on public.member_capability_paths(path_id,status,user_id);

alter table public.capabilities enable row level security;
alter table public.project_capabilities enable row level security;
alter table public.capability_paths enable row level security;
alter table public.capability_path_stages enable row level security;
alter table public.capability_path_projects enable row level security;
alter table public.member_capability_paths enable row level security;

drop policy if exists "active capabilities are readable" on public.capabilities;
create policy "active capabilities are readable" on public.capabilities
for select to public using (is_active or public.is_admin());

drop policy if exists "visible project capabilities are readable" on public.project_capabilities;
create policy "visible project capabilities are readable" on public.project_capabilities
for select to public using (
  exists(select 1 from public.projects p where p.id=project_capabilities.project_id and p.visibility='public')
  or exists(select 1 from public.project_members pm where pm.project_id=project_capabilities.project_id and pm.user_id=(select auth.uid()))
  or public.is_admin()
);

drop policy if exists "published capability paths are readable" on public.capability_paths;
create policy "published capability paths are readable" on public.capability_paths
for select to public using (status='published' or public.is_admin());

drop policy if exists "published capability path stages are readable" on public.capability_path_stages;
create policy "published capability path stages are readable" on public.capability_path_stages
for select to public using (
  exists(select 1 from public.capability_paths cp where cp.id=capability_path_stages.path_id and cp.status='published')
  or public.is_admin()
);

drop policy if exists "published capability path placements are readable" on public.capability_path_projects;
create policy "published capability path placements are readable" on public.capability_path_projects
for select to public using (
  (
    exists(select 1 from public.capability_paths cp where cp.id=capability_path_projects.path_id and cp.status='published')
    and (
      exists(select 1 from public.projects p where p.id=capability_path_projects.project_id and p.visibility='public')
      or exists(select 1 from public.project_members pm where pm.project_id=capability_path_projects.project_id and pm.user_id=(select auth.uid()))
    )
  )
  or public.is_admin()
);

drop policy if exists "members read own capability paths" on public.member_capability_paths;
create policy "members read own capability paths" on public.member_capability_paths
for select to authenticated using (user_id=(select auth.uid()) or public.is_admin());

drop policy if exists "members follow capability paths" on public.member_capability_paths;
create policy "members follow capability paths" on public.member_capability_paths
for insert to authenticated with check (
  user_id=(select auth.uid())
  and status='following'
  and completed_at is null
  and exists(select 1 from public.capability_paths cp where cp.id=path_id and cp.status='published')
);

drop policy if exists "members update own capability paths" on public.member_capability_paths;
create policy "members update own capability paths" on public.member_capability_paths
for update to authenticated
using (user_id=(select auth.uid()) and status in ('following','paused'))
with check (user_id=(select auth.uid()) and status in ('following','paused') and completed_at is null);

drop policy if exists "members unfollow capability paths" on public.member_capability_paths;
create policy "members unfollow capability paths" on public.member_capability_paths
for delete to authenticated using (user_id=(select auth.uid()) and status in ('following','paused'));

grant select on public.capabilities to anon,authenticated;
grant select on public.project_capabilities to anon,authenticated;
grant select on public.capability_paths to anon,authenticated;
grant select on public.capability_path_stages to anon,authenticated;
grant select on public.capability_path_projects to anon,authenticated;
grant select,insert,update,delete on public.member_capability_paths to authenticated;
