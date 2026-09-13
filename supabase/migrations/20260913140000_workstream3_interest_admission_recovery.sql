-- Workstream 3 canonical Submit Interest recovery.
-- Reassert effective admission and timing authorities without introducing a second engine.

begin;

update public.projects
set auto_start_delay_minutes=360,updated_at=now()
where admission_mode='auto' and auto_start_delay_minutes<>360;

alter table public.projects alter column auto_start_delay_minutes set default 360;
alter table public.projects drop constraint if exists projects_phase9_auto_start_window_check;
alter table public.projects add constraint projects_phase9_auto_start_window_check
check (admission_mode<>'auto' or auto_start_delay_minutes=360);

create or replace function public.phase9_enforce_auto_start_window()
returns trigger language plpgsql set search_path=public as $$
begin
  if new.admission_mode='auto' then new.auto_start_delay_minutes:=360; end if;
  return new;
end;
$$;
revoke all on function public.phase9_enforce_auto_start_window() from public,anon,authenticated;
drop trigger if exists project_phase9_auto_start_window_guard on public.projects;
create trigger project_phase9_auto_start_window_guard
before insert or update of admission_mode,auto_start_delay_minutes on public.projects
for each row execute function public.phase9_enforce_auto_start_window();

create or replace function public.resolve_submitted_project_interest_admission()
returns trigger language plpgsql security definer set search_path=public as $$
declare
  project_row public.projects%rowtype;
  legacy_preference text;
  canonical_preference text:=new.participation_preference;
  canonical_flexible_preference text:=new.flexible_preference;
begin
  if new.application_kind<>'interest' then return new; end if;
  select * into project_row from public.projects where id=new.project_id;
  if project_row.id is null then raise exception using errcode='P0002',message='PROJECT_NOT_FOUND'; end if;

  if project_row.project_type='partner' or coalesce(project_row.admission_mode,'review_required')<>'auto' then
    update public.project_applications
    set admission_mode_snapshot='review_required',admission_decision='review_required',
        admission_decided_at=coalesce(admission_decided_at,now()),updated_at=now()
    where id=new.id;
    return new;
  end if;

  if new.participation_preference is null then return new; end if;
  legacy_preference:=case
    when project_row.participation_mode='solo' then 'solo'
    when project_row.participation_mode='team' then 'team'
    when new.participation_preference='solo' then 'solo'
    when new.participation_preference='team' then 'team'
    when new.flexible_preference='prefer_team' then 'team'
    else 'either'
  end;

  perform public.phase6_auto_admit_interest(new.id,legacy_preference);
  update public.project_applications
  set participation_preference=canonical_preference,flexible_preference=canonical_flexible_preference,updated_at=now()
  where id=new.id;

  if new.project_role_id is not null then
    update public.project_members
    set project_role_id=new.project_role_id
    where project_id=new.project_id and user_id=new.user_id
      and project_run_id=(select project_run_id from public.project_applications where id=new.id)
      and membership_status in ('waiting','active');
  end if;
  return new;
end;
$$;
revoke all on function public.resolve_submitted_project_interest_admission() from public,anon,authenticated;
drop trigger if exists project_interest_resolve_admission_after_insert on public.project_applications;
create trigger project_interest_resolve_admission_after_insert
after insert on public.project_applications
for each row when (new.application_kind='interest')
execute function public.resolve_submitted_project_interest_admission();

revoke select on table public.project_runs from anon,authenticated;
grant select (id,project_id,run_number,status,team_size_threshold,kickoff_at,completed_at,created_at,updated_at,required_team_size,has_started,started_at,scheduled_start_at,start_scheduled_at,start_ready_at,auto_start_paused_at,auto_start_blocked_at,recruitment_open,recruitment_closed_at)
on table public.project_runs to anon,authenticated;
grant select on table public.project_runs to service_role;

commit;
