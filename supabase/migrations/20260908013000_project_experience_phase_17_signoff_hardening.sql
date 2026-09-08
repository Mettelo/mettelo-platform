-- Phase 17 Director sign-off hardening.
-- Keep the database contract aligned with the implemented product and ensure
-- privileged server writes cannot bypass canonical project/run/membership context.

alter table public.project_support_case_updates
  drop constraint if exists project_support_case_updates_action_check;

alter table public.project_support_case_updates
  add constraint project_support_case_updates_action_check check (action in (
    'created','reviewed','assigned','information_requested','member_update','recovery_plan_recorded',
    'responsibility_reassigned','lead_changed','replacement_approved','member_removed',
    'safeguarding_escalated','resolved','closed','reopened'
  ));

create or replace function public.phase17_validate_support_case_context()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  if not exists (
    select 1
    from public.project_runs pr
    where pr.id=new.project_run_id
      and pr.project_id=new.project_id
  ) then
    raise exception using errcode='23514',message='SUPPORT_CASE_PROJECT_RUN_MISMATCH';
  end if;

  if not exists (
    select 1
    from public.project_members pm
    where pm.project_id=new.project_id
      and pm.project_run_id=new.project_run_id
      and pm.user_id=new.reporter_user_id
      and pm.membership_status='active'
  ) then
    raise exception using errcode='23514',message='SUPPORT_CASE_ACTIVE_REPORTER_MEMBERSHIP_REQUIRED';
  end if;

  return new;
end;
$$;

drop trigger if exists project_support_cases_validate_context on public.project_support_cases;
create trigger project_support_cases_validate_context
before insert or update of project_id,project_run_id,reporter_user_id
on public.project_support_cases
for each row execute function public.phase17_validate_support_case_context();

comment on function public.phase17_validate_support_case_context() is
  'Phase 17 database invariant: support case project/run must match and reporter must hold active membership when case context is created or changed, including service-role writes.';
