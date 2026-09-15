-- Workstream 4: normal Project Lead assignment remains a formation decision.
--
-- The Admin Team Formation surface/API blocks ordinary Lead changes once the
-- canonical run has started. The database authority must NOT install a generic
-- team_role trigger that also blocks the existing Phase 17 governed recovery
-- coordinator, because Phase 17 intentionally reuses phase10_confirm_project_lead
-- to replace a Lead on an active run after a support/recovery decision.
--
-- Phase 10 already provides the canonical Lead mutation authority, one-active-Lead
-- serialization and service-role execution boundary. Phase 17 adds its own case
-- lock, optimistic version token and authorized recovery path. Workstream 4 keeps
-- those authorities intact and removes the over-broad formation trigger from any
-- database where an earlier branch revision installed it.

drop trigger if exists project_member_phase10_lead_formation_lock on public.project_members;
drop function if exists public.phase10_guard_project_lead_formation_lock();

comment on function public.phase10_confirm_project_lead(uuid,uuid,text) is
  'Canonical service-only Project Lead mutation authority. Normal Team Formation changes are restricted to forming runs by the Workstream 4 Admin boundary; governed active-run replacement remains available through the Phase 17 recovery coordinator.';
