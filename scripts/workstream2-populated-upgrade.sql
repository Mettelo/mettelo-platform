\set ON_ERROR_STOP on
begin;

-- Identity/account state expected to survive the project-model upgrade.
create temporary table ws2_profiles_before as select id,username from public.profiles;
create temporary table ws2_identities_before as select user_id,account_type from public.account_identities;

-- Canonical project identity and historical participation/runtime state.
create temporary table ws2_projects_before as select id,slug,title,summary,participation_mode,min_team_size,target_team_size,max_team_size from public.projects;
create temporary table ws2_apps_before as select id,project_id,user_id,status,application_kind,project_run_id from public.project_applications;
create temporary table ws2_runs_before as select id,project_id,run_number,status,required_team_size,team_size_threshold,has_started from public.project_runs;
create temporary table ws2_members_before as select id,project_id,project_run_id,user_id,membership_status from public.project_members;
create temporary table ws2_contrib_before as select id,project_id,project_run_id,user_id,verification_status from public.contributions;

-- Existing canonical definition children must not be duplicated or rewritten.
create temporary table ws2_briefs_before as select project_id from public.project_problem_briefs;
create temporary table ws2_roles_before as select id,project_id from public.project_roles;
create temporary table ws2_deliverables_before as select id,project_id,project_run_id from public.project_deliverables;
create temporary table ws2_success_before as select id,project_id from public.project_success_criteria;
create temporary table ws2_milestones_before as select id,project_id,project_run_id from public.project_milestones;
create temporary table ws2_capabilities_before as select project_id,capability_id from public.project_capabilities;

\i supabase/migrations/20260912170500_workstream2_canonical_project_contract.sql
\i supabase/migrations/20260912171500_workstream2_interest_eligibility_hardening.sql
\i supabase/migrations/20260912172500_workstream2_public_capacity_publication_hardening.sql

do $$
begin
  if exists((select * from ws2_profiles_before except select id,username from public.profiles) union all (select id,username from public.profiles except select * from ws2_profiles_before)) then raise exception 'WS2_PROFILE_IDENTITY_CHANGED'; end if;
  if exists((select * from ws2_identities_before except select user_id,account_type from public.account_identities) union all (select user_id,account_type from public.account_identities except select * from ws2_identities_before)) then raise exception 'WS2_ACCOUNT_IDENTITY_CHANGED'; end if;
  if exists((select * from ws2_projects_before except select id,slug,title,summary,participation_mode,min_team_size,target_team_size,max_team_size from public.projects) union all (select id,slug,title,summary,participation_mode,min_team_size,target_team_size,max_team_size from public.projects except select * from ws2_projects_before)) then raise exception 'WS2_PROJECT_IDENTITY_OR_GEOMETRY_CHANGED'; end if;
  if exists((select * from ws2_apps_before except select id,project_id,user_id,status,application_kind,project_run_id from public.project_applications) union all (select id,project_id,user_id,status,application_kind,project_run_id from public.project_applications except select * from ws2_apps_before)) then raise exception 'WS2_APPLICATION_HISTORY_CHANGED'; end if;
  if exists((select * from ws2_runs_before except select id,project_id,run_number,status,required_team_size,team_size_threshold,has_started from public.project_runs) union all (select id,project_id,run_number,status,required_team_size,team_size_threshold,has_started from public.project_runs except select * from ws2_runs_before)) then raise exception 'WS2_RUN_HISTORY_OR_GEOMETRY_CHANGED'; end if;
  if exists((select * from ws2_members_before except select id,project_id,project_run_id,user_id,membership_status from public.project_members) union all (select id,project_id,project_run_id,user_id,membership_status from public.project_members except select * from ws2_members_before)) then raise exception 'WS2_MEMBERSHIP_HISTORY_CHANGED'; end if;
  if exists((select * from ws2_contrib_before except select id,project_id,project_run_id,user_id,verification_status from public.contributions) union all (select id,project_id,project_run_id,user_id,verification_status from public.contributions except select * from ws2_contrib_before)) then raise exception 'WS2_PROOF_HISTORY_CHANGED'; end if;
  if exists((select * from ws2_briefs_before except select project_id from public.project_problem_briefs) union all (select project_id from public.project_problem_briefs except select * from ws2_briefs_before)) then raise exception 'WS2_PROJECT_BRIEF_RELATION_CHANGED'; end if;
  if exists((select * from ws2_roles_before except select id,project_id from public.project_roles) union all (select id,project_id from public.project_roles except select * from ws2_roles_before)) then raise exception 'WS2_PROJECT_ROLE_RELATION_CHANGED'; end if;
  if exists((select * from ws2_deliverables_before except select id,project_id,project_run_id from public.project_deliverables) union all (select id,project_id,project_run_id from public.project_deliverables except select * from ws2_deliverables_before)) then raise exception 'WS2_DELIVERABLE_RELATION_CHANGED'; end if;
  if exists((select * from ws2_success_before except select id,project_id from public.project_success_criteria) union all (select id,project_id from public.project_success_criteria except select * from ws2_success_before)) then raise exception 'WS2_SUCCESS_CRITERIA_RELATION_CHANGED'; end if;
  if exists((select * from ws2_milestones_before except select id,project_id,project_run_id from public.project_milestones) union all (select id,project_id,project_run_id from public.project_milestones except select * from ws2_milestones_before)) then raise exception 'WS2_MILESTONE_RELATION_CHANGED'; end if;
  if exists((select * from ws2_capabilities_before except select project_id,capability_id from public.project_capabilities) union all (select project_id,capability_id from public.project_capabilities except select * from ws2_capabilities_before)) then raise exception 'WS2_CAPABILITY_RELATION_CHANGED'; end if;
end;
$$;

rollback;
\echo 'Workstream 2 populated migration replay preserved member identity, project identity/geometry, canonical child relations, applications, runs, memberships and Proof history.'
