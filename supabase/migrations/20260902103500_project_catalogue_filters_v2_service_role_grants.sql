-- Project Catalogue Filters V2 Phase 1 — explicit hosted/service-role grants for objects
-- introduced after the repository's CI compatibility grant snapshot.
-- RLS remains authoritative for anon/authenticated users; service_role is reserved for
-- trusted server/admin/E2E paths and must still have PostgreSQL object privileges.

grant select, insert, update, delete on table public.project_role_families to service_role;
grant select, insert, update, delete on table public.capability_aliases to service_role;
grant select on table public.project_catalogue_readiness to service_role;
