-- Project Experience Phase 17: fail-fast wrapper for consequential support recovery.
--
-- The underlying Phase 17 coordinator reuses Phase 10/16 authorities, which can
-- legitimately acquire project/capacity/member/run locks. Under a true concurrent
-- recovery race, a losing request must never sit behind those deeper locks long
-- enough for PostgREST/Kong to time out. This wrapper adds a second, namespaced
-- transaction lock plus a short transaction-local lock timeout and normalizes
-- lock/deadlock/serialization contention to the canonical SUPPORT_CASE_STALE
-- response without surfacing SQLSTATE 40001 to the REST layer.

alter function public.phase17_execute_support_recovery(uuid,text,uuid,timestamptz,uuid,uuid,uuid)
  rename to phase17_execute_support_recovery_impl;

revoke all on function public.phase17_execute_support_recovery_impl(uuid,text,uuid,timestamptz,uuid,uuid,uuid)
  from public,anon,authenticated;
grant execute on function public.phase17_execute_support_recovery_impl(uuid,text,uuid,timestamptz,uuid,uuid,uuid)
  to service_role;

create or replace function public.phase17_execute_support_recovery(
  p_case_id uuid,
  p_action text,
  p_actor_user_id uuid,
  p_expected_updated_at timestamptz,
  p_target_membership_id uuid default null,
  p_replacement_membership_id uuid default null,
  p_assignment_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
begin
  if p_case_id is null then
    raise exception using errcode='23514',message='SUPPORT_RECOVERY_CONTEXT_REQUIRED';
  end if;

  -- Namespaced outer lock prevents two Phase 17 recovery requests for the same
  -- case from entering the deeper canonical lock chain at the same time.
  -- Use a non-retryable application exception here: SQLSTATE 40001 is a
  -- serialization failure and may be retried by infrastructure, which defeats
  -- the fail-fast contract and can turn an immediate stale result into an
  -- upstream timeout.
  if not pg_try_advisory_xact_lock(
    hashtextextended('phase17-support-recovery:'||p_case_id::text,0)
  ) then
    raise exception using errcode='P0001',message='SUPPORT_CASE_STALE';
  end if;

  -- Defence in depth: if deeper canonical locks are already held by another
  -- transaction, fail in well under the upstream request timeout and map that
  -- contention to the same optimistic-concurrency contract.
  perform set_config('lock_timeout','750ms',true);

  begin
    return public.phase17_execute_support_recovery_impl(
      p_case_id,
      p_action,
      p_actor_user_id,
      p_expected_updated_at,
      p_target_membership_id,
      p_replacement_membership_id,
      p_assignment_id
    );
  exception
    when lock_not_available or deadlock_detected or serialization_failure then
      raise exception using errcode='P0001',message='SUPPORT_CASE_STALE';
  end;
end;
$$;

revoke all on function public.phase17_execute_support_recovery(uuid,text,uuid,timestamptz,uuid,uuid,uuid)
  from public,anon,authenticated;
grant execute on function public.phase17_execute_support_recovery(uuid,text,uuid,timestamptz,uuid,uuid,uuid)
  to service_role;

comment on function public.phase17_execute_support_recovery(uuid,text,uuid,timestamptz,uuid,uuid,uuid) is
  'Fail-fast Phase 17 recovery boundary. Serializes same-case recovery before Phase 10/16 lock chains and normalizes retryable database contention to non-retryable SUPPORT_CASE_STALE.';

comment on function public.phase17_execute_support_recovery_impl(uuid,text,uuid,timestamptz,uuid,uuid,uuid) is
  'Internal Phase 17 transactional coordinator. Invoke through phase17_execute_support_recovery so same-case contention fails fast.';
