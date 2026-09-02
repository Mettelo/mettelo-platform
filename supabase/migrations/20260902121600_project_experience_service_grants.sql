-- Project Experience V2 — explicit service-role privileges for the canonical builder.
--
-- The Project Architect API uses the server-only service client. Service role
-- bypasses RLS but still needs PostgreSQL table privileges. Grant only the
-- canonical entities that the existing create/governance workflow reads/writes.

grant select,insert,update,delete on public.project_problem_briefs to service_role;
grant select,insert,update,delete on public.project_data_sources to service_role;
grant select,insert,update,delete on public.project_deliverables to service_role;
grant select,insert,update,delete on public.project_success_criteria to service_role;
grant select,insert,update,delete on public.project_capabilities to service_role;
grant select,insert,update,delete on public.project_milestones to service_role;
grant select,insert,update,delete on public.project_data_source_governance_reviews to service_role;
grant select,insert,update,delete on public.project_resource_providers to service_role;

grant select on public.capabilities to service_role;
grant select on public.project_experience_readiness to service_role;
