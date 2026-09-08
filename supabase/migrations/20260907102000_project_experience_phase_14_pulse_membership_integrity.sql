-- Phase 14: restore the canonical membership invariant after full-acceptance hardening.
--
-- The preceding hardening migration extends the validation trigger with team-question
-- applicability. This final definition preserves that behaviour AND reasserts that
-- project_member_id, project_id, project_run_id and user_id identify the same
-- canonical project_members row, including for privileged/service-role writes.

create or replace function public.mettelo_validate_project_pulse_run()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  team_applicable boolean;
begin
  if not exists (
    select 1
    from public.project_members pm
    join public.project_runs r
      on r.id = pm.project_run_id
     and r.project_id = pm.project_id
    where pm.id = new.project_member_id
      and pm.project_id = new.project_id
      and pm.project_run_id = new.project_run_id
      and pm.user_id = new.user_id
      and r.id = new.project_run_id
      and r.project_id = new.project_id
  ) then
    raise exception 'Project pulse member, project, run and user do not match';
  end if;

  select public.project_pulse_team_applicable(new.project_id, new.project_run_id, new.period_start)
    into team_applicable;

  if coalesce(team_applicable, false) and new.team_state is null then
    raise exception 'Team state is required for collaborative pulse periods';
  end if;

  if not coalesce(team_applicable, false) then
    new.team_state := null;
  end if;

  return new;
end;
$$;

comment on function public.mettelo_validate_project_pulse_run() is
  'Phase 14 canonical pulse integrity guard. Enforces exact membership/project/run/user identity for every write, including privileged writes, and normalises team-state applicability.';
