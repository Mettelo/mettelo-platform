-- Capability Paths V1 Phase 3: safe public aggregate stats.
-- Exposes counts for published Paths only; never exposes private project identifiers or content.

create or replace function public.get_public_capability_path_stats()
returns table(
  path_id uuid,
  stage_count bigint,
  total_project_count bigint,
  public_project_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    cp.id as path_id,
    (select count(*) from public.capability_path_stages s where s.path_id=cp.id) as stage_count,
    (select count(*) from public.capability_path_projects cpp where cpp.path_id=cp.id) as total_project_count,
    (
      select count(*)
      from public.capability_path_projects cpp
      join public.projects p on p.id=cpp.project_id
      where cpp.path_id=cp.id and p.visibility='public'
    ) as public_project_count
  from public.capability_paths cp
  where cp.status='published';
$$;

revoke all on function public.get_public_capability_path_stats() from public;
grant execute on function public.get_public_capability_path_stats() to anon,authenticated;

comment on function public.get_public_capability_path_stats() is 'Returns aggregate counts for published Capability Paths without exposing private project placement details.';
