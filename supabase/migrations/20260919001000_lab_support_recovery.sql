-- Lab Support recovery: bind cases to canonical active membership and add retry-safe submission keys.
alter table public.project_support_cases
  add column if not exists reporter_project_member_id uuid references public.project_members(id) on delete restrict,
  add column if not exists submission_key text;

alter table public.project_support_cases
  drop constraint if exists project_support_cases_submission_key_check;
alter table public.project_support_cases
  add constraint project_support_cases_submission_key_check
  check (submission_key is null or char_length(submission_key) between 8 and 100);

create unique index if not exists project_support_cases_submission_key_uidx
  on public.project_support_cases(reporter_user_id,project_run_id,submission_key)
  where submission_key is not null;

create or replace function public.phase17_validate_support_case_context()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  canonical_membership_id uuid;
begin
  if not exists (
    select 1
    from public.project_runs pr
    where pr.id=new.project_run_id
      and pr.project_id=new.project_id
      and pr.status='active'
  ) then
    raise exception using errcode='23514',message='SUPPORT_CASE_PROJECT_RUN_MISMATCH';
  end if;

  select pm.id into canonical_membership_id
  from public.project_members pm
  where pm.project_id=new.project_id
    and pm.project_run_id=new.project_run_id
    and pm.user_id=new.reporter_user_id
    and pm.membership_status='active'
  order by pm.joined_at desc
  limit 1;

  if canonical_membership_id is null then
    raise exception using errcode='23514',message='SUPPORT_CASE_ACTIVE_REPORTER_MEMBERSHIP_REQUIRED';
  end if;

  new.reporter_project_member_id=canonical_membership_id;
  return new;
end;
$$;

revoke all on function public.phase17_validate_support_case_context() from public,anon,authenticated;

comment on column public.project_support_cases.reporter_project_member_id is
  'Canonical active project_members row used to authorize this private support case.';
comment on column public.project_support_cases.submission_key is
  'Server-validated retry key preventing accidental duplicate case creation for one member/run submission.';

drop trigger if exists project_support_cases_validate_context on public.project_support_cases;
create trigger project_support_cases_validate_context
before insert or update of project_id,project_run_id,reporter_user_id,reporter_project_member_id
on public.project_support_cases
for each row execute function public.phase17_validate_support_case_context();


drop policy if exists project_support_cases_reporter_insert on public.project_support_cases;
create policy project_support_cases_reporter_insert
on public.project_support_cases for insert to authenticated
with check (
  reporter_user_id=auth.uid()
  and exists (
    select 1 from public.project_members pm
    where pm.project_id=project_support_cases.project_id
      and pm.project_run_id=project_support_cases.project_run_id
      and pm.user_id=auth.uid()
      and pm.membership_status='active'
  )
  and exists (
    select 1 from public.project_runs pr
    where pr.id=project_support_cases.project_run_id
      and pr.project_id=project_support_cases.project_id
      and pr.status='active'
  )
  and status='open'
  and assigned_admin_user_id is null
  and resolution is null
  and internal_notes is null
  and recovery_plan is null
  and resolved_at is null
  and closed_at is null
);
