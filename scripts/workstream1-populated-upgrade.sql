\set ON_ERROR_STOP on
begin;

-- This runs only against the disposable local CI database. The fixture is
-- intentionally populated before the recovery migration is replayed so that
-- the migration must prove it preserves existing member and project history.
create temporary table w1_profiles_before as
  select id,member_id,username,full_name from public.profiles;
create temporary table w1_memberships_before as
  select id,user_id,project_id,project_run_id,membership_status from public.project_members;
create temporary table w1_contributions_before as
  select id,user_id,project_id,project_run_id,verification_status from public.contributions;
create temporary table w1_applications_before as
  select id,user_id,project_id,status from public.project_applications;

\i supabase/migrations/20260911084500_production_schema_account_project_recovery.sql

do $$
begin
  if exists(
    (select * from w1_profiles_before except select id,member_id,username,full_name from public.profiles)
    union all
    (select id,member_id,username,full_name from public.profiles except select * from w1_profiles_before)
  ) then raise exception 'WORKSTREAM1_POPULATED_UPGRADE_PROFILE_HISTORY_CHANGED'; end if;

  if exists(
    (select * from w1_memberships_before except select id,user_id,project_id,project_run_id,membership_status from public.project_members)
    union all
    (select id,user_id,project_id,project_run_id,membership_status from public.project_members except select * from w1_memberships_before)
  ) then raise exception 'WORKSTREAM1_POPULATED_UPGRADE_MEMBERSHIP_HISTORY_CHANGED'; end if;

  if exists(
    (select * from w1_contributions_before except select id,user_id,project_id,project_run_id,verification_status from public.contributions)
    union all
    (select id,user_id,project_id,project_run_id,verification_status from public.contributions except select * from w1_contributions_before)
  ) then raise exception 'WORKSTREAM1_POPULATED_UPGRADE_PROOF_HISTORY_CHANGED'; end if;

  if exists(
    (select * from w1_applications_before except select id,user_id,project_id,status from public.project_applications)
    union all
    (select id,user_id,project_id,status from public.project_applications except select * from w1_applications_before)
  ) then raise exception 'WORKSTREAM1_POPULATED_UPGRADE_APPLICATION_HISTORY_CHANGED'; end if;
end;
$$;

rollback;
\echo 'Workstream 1 populated migration replay preserved profiles, applications, memberships and Proof history.'
