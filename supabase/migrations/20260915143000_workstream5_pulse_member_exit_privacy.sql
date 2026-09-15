-- Workstream 5: revoke raw Weekly Pulse access immediately when canonical Lab membership is no longer active.
--
-- Phase 14 originally scoped raw pulse reads by user_id only. That preserved privacy
-- between teammates, but it also allowed a removed member to keep reading their own
-- private Lab pulse history directly through the API. Workstream 5 requires active
-- canonical membership for private Lab access, including Pulse.

alter table public.project_weekly_pulses enable row level security;

drop policy if exists "members read own weekly pulse" on public.project_weekly_pulses;
create policy "active members read own weekly pulse"
on public.project_weekly_pulses
for select
to authenticated
using (
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

comment on policy "active members read own weekly pulse" on public.project_weekly_pulses is
  'Workstream 5 private Pulse access: a user may read only their own raw response while the exact canonical project/run membership remains active. Removed or otherwise inactive members lose private Lab access; history remains retained in the canonical table.';
