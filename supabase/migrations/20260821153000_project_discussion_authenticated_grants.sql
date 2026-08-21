begin;

-- Mettelo Lab Chat reads and creates discussion rows through an authenticated
-- Supabase client. RLS already enforces project membership and authorship, but
-- PostgreSQL table privileges must exist before those policies can be evaluated.
--
-- Keep message mutation fail-closed: Phase 2 deliberately revoked UPDATE from
-- browser roles so edit/delete/pin/classify continue through the governed server
-- route. This migration therefore restores only the operations the browser-side
-- discussion contract actually requires.
grant usage on schema public to authenticated;
grant select, insert on table public.project_discussions to authenticated;

commit;
