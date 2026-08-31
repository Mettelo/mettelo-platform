-- Capability Paths V1 Phase 4: member follow, primary path and historical access.
-- Progress remains derived from canonical project_members and contributions records.

-- Members who already follow a Path retain historical read access if it is later archived.
drop policy if exists "published capability paths are readable" on public.capability_paths;
create policy "published or followed capability paths are readable" on public.capability_paths
for select to public using (
  status='published'
  or public.is_admin()
  or exists(
    select 1 from public.member_capability_paths mcp
    where mcp.path_id=capability_paths.id
      and mcp.user_id=(select auth.uid())
  )
);

drop policy if exists "published capability path stages are readable" on public.capability_path_stages;
create policy "published or followed capability path stages are readable" on public.capability_path_stages
for select to public using (
  exists(select 1 from public.capability_paths cp where cp.id=capability_path_stages.path_id and cp.status='published')
  or public.is_admin()
  or exists(
    select 1 from public.member_capability_paths mcp
    where mcp.path_id=capability_path_stages.path_id
      and mcp.user_id=(select auth.uid())
  )
);

drop policy if exists "published capability path placements are readable" on public.capability_path_projects;
create policy "published or followed visible capability path placements are readable" on public.capability_path_projects
for select to public using (
  (
    (
      exists(select 1 from public.capability_paths cp where cp.id=capability_path_projects.path_id and cp.status='published')
      or exists(
        select 1 from public.member_capability_paths mcp
        where mcp.path_id=capability_path_projects.path_id
          and mcp.user_id=(select auth.uid())
      )
    )
    and (
      exists(select 1 from public.projects p where p.id=capability_path_projects.project_id and p.visibility in ('public','members'))
      or exists(select 1 from public.project_members pm where pm.project_id=capability_path_projects.project_id and pm.user_id=(select auth.uid()))
    )
  )
  or public.is_admin()
);

-- Atomically move the caller's primary marker. The target must be a currently published Path already followed by the caller.
create or replace function public.set_my_primary_capability_path(target_path uuid)
returns void
language plpgsql
security invoker
set search_path=public
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then raise exception 'Authentication required'; end if;
  if not exists(
    select 1 from public.member_capability_paths mcp
    join public.capability_paths cp on cp.id=mcp.path_id
    where mcp.user_id=caller and mcp.path_id=target_path
      and mcp.status in ('following','paused') and cp.status='published'
  ) then
    raise exception 'Follow a published Capability Path before making it primary';
  end if;
  update public.member_capability_paths set is_primary=false,updated_at=now()
  where user_id=caller and is_primary=true and path_id<>target_path;
  update public.member_capability_paths set is_primary=true,status='following',paused_at=null,updated_at=now()
  where user_id=caller and path_id=target_path;
end;
$$;
revoke all on function public.set_my_primary_capability_path(uuid) from public,anon;
grant execute on function public.set_my_primary_capability_path(uuid) to authenticated;

-- Explicit service role grants for server-side member support/QA while RLS remains authoritative for member clients.
grant select,insert,update,delete on public.member_capability_paths to service_role;
grant select on public.capability_paths,public.capability_path_stages,public.capability_path_projects to service_role;
