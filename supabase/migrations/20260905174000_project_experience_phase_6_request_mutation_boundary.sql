-- Project Experience Phase 6: project request lifecycle mutations are server-authoritative.
--
-- The historical owner UPDATE policy allowed an authenticated member to mutate arbitrary
-- columns on their own project_applications row (including status and server-owned linkage).
-- Legitimate member withdrawal already runs through /api/project-applications using the
-- server-side service client, while Admin decisions run through the authorised Admin API.
-- Members therefore need INSERT + SELECT ownership policies, not direct UPDATE authority.

-- Preserve the existing owner read/insert policies and the existing Admin ALL policy.
-- Remove only the broad member UPDATE policy.
drop policy if exists "users withdraw own applications" on public.project_applications;

comment on table public.project_applications is
  'Canonical project request records. Members may create/read their own requests; lifecycle mutations are performed through authorised server APIs and Admin operations.';
