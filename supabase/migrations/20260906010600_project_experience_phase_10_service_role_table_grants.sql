-- Project Experience Phase 10: service-role privileges for canonical responsibility assignments.
--
-- The table is intentionally not writable by anon/authenticated users. Phase 10
-- mutations remain exposed only through service-only RPCs, but PostgreSQL still
-- requires the executing service_role to hold table privileges used by those
-- functions and by trusted server-side maintenance/validation paths.

grant select, insert, update, delete
on table public.project_member_responsibilities
to service_role;

revoke insert, update, delete
on table public.project_member_responsibilities
from anon, authenticated;
