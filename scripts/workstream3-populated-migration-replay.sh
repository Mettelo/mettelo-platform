#!/usr/bin/env bash
set -euo pipefail

: "${E2E_SUPABASE_DB_URL:?E2E_SUPABASE_DB_URL is required}"

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
recovery="$repo_root/supabase/migrations/20260913140000_workstream3_interest_admission_recovery.sql"
role_recovery="$repo_root/supabase/migrations/20260913140500_workstream3_submit_interest_role_recovery.sql"
release_project='00000000-0000-4000-8000-00000000e2e1'

for migration in "$recovery" "$role_recovery"; do
  if [[ ! -f "$migration" ]]; then
    echo "Missing Workstream 3 migration: $migration" >&2
    exit 1
  fi
done

sql_scalar() {
  psql "$E2E_SUPABASE_DB_URL" -X -v ON_ERROR_STOP=1 -Atqc "$1"
}

projects_before="$(sql_scalar 'select count(*) from public.projects')"
applications_before="$(sql_scalar 'select count(*) from public.project_applications')"
members_before="$(sql_scalar 'select count(*) from public.project_members')"
release_before="$(sql_scalar "select count(*) from public.projects where id = '$release_project'::uuid")"

if (( projects_before < 1 )); then
  echo 'Populated replay requires existing project data before the Workstream 3 migrations are replayed.' >&2
  exit 1
fi
if [[ "$release_before" != '1' ]]; then
  echo 'Expected deterministic release project fixture before migration replay.' >&2
  exit 1
fi

echo "Replaying Workstream 3 migrations over populated database: projects=$projects_before applications=$applications_before members=$members_before"
psql "$E2E_SUPABASE_DB_URL" -X -v ON_ERROR_STOP=1 -f "$recovery" >/tmp/workstream3-replay-recovery.log
psql "$E2E_SUPABASE_DB_URL" -X -v ON_ERROR_STOP=1 -f "$role_recovery" >/tmp/workstream3-replay-role-recovery.log

projects_after="$(sql_scalar 'select count(*) from public.projects')"
applications_after="$(sql_scalar 'select count(*) from public.project_applications')"
members_after="$(sql_scalar 'select count(*) from public.project_members')"
release_after="$(sql_scalar "select count(*) from public.projects where id = '$release_project'::uuid")"

[[ "$projects_after" == "$projects_before" ]] || { echo "Project count changed during replay: $projects_before -> $projects_after" >&2; exit 1; }
[[ "$applications_after" == "$applications_before" ]] || { echo "Application count changed during replay: $applications_before -> $applications_after" >&2; exit 1; }
[[ "$members_after" == "$members_before" ]] || { echo "Membership count changed during replay: $members_before -> $members_after" >&2; exit 1; }
[[ "$release_after" == '1' ]] || { echo 'Release project fixture was not preserved by migration replay.' >&2; exit 1; }

trigger_count="$(sql_scalar "select count(*) from pg_trigger where tgname = 'project_interest_resolve_admission_after_insert' and not tgisinternal")"
[[ "$trigger_count" == '1' ]] || { echo 'Canonical project-interest admission trigger is missing after replay.' >&2; exit 1; }

submit_rpc_count="$(sql_scalar "select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='submit_project_interest'")"
[[ "$submit_rpc_count" -ge 1 ]] || { echo 'submit_project_interest is missing after replay.' >&2; exit 1; }

resolver_count="$(sql_scalar "select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='resolve_submitted_project_interest_admission'")"
[[ "$resolver_count" -ge 1 ]] || { echo 'Canonical interest admission resolver is missing after replay.' >&2; exit 1; }

invalid_auto_delay="$(sql_scalar "select count(*) from public.projects where lower(coalesce(admission_mode,''))='auto' and auto_start_delay_minutes is distinct from 360")"
[[ "$invalid_auto_delay" == '0' ]] || { echo 'AUTO projects with a non-six-hour admission delay remain after replay.' >&2; exit 1; }

echo 'Workstream 3 populated migration replay passed.'
