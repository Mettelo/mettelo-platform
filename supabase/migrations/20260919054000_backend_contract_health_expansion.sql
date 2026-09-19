-- Expand production backend contract health across high-risk user journeys.

create or replace function public.admin_backend_contract_health()
returns jsonb
language sql
security definer
set search_path=public,pg_catalog
as $$
  with checks(name,ok) as (
    values
      ('table.form_submissions',to_regclass('public.form_submissions') is not null),
      ('table.form_submission_history',to_regclass('public.form_submission_history') is not null),
      ('table.form_submission_notes',to_regclass('public.form_submission_notes') is not null),
      ('table.newsletter_subscribers',to_regclass('public.newsletter_subscribers') is not null),
      ('table.notifications',to_regclass('public.notifications') is not null),
      ('table.notification_event_catalogue',to_regclass('public.notification_event_catalogue') is not null),
      ('table.notification_preferences',to_regclass('public.notification_preferences') is not null),
      ('table.saved_projects',to_regclass('public.saved_projects') is not null),
      ('table.saved_opportunities',to_regclass('public.saved_opportunities') is not null),
      ('table.project_applications',to_regclass('public.project_applications') is not null),
      ('table.project_application_events',to_regclass('public.project_application_events') is not null),
      ('table.project_offers',to_regclass('public.project_offers') is not null),
      ('table.project_support_cases',to_regclass('public.project_support_cases') is not null),
      ('table.project_support_case_updates',to_regclass('public.project_support_case_updates') is not null),
      ('table.project_member_collaboration_invitations',to_regclass('public.project_member_collaboration_invitations') is not null),
      ('table.project_collaboration_needs',to_regclass('public.project_collaboration_needs') is not null),
      ('table.project_weekly_pulses',to_regclass('public.project_weekly_pulses') is not null),
      ('table.project_workstreams',to_regclass('public.project_workstreams') is not null),
      ('table.project_milestones',to_regclass('public.project_milestones') is not null),
      ('table.project_tasks',to_regclass('public.project_tasks') is not null),
      ('table.project_data_sources',to_regclass('public.project_data_sources') is not null),
      ('table.project_data_source_versions',to_regclass('public.project_data_source_versions') is not null),
      ('table.project_event_registrations',to_regclass('public.project_event_registrations') is not null),
      ('table.project_event_reviews',to_regclass('public.project_event_reviews') is not null),
      ('table.project_submission_permissions',to_regclass('public.project_submission_permissions') is not null),
      ('table.career_roles',to_regclass('public.career_roles') is not null),
      ('table.career_applications',to_regclass('public.career_applications') is not null),
      ('table.career_application_events',to_regclass('public.career_application_events') is not null),
      ('table.communication_records',to_regclass('public.communication_records') is not null),
      ('table.communication_audit_log',to_regclass('public.communication_audit_log') is not null),
      ('table.project_architect_applications',to_regclass('public.project_architect_applications') is not null),
      ('table.project_architect_application_evidence',to_regclass('public.project_architect_application_evidence') is not null),
      ('table.project_architect_application_history',to_regclass('public.project_architect_application_history') is not null),
      ('table.project_architect_credentials',to_regclass('public.project_architect_credentials') is not null),
      ('storage.career-cvs',exists(select 1 from storage.buckets b where b.id='career-cvs')),
      ('rpc.submit_project_interest',exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='submit_project_interest')),
      ('rpc.phase7_transition_review_request_server',exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='phase7_transition_review_request_server')),
      ('rpc.phase7_convert_open_auto_to_review_required',exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='phase7_convert_open_auto_to_review_required')),
      ('rpc.phase8_respond_to_project_offer',exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='phase8_respond_to_project_offer')),
      ('rpc.phase9_project_run_capacity',exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='phase9_project_run_capacity')),
      ('rpc.phase11_project_start_readiness',exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='phase11_project_start_readiness')),
      ('rpc.phase16_transition_member_departure',exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='phase16_transition_member_departure')),
      ('rpc.phase18_save_member_privacy_preferences',exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='phase18_save_member_privacy_preferences')),
      ('rpc.phase18_consume_member_invite_rate_limit',exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='phase18_consume_member_invite_rate_limit')),
      ('rpc.phase19_assess_success_criterion',exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='phase19_assess_success_criterion')),
      ('rpc.phase19_submit_final_proof',exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='phase19_submit_final_proof')),
      ('rpc.phase19_review_partner_completion',exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='phase19_review_partner_completion')),
      ('rpc.project_pulse_team_applicable',exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='project_pulse_team_applicable')),
      ('rpc.project_weekly_pulse_health',exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='project_weekly_pulse_health')),
      ('rpc.save_member_profile',exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='save_member_profile'))
  ),
  missing as (
    select coalesce(jsonb_agg(name order by name),'[]'::jsonb) as items
    from checks where not ok
  )
  select jsonb_build_object(
    'state',case when jsonb_array_length(missing.items)=0 then 'available' else 'degraded' end,
    'checked',(select count(*) from checks),
    'missing',missing.items
  )
  from missing;
$$;

revoke all on function public.admin_backend_contract_health() from public,anon,authenticated;
grant execute on function public.admin_backend_contract_health() to service_role;
