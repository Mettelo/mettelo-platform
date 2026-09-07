-- Project Experience Phase 14 full-acceptance hardening.
-- Preserves Phase 9 as participation authority and keeps raw pulse data private.

alter table public.project_weekly_pulses
  alter column team_state drop not null;

alter table public.project_weekly_pulses
  drop constraint if exists project_weekly_pulses_team_state_check;
alter table public.project_weekly_pulses
  add constraint project_weekly_pulses_team_state_check
  check (team_state is null or team_state in ('working_well','some_friction','significant_concern'));

alter table public.project_weekly_pulses
  add column if not exists blocked boolean generated always as (progress = 'blocked') stored,
  add column if not exists support_requested boolean generated always as (support_need = 'yes') stored;

create index if not exists idx_project_weekly_pulses_blocked_attention
  on public.project_weekly_pulses(project_run_id, period_start desc)
  where blocked;
create index if not exists idx_project_weekly_pulses_support_attention
  on public.project_weekly_pulses(project_run_id, period_start desc)
  where support_requested;

create or replace function public.project_pulse_team_applicable(
  target_project uuid,
  target_run uuid,
  target_period date
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with project_contract as (
    select p.participation_mode
    from public.projects p
    join public.project_runs r on r.id = target_run and r.project_id = p.id
    where p.id = target_project
  ), eligible_members as (
    select count(*)::integer as member_count
    from public.project_members pm
    where pm.project_id = target_project
      and pm.project_run_id = target_run
      and coalesce(pm.activated_at, pm.started_at) is not null
      and coalesce(pm.activated_at, pm.started_at) < (target_period + interval '7 days')
      and coalesce(pm.ended_at, pm.completed_at, 'infinity'::timestamptz) >= target_period::timestamptz
  )
  select case
    when pc.participation_mode = 'solo' then false
    when pc.participation_mode = 'team' then true
    when pc.participation_mode = 'flexible' then em.member_count > 1
    else em.member_count > 1
  end
  from project_contract pc cross join eligible_members em;
$$;

revoke all on function public.project_pulse_team_applicable(uuid, uuid, date) from public, anon;
grant execute on function public.project_pulse_team_applicable(uuid, uuid, date) to authenticated, service_role;

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
    select 1 from public.project_runs r
    where r.id = new.project_run_id
      and r.project_id = new.project_id
  ) then
    raise exception 'Project pulse run does not belong to project';
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

create or replace function public.project_weekly_pulse_health(
  target_project uuid,
  target_run uuid,
  target_period date
)
returns table (
  active_members bigint,
  submissions bigint,
  on_track bigint,
  some_risk bigint,
  blocked bigint,
  manageable bigint,
  heavy bigint,
  unsustainable bigint,
  working_well bigint,
  some_friction bigint,
  significant_concern bigint,
  support_no bigint,
  support_maybe bigint,
  support_yes bigint,
  team_applicable boolean,
  health_state text,
  reasons jsonb
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  expected bigint;
  submitted bigint;
  c_on_track bigint;
  c_some_risk bigint;
  c_blocked bigint;
  c_manageable bigint;
  c_heavy bigint;
  c_unsustainable bigint;
  c_working_well bigint;
  c_some_friction bigint;
  c_significant_concern bigint;
  c_support_no bigint;
  c_support_maybe bigint;
  c_support_yes bigint;
  team_is_applicable boolean;
  state text;
  why jsonb := '[]'::jsonb;
begin
  if not (public.is_admin() or public.mettelo_is_run_lead(target_run)) then
    raise exception 'Project Lead or Admin access required';
  end if;
  if not exists (select 1 from public.project_runs r where r.id = target_run and r.project_id = target_project) then
    raise exception 'Project run does not belong to project';
  end if;

  select count(*)::bigint into expected
  from public.project_members pm
  where pm.project_id = target_project
    and pm.project_run_id = target_run
    and coalesce(pm.activated_at, pm.started_at) is not null
    and coalesce(pm.activated_at, pm.started_at) < (target_period + interval '7 days')
    and coalesce(pm.ended_at, pm.completed_at, 'infinity'::timestamptz) >= target_period::timestamptz;

  select
    count(*)::bigint,
    count(*) filter (where p.progress='on_track')::bigint,
    count(*) filter (where p.progress='some_risk')::bigint,
    count(*) filter (where p.progress='blocked')::bigint,
    count(*) filter (where p.workload='manageable')::bigint,
    count(*) filter (where p.workload='heavy')::bigint,
    count(*) filter (where p.workload='unsustainable')::bigint,
    count(*) filter (where p.team_state='working_well')::bigint,
    count(*) filter (where p.team_state='some_friction')::bigint,
    count(*) filter (where p.team_state='significant_concern')::bigint,
    count(*) filter (where p.support_need='no')::bigint,
    count(*) filter (where p.support_need='maybe')::bigint,
    count(*) filter (where p.support_need='yes')::bigint
  into submitted,c_on_track,c_some_risk,c_blocked,c_manageable,c_heavy,c_unsustainable,c_working_well,c_some_friction,c_significant_concern,c_support_no,c_support_maybe,c_support_yes
  from public.project_weekly_pulses p
  where p.project_id=target_project and p.project_run_id=target_run and p.period_start=target_period;

  team_is_applicable := coalesce(public.project_pulse_team_applicable(target_project,target_run,target_period),false);

  if c_blocked>0 then why:=why||jsonb_build_array(jsonb_build_object('code','blocked','label',format('%s member%s reported being blocked',c_blocked,case when c_blocked=1 then '' else 's' end))); end if;
  if c_unsustainable>0 then why:=why||jsonb_build_array(jsonb_build_object('code','unsustainable_workload','label',format('%s member%s reported unsustainable workload',c_unsustainable,case when c_unsustainable=1 then '' else 's' end))); end if;
  if c_significant_concern>0 then why:=why||jsonb_build_array(jsonb_build_object('code','significant_team_concern','label',format('%s significant team concern%s reported',c_significant_concern,case when c_significant_concern=1 then '' else 's' end))); end if;
  if c_support_yes>0 then why:=why||jsonb_build_array(jsonb_build_object('code','support_requested','label',format('%s member%s requested support',c_support_yes,case when c_support_yes=1 then '' else 's' end))); end if;

  if jsonb_array_length(why)>0 then state:='needs_attention';
  else
    if c_some_risk>0 then why:=why||jsonb_build_array(jsonb_build_object('code','some_risk','label',format('%s member%s reported some risk',c_some_risk,case when c_some_risk=1 then '' else 's' end))); end if;
    if c_heavy>0 then why:=why||jsonb_build_array(jsonb_build_object('code','heavy_workload','label',format('%s member%s reported heavy workload',c_heavy,case when c_heavy=1 then '' else 's' end))); end if;
    if c_some_friction>0 then why:=why||jsonb_build_array(jsonb_build_object('code','team_friction','label',format('%s team-friction signal%s reported',c_some_friction,case when c_some_friction=1 then '' else 's' end))); end if;
    if c_support_maybe>0 then why:=why||jsonb_build_array(jsonb_build_object('code','support_maybe','label',format('%s member%s may need support',c_support_maybe,case when c_support_maybe=1 then '' else 's' end))); end if;
    if greatest(expected-submitted,0)>0 then why:=why||jsonb_build_array(jsonb_build_object('code','missing_checkins','label',format('%s of %s current check-ins are missing',greatest(expected-submitted,0),expected))); end if;
    state:=case when jsonb_array_length(why)>0 then 'watch' else 'no_current_concern' end;
  end if;

  return query select expected,submitted,c_on_track,c_some_risk,c_blocked,c_manageable,c_heavy,c_unsustainable,c_working_well,c_some_friction,c_significant_concern,c_support_no,c_support_maybe,c_support_yes,team_is_applicable,state,why;
end;
$$;

revoke all on function public.project_weekly_pulse_health(uuid, uuid, date) from public;
grant execute on function public.project_weekly_pulse_health(uuid, uuid, date) to authenticated;

comment on function public.project_pulse_team_applicable(uuid, uuid, date) is
  'Phase 14 team-question applicability derived from Phase 9 participation mode plus period-valid run membership. Solo and Flexible-Solo periods do not require team-state answers.';
comment on function public.project_weekly_pulse_health(uuid, uuid, date) is
  'Phase 14 explainable Project Lead/Admin health state and structured reasons. Expected membership is period-relative; raw member identity and private note content are never returned.';