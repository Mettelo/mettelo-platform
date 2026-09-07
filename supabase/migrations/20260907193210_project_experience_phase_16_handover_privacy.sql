-- Phase 16 privacy hardening: structured handover is rendered only through the
-- server-authorized run surface. Browser roles do not receive direct table read
-- access, preventing optional exit context from becoming a general teammate API.

drop policy if exists project_member_handovers_governed_read on public.project_member_handovers;
revoke select,insert,update,delete on public.project_member_handovers from anon,authenticated;

comment on table public.project_member_handovers is
  'Server-authorized Phase 16 operational handover. Team views expose only operational fields; optional exit context remains private to the departing-member/Admin exit record.';
