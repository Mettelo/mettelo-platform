-- Workstream 7 / Phase 19: completion is a terminal project-run state.
-- Historical delivery rows are already read-only; this prevents any caller from
-- moving the canonical run itself back into delivery/review after completion.

create or replace function public.phase19_guard_completed_run_immutable()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  if (old.status='completed' or old.completion_state='completed')
     and (new.status is distinct from old.status or new.completion_state is distinct from old.completion_state) then
    raise exception using errcode='23514',message='PHASE19_COMPLETED_RUN_IMMUTABLE';
  end if;
  return new;
end;
$$;
revoke all on function public.phase19_guard_completed_run_immutable() from public,anon,authenticated;
drop trigger if exists phase19_completed_run_immutable_guard on public.project_runs;
create trigger phase19_completed_run_immutable_guard
before update of status,completion_state
on public.project_runs
for each row execute function public.phase19_guard_completed_run_immutable();
