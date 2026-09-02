-- Project Catalogue Filters V2 Phase 1 — facet visibility must inherit the project visibility contract.
-- This closes the gap where signed-in members could read a `visibility='members'` project but not its taxonomy relations.

alter table public.project_role_families enable row level security;
drop policy if exists "visible project role families are readable" on public.project_role_families;
create policy "visible project role families are readable"
on public.project_role_families
for select
to anon,authenticated
using (
  exists(select 1 from public.projects p where p.id=project_role_families.project_id)
);

drop policy if exists "visible project capabilities are readable" on public.project_capabilities;
create policy "visible project capabilities are readable"
on public.project_capabilities
for select
to anon,authenticated
using (
  exists(select 1 from public.projects p where p.id=project_capabilities.project_id)
);

drop policy if exists "visible project domains are readable" on public.project_domains;
create policy "visible project domains are readable"
on public.project_domains
for select
to anon,authenticated
using (
  exists(select 1 from public.projects p where p.id=project_domains.project_id)
);

drop policy if exists "visible project tools are readable" on public.project_tools;
create policy "visible project tools are readable"
on public.project_tools
for select
to anon,authenticated
using (
  exists(select 1 from public.projects p where p.id=project_tools.project_id)
);

drop policy if exists "visible project methods are readable" on public.project_methods;
create policy "visible project methods are readable"
on public.project_methods
for select
to anon,authenticated
using (
  exists(select 1 from public.projects p where p.id=project_methods.project_id)
);

grant select on public.project_role_families to anon,authenticated;
grant select on public.project_capabilities to anon,authenticated;
grant select on public.project_domains to anon,authenticated;
grant select on public.project_tools to anon,authenticated;
grant select on public.project_methods to anon,authenticated;
grant select on public.capability_aliases to anon,authenticated;
grant select on public.project_catalogue_readiness to anon,authenticated;
