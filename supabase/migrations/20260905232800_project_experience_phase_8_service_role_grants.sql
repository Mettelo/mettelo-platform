-- Project Experience Phase 8: trusted server/service access to canonical project offers.
--
-- Member access remains owner-scoped by RLS and authenticated direct writes stay
-- revoked. The service role is the trusted backend/admin boundary used by server
-- routes, scheduled processing and isolated E2E fixture administration.

grant select, insert, update, delete on table public.project_offers to service_role;
