-- Runtime parity repair for environments whose hosted migration history stopped before
-- the Sep 1/2 project catalogue releases. This is deliberately additive/idempotent.
-- It restores only runtime dependencies required for browsing and private bookmarks;
-- governed taxonomy backfills remain owned by their original versioned migrations.

create table if not exists public.saved_projects (
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  saved_at timestamptz not null default now(),
  primary key (user_id, project_id)
);
create index if not exists saved_projects_project_idx on public.saved_projects(project_id, saved_at desc);
alter table public.saved_projects enable row level security;
drop policy if exists "members manage own saved projects" on public.saved_projects;
create policy "members manage own saved projects"
on public.saved_projects for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
grant select, insert, delete on public.saved_projects to authenticated;
grant select, insert, update, delete on public.saved_projects to service_role;

alter table public.projects add column if not exists catalogue_working_model_source text not null default 'unspecified';
do $$ begin
  alter table public.projects add constraint projects_catalogue_working_model_source_check
    check (catalogue_working_model_source in ('unspecified','explicit','platform_remote_default','not_applicable'));
exception when duplicate_object then null; end $$;
update public.projects
set catalogue_working_model_source='explicit'
where location_type is not null and catalogue_working_model_source='unspecified';

create table if not exists public.project_role_families (
  project_id uuid not null references public.projects(id) on delete cascade,
  role_catalogue_id uuid not null references public.project_role_catalogue(id) on delete restrict,
  source text not null default 'catalogue_v2',
  created_at timestamptz not null default now(),
  primary key(project_id,role_catalogue_id)
);
create index if not exists project_role_families_role_idx on public.project_role_families(role_catalogue_id,project_id);
alter table public.project_role_families enable row level security;
drop policy if exists "visible project role families are readable" on public.project_role_families;
create policy "visible project role families are readable"
on public.project_role_families for select to anon,authenticated
using (exists(select 1 from public.projects p where p.id=project_role_families.project_id));
grant select on public.project_role_families to anon,authenticated;
grant select,insert,update,delete on public.project_role_families to service_role;
grant select on public.project_role_catalogue to anon,authenticated;

create table if not exists public.capability_aliases (
  alias text primary key,
  capability_id uuid not null references public.capabilities(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint capability_aliases_normalized_check check (alias=lower(btrim(alias)) and length(alias)>0)
);
create index if not exists capability_aliases_capability_idx on public.capability_aliases(capability_id);
alter table public.capability_aliases enable row level security;
drop policy if exists "active capability aliases are readable" on public.capability_aliases;
create policy "active capability aliases are readable"
on public.capability_aliases for select to anon,authenticated
using (exists(select 1 from public.capabilities c where c.id=capability_id and c.is_active));
grant select on public.capability_aliases to anon,authenticated;
grant select,insert,update,delete on public.capability_aliases to service_role;
