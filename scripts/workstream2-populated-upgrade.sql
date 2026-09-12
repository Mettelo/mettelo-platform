\set ON_ERROR_STOP on
begin;

create temporary table ws2_projects_before as select id,slug,title,summary from public.projects;
create temporary table ws2_apps_before as select id,project_id,user_id,status,application_kind,project_run_id from public.project_applications;
create temporary table ws2_runs_before as select id,project_id,run_number,status from public.project_runs;
create temporary table ws2_members_before as select id,project_id,project_run_id,user_id,membership_status from public.project_members;
create temporary table ws2_contrib_before as select id,project_id,project_run_id,user_id,verification_status from public.contributions;

\i supabase/migrations/20260912170500_workstream2_canonical_project_contract.sql
\i supabase/migrations/20260912171500_workstream2_interest_eligibility_hardening.sql

do $$
begin
  if exists((select * from ws2_projects_before except select id,slug,title,summary from public.projects) union all (select id,slug,title,summary from public.projects except select * from ws2_projects_before)) then raise exception 'WS2_PROJECT_IDENTITY_CHANGED'; end if;
  if exists((select * from ws2_apps_before except select id,project_id,user_id,status,application_kind,project_run_id from public.project_applications) union all (select id,project_id,user_id,status,application_kind,project_run_id from public.project_applications except select * from ws2_apps_before)) then raise exception 'WS2_APPLICATION_HISTORY_CHANGED'; end if;
  if exists((select * from ws2_runs_before except select id,project_id,run_number,status from public.project_runs) union all (select id,project_id,run_number,status from public.project_runs except select * from ws2_runs_before)) then raise exception 'WS2_RUN_HISTORY_CHANGED'; end if;
  if exists((select * from ws2_members_before except select id,project_id,project_run_id,user_id,membership_status from public.project_members) union all (select id,project_id,project_run_id,user_id,membership_status from public.project_members except select * from ws2_members_before)) then raise exception 'WS2_MEMBERSHIP_HISTORY_CHANGED'; end if;
  if exists((select * from ws2_contrib_before except select id,project_id,project_run_id,user_id,verification_status from public.contributions) union all (select id,project_id,project_run_id,user_id,verification_status from public.contributions except select * from ws2_contrib_before)) then raise exception 'WS2_PROOF_HISTORY_CHANGED'; end if;
end;
$$;

rollback;
\echo 'Workstream 2 populated migration replay preserved project identity, applications, runs, memberships and Proof history.'
