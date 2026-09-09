-- Project Experience Phase 16: server-authorized handover read boundary.
--
-- Structured handovers remain unavailable to browser roles. The Mettelo Lab
-- recovery surface renders them through serviceDb(), so service_role needs an
-- explicit table SELECT grant even though RLS is bypassed by that role.

revoke select,insert,update,delete on public.project_member_handovers from anon,authenticated;
grant select on public.project_member_handovers to service_role;

comment on table public.project_member_handovers is
  'Server-authorized Phase 16 operational handover. service_role may read for governed run recovery surfaces; anon/authenticated direct table access remains revoked.';
