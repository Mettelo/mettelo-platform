-- Phase 5 execution hardening and cleanup.
-- CI-safe: production-only private_import objects may not exist in isolated databases.

-- Retire temporary Phase 5 transport helpers if they exist.
drop function if exists public.project_library_phase5_finish_v1(text,text);
drop function if exists public.project_library_stage_batch_v2(text,text,jsonb);
drop function if exists public.project_library_stage_rows_v2(text,jsonb);

do $$
begin
  if to_regnamespace('private_import') is not null then
    execute 'revoke all on schema private_import from anon, authenticated';
    execute 'revoke all on all tables in schema private_import from anon, authenticated';

    if to_regclass('private_import.project_library_stage_transport_token') is not null then
      execute 'drop table private_import.project_library_stage_transport_token';
    end if;
  end if;

  if to_regprocedure('public.project_library_stage_payload(jsonb)') is not null then
    execute 'alter function public.project_library_stage_payload(jsonb) set statement_timeout = ''120s''';
    execute 'revoke all on function public.project_library_stage_payload(jsonb) from public, anon, authenticated';
    execute 'grant execute on function public.project_library_stage_payload(jsonb) to service_role';
  end if;

  if to_regprocedure('public.project_library_reconcile_stage()') is not null then
    execute 'alter function public.project_library_reconcile_stage() set statement_timeout = ''120s''';
    execute 'revoke all on function public.project_library_reconcile_stage() from public, anon, authenticated';
    execute 'grant execute on function public.project_library_reconcile_stage() to service_role';
  end if;

  if to_regprocedure('public.project_library_apply_stage_v2(text)') is not null then
    execute 'alter function public.project_library_apply_stage_v2(text) set statement_timeout = ''120s''';
    execute 'revoke all on function public.project_library_apply_stage_v2(text) from public, anon, authenticated';
    execute 'grant execute on function public.project_library_apply_stage_v2(text) to service_role';
  end if;
end
$$;
