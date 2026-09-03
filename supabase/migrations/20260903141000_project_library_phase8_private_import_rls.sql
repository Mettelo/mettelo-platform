-- Phase 8 defence-in-depth for the Project Library private import schema.
-- The schema is already inaccessible to browser roles through schema/table grants.
-- RLS adds a second deny-by-default boundary for the two retained import tables.

alter table if exists private_import.project_identity_baseline enable row level security;
alter table if exists private_import.project_library_stage enable row level security;

revoke all on schema private_import from public, anon, authenticated;
revoke all on all tables in schema private_import from public, anon, authenticated;
revoke all on all sequences in schema private_import from public, anon, authenticated;
revoke all on all functions in schema private_import from public, anon, authenticated;

-- No browser-facing policies are intentionally created. postgres/service_role retain
-- their existing privileged maintenance path while anon/authenticated remain denied.
