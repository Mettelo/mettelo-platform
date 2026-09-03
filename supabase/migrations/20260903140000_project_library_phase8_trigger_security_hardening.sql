-- Phase 8 security hardening for the Project Library idempotency guard.
-- The trigger is database-internal: browser roles never need direct EXECUTE.

alter function public.project_problem_brief_skip_noop_update()
  set search_path = '';

revoke all on function public.project_problem_brief_skip_noop_update()
  from public, anon, authenticated;

grant execute on function public.project_problem_brief_skip_noop_update()
  to postgres, service_role;
