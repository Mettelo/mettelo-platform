-- Phase 5 hardening: keep apply_v2 audit runs compatible with the import-run ledger
-- and retire temporary row-transport objects when the protected import schema exists.
-- The private_import schema is production-only import infrastructure and is not
-- part of the disposable local Supabase fixture, so this migration must be safe
-- when that schema is absent in isolated CI.

do $$
begin
  if to_regclass('private_import.project_library_import_runs') is not null then
    alter table private_import.project_library_import_runs
      drop constraint if exists project_library_import_runs_mode_check;

    alter table private_import.project_library_import_runs
      add constraint project_library_import_runs_mode_check
      check (mode = any (array['dry_run'::text, 'apply'::text, 'apply_v2'::text]));
  end if;
end
$$;

drop function if exists public.project_library_stage_row_v1(text,text,jsonb);

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'private_import') then
    execute 'drop table if exists private_import.project_library_stage_transport_token';
  end if;
end
$$;
