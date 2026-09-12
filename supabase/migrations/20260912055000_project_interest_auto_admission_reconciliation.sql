-- Reconcile the redesigned Submit Interest journey with the established Phase 6/9
-- admission runtime without rewriting already-applied migration history.
--
-- Canonical applicant-facing persistence is solo/team/flexible. `either` remains
-- temporarily accepted only so the legacy Phase 6 service function can execute
-- inside the same transaction; the trigger below immediately restores canonical
-- `flexible` on the persisted application before commit.

alter table public.project_applications
  drop constraint if exists project_applications_participation_preference_check;

update public.project_applications
set participation_preference='flexible',
    updated_at=now()
where participation_preference='either';

alter table public.project_applications
  add constraint project_applications_participation_preference_check
  check (participation_preference is null or participation_preference in ('solo','team','flexible','either'));

comment on column public.project_applications.participation_preference is
  'Canonical applicant preference is solo/team/flexible. Legacy either is accepted only as a transactional compatibility value and is never emitted by the Submit Interest journey.';

create or replace function public.phase9_effective_participation_threshold(
  p_mode text,
  p_preference text,
  p_minimum integer
)
returns integer
language sql
immutable
as $$
  select case
    when p_mode='solo' then 1
    when p_mode='flexible' and p_preference in ('solo','flexible','either') then 1
    else greatest(coalesce(p_minimum,1),1)
  end
$$;
revoke all on function public.phase9_effective_participation_threshold(text,text,integer) from public,anon,authenticated;
grant execute on function public.phase9_effective_participation_threshold(text,text,integer) to service_role;

create or replace function public.resolve_submitted_project_interest_admission()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  project_row public.projects%rowtype;
  legacy_preference text;
  admission_result jsonb;
begin
  if new.application_kind<>'interest' then return new; end if;

  select * into project_row
  from public.projects
  where id=new.project_id;
  if project_row.id is null then
    raise exception using errcode='P0002',message='PROJECT_NOT_FOUND';
  end if;

  if project_row.project_type='partner' or coalesce(project_row.admission_mode,'review_required')<>'auto' then
    update public.project_applications
    set admission_mode_snapshot='review_required',
        admission_decision='review_required',
        admission_decided_at=coalesce(admission_decided_at,now()),
        updated_at=now()
    where id=new.id;
    return new;
  end if;

  legacy_preference:=case
    when project_row.participation_mode='solo' then 'solo'
    when project_row.participation_mode='team' then 'team'
    when new.participation_preference='solo' then 'solo'
    when new.participation_preference='team' then 'team'
    when new.participation_preference='flexible' and new.flexible_preference='prefer_team' then 'team'
    when new.participation_preference='flexible' then 'either'
    else null
  end;
  if legacy_preference is null then
    raise exception using errcode='23514',message='PARTICIPATION_PREFERENCE_REQUIRED';
  end if;

  admission_result:=public.phase6_auto_admit_interest(new.id,legacy_preference);

  update public.project_applications
  set participation_preference=new.participation_preference,
      flexible_preference=case when new.participation_preference='flexible' then new.flexible_preference else null end,
      updated_at=now()
  where id=new.id;

  if new.project_role_id is not null then
    update public.project_members
    set project_role_id=new.project_role_id,
        updated_at=now()
    where project_id=new.project_id
      and user_id=new.user_id
      and project_run_id=(admission_result->>'run_id')::uuid
      and membership_status in ('waiting','active');
  end if;

  return new;
end;
$$;

revoke all on function public.resolve_submitted_project_interest_admission() from public,anon,authenticated;

drop trigger if exists project_interest_resolve_admission_after_insert on public.project_applications;
create trigger project_interest_resolve_admission_after_insert
after insert on public.project_applications
for each row
when (new.application_kind='interest')
execute function public.resolve_submitted_project_interest_admission();
