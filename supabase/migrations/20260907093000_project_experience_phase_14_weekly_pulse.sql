-- Project Experience Phase 14: Weekly Project Pulse & Team Health.
--
-- Privacy contract:
-- * one updatable pulse per active canonical member/project/run/week;
-- * members can read/write only their own raw pulse row;
-- * Project Leads/Admins receive explainable aggregate counts through a controlled RPC;
-- * optional notes never appear in team-health aggregates;
-- * no opaque score or surveillance metric is created.

create table if not exists public.project_weekly_pulses (
  id uuid primary key default gen_random_uuid(),
  project_member_id uuid not null references public.project_members(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete cascade,
  project_run_id uuid not null references public.project_runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  period_start date not null,
  progress text not null check (progress in ('on_track','some_risk','blocked')),
  workload text not null check (workload in ('manageable','heavy','unsustainable')),
  team_state text not null check (team_state in ('working_well','some_friction','significant_concern')),
  support_need text not null check (support_need in ('no','maybe','yes')),
  note text null check (note is null or char_length(note) <= 2000),
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_weekly_pulses_monday_period check (extract(isodow from period_start) = 1),
  constraint project_weekly_pulses_one_per_membership_period unique (project_member_id, period_start),
  constraint project_weekly_pulses_one_per_week unique (project_run_id, user_id, period_start)
);

create index if not exists idx_project_weekly_pulses_project_run_period
  on public.project_weekly_pulses(project_id, project_run_id, period_start desc);
create index if not exists idx_project_weekly_pulses_member_period
  on public.project_weekly_pulses(project_member_id, period_start desc);
create index if not exists idx_project_weekly_pulses_user_period
  on public.project_weekly_pulses(user_id, period_start desc);

create or replace function public.mettelo_validate_project_pulse_run()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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
    raise exception 'Project pulse member, project and run do not match';
  end if;
  return new;
end;
$$;

drop trigger if exists project_weekly_pulses_validate_run on public.project_weekly_pulses;
create trigger project_weekly_pulses_validate_run
before insert or update of project_member_id, project_id, project_run_id, user_id
on public.project_weekly_pulses
for each row execute function public.mettelo_validate_project_pulse_run();

alter table public.project_weekly_pulses enable row level security;

drop policy if exists "members read own weekly pulse" on public.project_weekly_pulses;
create policy "members read own weekly pulse"
on public.project_weekly_pulses
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "active members create own weekly pulse" on public.project_weekly_pulses;
create policy "active members create own weekly pulse"
on public.project_weekly_pulses
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.project_members pm
    where pm.id = project_weekly_pulses.project_member_id
      and pm.project_id = project_weekly_pulses.project_id
      and pm.project_run_id = project_weekly_pulses.project_run_id
      and pm.user_id = (select auth.uid())
      and pm.membership_status = 'active'
  )
);

drop policy if exists "active members update own weekly pulse" on public.project_weekly_pulses;
create policy "active members update own weekly pulse"
on public.project_weekly_pulses
for update
to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.project_members pm
    where pm.id = project_weekly_pulses.project_member_id
      and pm.project_id = project_weekly_pulses.project_id
      and pm.project_run_id = project_weekly_pulses.project_run_id
      and pm.user_id = (select auth.uid())
      and pm.membership_status = 'active'
  )
);

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
  support_yes bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not (
    public.is_admin()
    or public.mettelo_is_run_lead(target_run)
  ) then
    raise exception 'Project Lead or Admin access required';
  end if;

  if not exists (
    select 1 from public.project_runs r
    where r.id = target_run and r.project_id = target_project
  ) then
    raise exception 'Project run does not belong to project';
  end if;

  return query
  select
    (select count(*) from public.project_members pm
      where pm.project_id = target_project
        and pm.project_run_id = target_run
        and pm.membership_status = 'active')::bigint,
    count(*)::bigint,
    count(*) filter (where p.progress = 'on_track')::bigint,
    count(*) filter (where p.progress = 'some_risk')::bigint,
    count(*) filter (where p.progress = 'blocked')::bigint,
    count(*) filter (where p.workload = 'manageable')::bigint,
    count(*) filter (where p.workload = 'heavy')::bigint,
    count(*) filter (where p.workload = 'unsustainable')::bigint,
    count(*) filter (where p.team_state = 'working_well')::bigint,
    count(*) filter (where p.team_state = 'some_friction')::bigint,
    count(*) filter (where p.team_state = 'significant_concern')::bigint,
    count(*) filter (where p.support_need = 'no')::bigint,
    count(*) filter (where p.support_need = 'maybe')::bigint,
    count(*) filter (where p.support_need = 'yes')::bigint
  from public.project_weekly_pulses p
  where p.project_id = target_project
    and p.project_run_id = target_run
    and p.period_start = target_period;
end;
$$;

revoke all on function public.project_weekly_pulse_health(uuid, uuid, date) from public;
grant execute on function public.project_weekly_pulse_health(uuid, uuid, date) to authenticated;

insert into public.notification_event_catalogue (
  event_key,
  product_area,
  description,
  default_channel,
  urgency,
  action_required,
  retryable,
  active
)
values (
  'project_pulse_reminder',
  'collaboration',
  'Weekly reminder to submit a project pulse when the current period is still incomplete',
  'email_and_in_app',
  'normal',
  true,
  true,
  true
)
on conflict (event_key) do update set
  product_area = excluded.product_area,
  description = excluded.description,
  default_channel = excluded.default_channel,
  urgency = excluded.urgency,
  action_required = excluded.action_required,
  retryable = excluded.retryable,
  active = true,
  updated_at = now();

comment on table public.project_weekly_pulses is
  'Phase 14 private weekly member pulse. Each row is bound to one canonical project_members row; raw rows are own-user only and team health is exposed only as explainable aggregate counts.';
comment on function public.project_weekly_pulse_health(uuid, uuid, date) is
  'Phase 14 Project Lead/Admin aggregate pulse counts. Never returns member identity, note content, or an opaque score.';
