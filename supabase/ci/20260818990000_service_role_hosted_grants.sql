-- CI compatibility layer for hosted service-role grants that are not fully represented
-- in the canonical migration history. This runs only in the disposable local E2E stack.
-- It does not broaden anon/authenticated access; RLS and canonical grants remain authoritative.

grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;
