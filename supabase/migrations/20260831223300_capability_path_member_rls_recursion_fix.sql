-- Capability Paths V1: remove recursive RLS dependencies between published Path reads
-- and member follow mutations while preserving own-row and published-only guarantees.

create or replace function public.is_published_capability_path(target_path uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists(
    select 1 from public.capability_paths cp
    where cp.id=target_path and cp.status='published'
  );
$$;

create or replace function public.is_my_followed_capability_path(target_path uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select (select auth.uid()) is not null and exists(
    select 1 from public.member_capability_paths mcp
    where mcp.path_id=target_path
      and mcp.user_id=(select auth.uid())
      and mcp.status in ('following','paused','completed')
  );
$$;

revoke all on function public.is_published_capability_path(uuid) from public,anon;
revoke all on function public.is_my_followed_capability_path(uuid) from public,anon;
grant execute on function public.is_published_capability_path(uuid) to authenticated,service_role;
grant execute on function public.is_my_followed_capability_path(uuid) to authenticated,service_role;

-- Public reads remain published-only. Signed-in followers retain historical read context
-- through a SECURITY DEFINER predicate, avoiding member_capability_paths <-> capability_paths
-- policy recursion.
drop policy if exists "published or followed capability paths are readable" on public.capability_paths;
create policy "published or followed capability paths are readable" on public.capability_paths
for select to public using (
  status='published'
  or public.is_admin()
  or public.is_my_followed_capability_path(id)
);

drop policy if exists "published or followed capability path stages are readable" on public.capability_path_stages;
create policy "published or followed capability path stages are readable" on public.capability_path_stages
for select to public using (
  public.is_published_capability_path(path_id)
  or public.is_admin()
  or public.is_my_followed_capability_path(path_id)
);

drop policy if exists "published or followed visible capability path placements are readable" on public.capability_path_projects;
create policy "published or followed visible capability path placements are readable" on public.capability_path_projects
for select to public using (
  (
    (public.is_published_capability_path(path_id) or public.is_my_followed_capability_path(path_id))
    and (
      exists(
        select 1 from public.projects p
        where p.id=capability_path_projects.project_id
          and (p.visibility='public' or (p.visibility='members' and (select auth.uid()) is not null))
      )
      or exists(
        select 1 from public.project_members pm
        where pm.project_id=capability_path_projects.project_id
          and pm.user_id=(select auth.uid())
      )
    )
  )
  or public.is_admin()
);

-- Follow checks no longer select capability_paths through its member-aware policy.
drop policy if exists "members follow capability paths" on public.member_capability_paths;
create policy "members follow capability paths" on public.member_capability_paths
for insert to authenticated with check (
  user_id=(select auth.uid())
  and status='following'
  and completed_at is null
  and public.is_published_capability_path(path_id)
);

-- Primary switching is deliberately SECURITY DEFINER but remains caller-scoped and validates
-- that the target is already followed and currently published before mutating any row.
create or replace function public.set_my_primary_capability_path(target_path uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then raise exception 'Authentication required'; end if;
  if not public.is_published_capability_path(target_path) then
    raise exception 'Only a published Capability Path can be primary';
  end if;
  if not exists(
    select 1 from public.member_capability_paths mcp
    where mcp.user_id=caller and mcp.path_id=target_path
      and mcp.status in ('following','paused')
  ) then
    raise exception 'Follow a published Capability Path before making it primary';
  end if;
  update public.member_capability_paths
    set is_primary=false,updated_at=now()
    where user_id=caller and is_primary=true and path_id<>target_path;
  update public.member_capability_paths
    set is_primary=true,status='following',paused_at=null,updated_at=now()
    where user_id=caller and path_id=target_path;
end;
$$;

revoke all on function public.set_my_primary_capability_path(uuid) from public,anon;
grant execute on function public.set_my_primary_capability_path(uuid) to authenticated;
