-- Restore table privileges required by authenticated Mettelo Lab routes.
--
-- These tables already define ownership/membership RLS policies, but their creating
-- migrations did not grant the corresponding table operations to authenticated.
-- PostgREST therefore returned 42501 before RLS could evaluate the intended boundary.
-- Keep this repair least-privilege and aligned with the existing route contracts.

grant usage on schema public to authenticated;

-- /api/project-conversation-read uses an authenticated UPSERT. The table's
-- "members manage own discussion read state" policy restricts rows to the current
-- active/completed project member.
grant select, insert, update on table public.project_discussion_reads to authenticated;

-- Members read contribution review history, while contributors may append only their
-- own submitted/resubmitted events under the existing RLS policies.
grant select, insert on table public.contribution_review_events to authenticated;
