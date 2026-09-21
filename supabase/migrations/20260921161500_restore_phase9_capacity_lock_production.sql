-- Production schema reconciliation: restore the canonical Phase 9 project-capacity lock.
--
-- Production currently contains later Phase 9/10/11 functions that call
-- phase9_lock_project_capacity(uuid), but the helper itself is absent. This
-- causes Admin Force Start and any dependent capacity-changing flow to fail
-- with PostgreSQL 42883 at runtime.
--
-- Recreate the original canonical helper exactly. This is idempotent and keeps
-- existing lock ordering and concurrency semantics intact.

create or replace function public.phase9_lock_project_capacity(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if p_project_id is null then
    raise exception using errcode='23514',message='PROJECT_ID_REQUIRED';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_project_id::text,9));
end;
$$;

revoke all on function public.phase9_lock_project_capacity(uuid)
  from public,anon,authenticated;

comment on function public.phase9_lock_project_capacity(uuid) is
  'Canonical transaction-scoped Phase 9 project-capacity advisory lock used by membership, Offer, formation and Admin force-start flows.';
