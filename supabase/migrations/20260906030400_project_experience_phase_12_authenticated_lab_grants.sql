-- Project Experience Phase 12: authenticated table privileges for canonical Lab RLS.
--
-- Phase 12 restrictive policies are the authorization boundary, but PostgreSQL table
-- privileges must allow authenticated requests to reach RLS. Keep anonymous access
-- ungranted: private Lab tables remain undiscoverable to anon at the privilege layer.

grant usage on schema public to authenticated;

-- Live collaboration tables are read/written by authenticated project members and
-- remain constrained by the existing permissive ownership policies plus Phase 12
-- restrictive exact-run/live-membership policies.
grant select, insert, update, delete on table public.project_discussions to authenticated;
grant select, insert, update, delete on table public.project_resources to authenticated;
grant select, insert, update, delete on table public.project_meetings to authenticated;
grant select, insert, update, delete on table public.project_tasks to authenticated;

-- Canonical delivery surfaces retain their existing table-specific RLS policies;
-- Phase 12 adds the active/completed exact-run restriction where applicable.
grant select, insert, update, delete on table public.project_milestones to authenticated;
grant select on table public.project_member_responsibilities to authenticated;
grant select, insert, update, delete on table public.project_data_sources to authenticated;
grant select, insert, update, delete on table public.project_data_source_versions to authenticated;
grant select, insert, update, delete on table public.project_deliverables to authenticated;

-- Do not open private Lab tables to anonymous callers. A 42501 is an acceptable and
-- stronger denial than an empty RLS result for anon access.
revoke all on table public.project_discussions from anon;
revoke all on table public.project_resources from anon;
revoke all on table public.project_meetings from anon;
revoke all on table public.project_tasks from anon;
revoke all on table public.project_milestones from anon;
revoke all on table public.project_member_responsibilities from anon;
revoke all on table public.project_data_sources from anon;
revoke all on table public.project_data_source_versions from anon;
revoke all on table public.project_deliverables from anon;
