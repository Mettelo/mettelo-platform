drop policy if exists "visible project domains are readable" on public.project_domains;
create policy "visible project domains are readable" on public.project_domains
for select to public
using (
  exists(select 1 from public.projects p where p.id=project_domains.project_id and p.visibility='public')
  or exists(select 1 from public.project_members pm where pm.project_id=project_domains.project_id and pm.user_id=(select auth.uid()))
  or public.is_admin()
);

drop policy if exists "visible project tools are readable" on public.project_tools;
create policy "visible project tools are readable" on public.project_tools
for select to public
using (
  exists(select 1 from public.projects p where p.id=project_tools.project_id and p.visibility='public')
  or exists(select 1 from public.project_members pm where pm.project_id=project_tools.project_id and pm.user_id=(select auth.uid()))
  or public.is_admin()
);

drop policy if exists "visible project methods are readable" on public.project_methods;
create policy "visible project methods are readable" on public.project_methods
for select to public
using (
  exists(select 1 from public.projects p where p.id=project_methods.project_id and p.visibility='public')
  or exists(select 1 from public.project_members pm where pm.project_id=project_methods.project_id and pm.user_id=(select auth.uid()))
  or public.is_admin()
);

create table if not exists public.profile_domain_preferences (
  user_id uuid not null references public.profiles(id) on delete cascade,
  domain_id uuid not null references public.domains(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id,domain_id)
);

create table if not exists public.profile_tool_preferences (
  user_id uuid not null references public.profiles(id) on delete cascade,
  tool_id uuid not null references public.tools(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id,tool_id)
);

create index if not exists profile_domain_preferences_domain_idx on public.profile_domain_preferences(domain_id,user_id);
create index if not exists profile_tool_preferences_tool_idx on public.profile_tool_preferences(tool_id,user_id);

alter table public.profile_domain_preferences enable row level security;
alter table public.profile_tool_preferences enable row level security;

drop policy if exists "members read own domain preferences" on public.profile_domain_preferences;
create policy "members read own domain preferences" on public.profile_domain_preferences
for select to authenticated using (user_id=(select auth.uid()));
drop policy if exists "members insert own domain preferences" on public.profile_domain_preferences;
create policy "members insert own domain preferences" on public.profile_domain_preferences
for insert to authenticated with check (user_id=(select auth.uid()));
drop policy if exists "members delete own domain preferences" on public.profile_domain_preferences;
create policy "members delete own domain preferences" on public.profile_domain_preferences
for delete to authenticated using (user_id=(select auth.uid()));

drop policy if exists "members read own tool preferences" on public.profile_tool_preferences;
create policy "members read own tool preferences" on public.profile_tool_preferences
for select to authenticated using (user_id=(select auth.uid()));
drop policy if exists "members insert own tool preferences" on public.profile_tool_preferences;
create policy "members insert own tool preferences" on public.profile_tool_preferences
for insert to authenticated with check (user_id=(select auth.uid()));
drop policy if exists "members delete own tool preferences" on public.profile_tool_preferences;
create policy "members delete own tool preferences" on public.profile_tool_preferences
for delete to authenticated using (user_id=(select auth.uid()));
