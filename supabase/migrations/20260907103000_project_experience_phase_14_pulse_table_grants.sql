-- Phase 14: expose the private weekly pulse table to the intended database roles.
--
-- RLS remains the authenticated-user authorization boundary. These grants only
-- allow PostgREST/authenticated requests to reach those policies. Anonymous
-- access stays explicitly denied, while service_role retains privileged access
-- for governed server-side/admin operations and integrity verification.

grant select, insert, update on table public.project_weekly_pulses to authenticated;
grant select, insert, update, delete on table public.project_weekly_pulses to service_role;
revoke all on table public.project_weekly_pulses from anon;

comment on table public.project_weekly_pulses is
  'Phase 14 private weekly member pulse. Authenticated access is limited by RLS; anonymous access is denied; service_role is available only for governed privileged operations. Each row remains bound to one canonical project_members identity by the validation trigger.';
