-- Phase 8 defence-in-depth for the Project Library private import schema.
-- The schema is already inaccessible to browser roles through schema/table grants.
-- RLS adds a second deny-by-default boundary for the two retained import tables.
-- Disposable/local CI databases intentionally do not recreate private_import; keep
-- this hardening migration safe in both environments without creating that schema.

do $$
begin
  if to_regnamespace('private_import') is null then
    raise notice 'private_import schema is absent; Phase 8 private-import hardening is not required in this database';
    return;
  end if;

  execute 'alter table if exists private_import.project_identity_baseline enable row level security';
  execute 'alter table if exists private_import.project_library_stage enable row level security';

  execute 'revoke all on schema private_import from public, anon, authenticated';
  execute 'revoke all on all tables in schema private_import from public, anon, authenticated';
  execute 'revoke all on all sequences in schema private_import from public, anon, authenticated';
  execute 'revoke all on all functions in schema private_import from public, anon, authenticated';
end
$$;

-- No browser-facing policies are intentionally created. postgres/service_role retain
-- their existing privileged maintenance path while anon/authenticated remain denied.
