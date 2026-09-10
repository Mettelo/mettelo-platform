-- Project Experience Phase 17: restore server-only privileges after the support tables exist.
--
-- The earlier platform-wide service-role grant migration predates these Phase 17 tables.
-- RLS bypass alone is not a table privilege: PostgREST/serviceDb still needs explicit
-- relation privileges for the server-mediated support workflows and cleanup paths.

revoke all on public.project_support_cases from service_role;
revoke all on public.project_support_case_updates from service_role;

grant select, insert, update, delete on public.project_support_cases to service_role;
grant select, insert, update, delete on public.project_support_case_updates to service_role;
