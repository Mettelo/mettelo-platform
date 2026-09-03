-- Phase 5 hardening: keep apply_v2 audit runs compatible with the import-run ledger
-- and retire the temporary row-transport objects if they exist.

alter table private_import.project_library_import_runs
  drop constraint if exists project_library_import_runs_mode_check;

alter table private_import.project_library_import_runs
  add constraint project_library_import_runs_mode_check
  check (mode = any (array['dry_run'::text, 'apply'::text, 'apply_v2'::text]));

drop function if exists public.project_library_stage_row_v1(text,text,jsonb);
drop table if exists private_import.project_library_stage_transport_token;
