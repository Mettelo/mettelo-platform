-- Project Experience Phase 11 — database activation guard.
--
-- The existing phase9_activate_project_run() remains the one canonical database
-- start action. This trigger is a final invariant on the ACTIVE transition itself:
-- even a privileged/stale caller cannot make a forming run ACTIVE unless current
-- Phase 11 readiness still passes. AUTO also cannot use a manual source to skip
-- the configured intervention window.

create or replace function public.phase11_guard_run_activation()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  project_row public.projects%rowtype;
  readiness jsonb;
  effective_admission text;
  codes text;
begin
  -- Historical/ordinary updates to an already-active run are not a new start.
  if not (
    (new.status='active' or coalesce(new.has_started,false)=true)
    and not (old.status='active' or coalesce(old.has_started,false)=true)
  ) then
    return new;
  end if;

  if new.project_id is distinct from old.project_id then
    raise exception using errcode='23514',message='PROJECT_RUN_PROJECT_IMMUTABLE_AT_START';
  end if;

  select * into project_row from public.projects where id=old.project_id;
  if project_row.id is null then
    raise exception using errcode='23503',message='PROJECT_NOT_FOUND';
  end if;

  -- Re-evaluate the complete Phase 11 projection immediately before the row can
  -- cross into ACTIVE. Because this is a BEFORE UPDATE trigger, the readiness
  -- function sees the still-forming run and current membership/resource state.
  readiness:=public.phase11_project_start_readiness(old.project_id,old.id);
  if not coalesce((readiness->>'ready')::boolean,false) then
    codes:=coalesce(readiness->'reason_codes'::text,'[]');
    raise exception using errcode='23514',message='PHASE11_START_NOT_READY',detail=codes;
  end if;

  effective_admission:=public.effective_project_admission_mode(project_row.project_type,project_row.admission_mode);

  -- Every AUTO activation, including an authorized Admin/manual invocation, must
  -- respect the governed window. Six hours passing makes the run eligible for
  -- final readiness; it is never itself authority to start.
  if effective_admission='auto' then
    if old.scheduled_start_at is null or old.scheduled_start_at>now() then
      raise exception using errcode='23514',message='SCHEDULE_NOT_DUE';
    end if;
    if project_row.auto_start_paused_at is not null or old.auto_start_paused_at is not null then
      raise exception using errcode='23514',message='PROJECT_PAUSED';
    end if;
    if old.auto_start_blocked_at is not null then
      raise exception using errcode='23514',message='PROJECT_BLOCKED';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.phase11_guard_run_activation() from public,anon,authenticated;

drop trigger if exists project_run_phase11_activation_guard on public.project_runs;
create trigger project_run_phase11_activation_guard
before update of status,has_started on public.project_runs
for each row execute function public.phase11_guard_run_activation();

comment on function public.phase11_guard_run_activation() is
  'Final Phase 11 invariant at the canonical project_runs ACTIVE boundary. Rechecks readiness and prevents AUTO manual/scheduler bypass of scheduled_start_at.';
