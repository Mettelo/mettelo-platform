-- CI compatibility layer for hosted grants that are not fully represented
-- in the canonical migration history. This runs only in the disposable local E2E stack.
-- RLS remains authoritative; these grants only allow the same table operations that
-- the application needs to exercise through anon/authenticated roles in local CI.

grant usage on schema public to anon, authenticated, service_role;

grant select on table public.projects to anon, authenticated;
grant select, insert, update on table public.project_applications to authenticated;

grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;
