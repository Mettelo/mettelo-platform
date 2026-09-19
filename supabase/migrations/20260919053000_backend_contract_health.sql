-- Production backend contract health.
-- Exposes a service-role-only health RPC so Admin can detect schema/RPC drift
-- before user-facing actions fail.

create or replace function public.admin_backend_contract_health()
returns jsonb
language sql
security definer
set search_path=public,pg_catalog
as $$
  with checks(name,ok) as (
    values
      ('table.form_submissions',to_regclass('public.form_submissions') is not null),
      ('table.newsletter_subscribers',to_regclass('public.newsletter_subscribers') is not null),
      ('table.project_applications',to_regclass('public.project_applications') is not null),
      ('table.project_application_events',to_regclass('public.project_application_events') is not null),
      ('table.project_offers',to_regclass('public.project_offers') is not null),
      ('table.project_support_cases',to_regclass('public.project_support_cases') is not null),
      ('table.project_support_case_updates',to_regclass('public.project_support_case_updates') is not null),
      ('table.project_member_collaboration_invitations',to_regclass('public.project_member_collaboration_invitations') is not null),
      ('table.career_applications',to_regclass('public.career_applications') is not null),
      ('table.project_architect_applications',to_regclass('public.project_architect_applications') is not null),
      ('table.project_weekly_pulses',to_regclass('public.project_weekly_pulses') is not null),
      ('table.project_submission_permissions',to_regclass('public.project_submission_permissions') is not null),
      ('rpc.submit_project_interest',exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='submit_project_interest')),
      ('rpc.phase7_transition_review_request_server',exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='phase7_transition_review_request_server')),
      ('rpc.phase8_respond_to_project_offer',exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='phase8_respond_to_project_offer')),
      ('rpc.phase9_project_run_capacity',exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='phase9_project_run_capacity')),
      ('rpc.phase11_project_start_readiness',exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='phase11_project_start_readiness')),
      ('rpc.phase16_transition_member_departure',exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='phase16_transition_member_departure')),
      ('rpc.phase18_save_member_privacy_preferences',exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='phase18_save_member_privacy_preferences')),
      ('rpc.phase18_consume_member_invite_rate_limit',exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='phase18_consume_member_invite_rate_limit')),
      ('rpc.phase19_submit_final_proof',exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='phase19_submit_final_proof')),
      ('rpc.project_weekly_pulse_health',exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='project_weekly_pulse_health')),
      ('rpc.save_member_profile',exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='save_member_profile'))
  ),
  missing as (
    select coalesce(jsonb_agg(name order by name),'[]'::jsonb) as items
    from checks where not ok
  )
  select jsonb_build_object(
    'state',case when jsonb_array_length(missing.items)=0 then 'available' else 'degraded' end,
    'checked', (select count(*) from checks),
    'missing', missing.items
  )
  from missing;
$$;

revoke all on function public.admin_backend_contract_health() from public,anon,authenticated;
grant execute on function public.admin_backend_contract_health() to service_role;
