-- Phase 9 exact AUTO intervention window guard.
-- Legacy/admin writers may still send an older delay value. AUTO is no longer a
-- configurable duration in this phase: the server normalizes it to six hours.

create or replace function public.phase9_enforce_auto_start_window()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  if new.admission_mode='auto' then
    new.auto_start_delay_minutes:=360;
  end if;
  return new;
end;
$$;

revoke all on function public.phase9_enforce_auto_start_window() from public,anon,authenticated;

drop trigger if exists project_phase9_auto_start_window_guard on public.projects;
create trigger project_phase9_auto_start_window_guard
before insert or update of admission_mode,auto_start_delay_minutes
on public.projects
for each row execute function public.phase9_enforce_auto_start_window();
