begin;

-- Keep RLS predicate helpers available only to signed-in clients and service code.
revoke execute on function public.mettelo_is_run_member(uuid) from public, anon;
revoke execute on function public.mettelo_is_run_lead(uuid) from public, anon;
revoke execute on function public.mettelo_is_project_architect(uuid) from public, anon;
revoke execute on function public.mettelo_is_assigned_architect(uuid,text[]) from public, anon;
revoke execute on function public.mettelo_can_access_project_event(uuid) from public, anon;

grant execute on function public.mettelo_is_run_member(uuid) to authenticated, service_role;
grant execute on function public.mettelo_is_run_lead(uuid) to authenticated, service_role;
grant execute on function public.mettelo_is_project_architect(uuid) to authenticated, service_role;
grant execute on function public.mettelo_is_assigned_architect(uuid,text[]) to authenticated, service_role;
grant execute on function public.mettelo_can_access_project_event(uuid) to authenticated, service_role;

-- Trigger and maintenance helpers must never be exposed as client RPCs.
revoke execute on function public.seed_project_workstreams(uuid) from public, anon, authenticated;
revoke execute on function public.seed_workstreams_when_run_activates() from public, anon, authenticated;
revoke execute on function public.guard_required_deliverables_before_completion() from public, anon, authenticated;
revoke execute on function public.guard_architect_assignment() from public, anon, authenticated;
revoke execute on function public.guard_project_governance_transition() from public, anon, authenticated;
revoke execute on function public.prevent_governance_event_mutation() from public, anon, authenticated;
revoke execute on function public.guard_project_event_review_independence() from public, anon, authenticated;
revoke execute on function public.guard_required_event_review_before_completion() from public, anon, authenticated;

grant execute on function public.seed_project_workstreams(uuid) to service_role;
grant execute on function public.seed_workstreams_when_run_activates() to service_role;
grant execute on function public.guard_required_deliverables_before_completion() to service_role;
grant execute on function public.guard_architect_assignment() to service_role;
grant execute on function public.guard_project_governance_transition() to service_role;
grant execute on function public.prevent_governance_event_mutation() to service_role;
grant execute on function public.guard_project_event_review_independence() to service_role;
grant execute on function public.guard_required_event_review_before_completion() to service_role;

alter function public.prevent_governance_event_mutation() set search_path = public;

commit;
