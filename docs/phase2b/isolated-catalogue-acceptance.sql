-- PHASE 2 ACCEPTANCE: ISOLATED RESTORED STAGING DATABASE ONLY.
-- Read-only assertions; do not execute against Production.
-- Run after the private schema and 50-row transaction have been applied
-- to a separately restored staging database.
BEGIN READ ONLY;
DO $phase2$
DECLARE v_revision uuid; v_count integer; v_bad integer;
BEGIN
 IF to_regclass('catalogue_private.revisions') IS NULL OR
    to_regclass('catalogue_private.projects') IS NULL THEN
   RAISE EXCEPTION 'Phase 2 private catalogue is absent';
 END IF;
 SELECT id INTO v_revision FROM catalogue_private.revisions
 WHERE source_repo='Mettelo/project-library'
   AND source_commit_sha='65dc740ac1c6c8f88868863a6772150c1a5a12f7'
   AND record_count=50 AND state IN ('staged','validated','approved')
 ORDER BY created_at DESC LIMIT 1;
 IF v_revision IS NULL THEN RAISE EXCEPTION 'Pinned revision not found'; END IF;
 SELECT count(*) INTO v_count FROM catalogue_private.projects WHERE revision_id=v_revision;
 IF v_count<>50 THEN RAISE EXCEPTION 'Expected 50 projects, found %',v_count; END IF;
 SELECT count(*) INTO v_bad FROM catalogue_private.projects
 WHERE revision_id=v_revision
 AND (external_id !~ '^MTL-(DA|DE|DS|AI|XF|BA)-[0-9]{3}$'
      OR master_repository_url !~ '^https://github[.]com/Mettelo/[A-Za-z0-9_.-]+/?$');
 IF v_bad<>0 THEN RAISE EXCEPTION 'Invalid catalogue identifiers or repositories'; END IF;
 IF (SELECT count(*) FROM public.projects)<305 OR
    (SELECT count(*) FROM public.project_applications)<12 OR
    (SELECT count(*) FROM public.project_runs)<10 OR
    (SELECT count(*) FROM public.project_members)<8 OR
    (SELECT count(*) FROM public.project_offers)<4 THEN
   RAISE EXCEPTION 'Historical minimum record counts not preserved';
 END IF;
 IF has_schema_privilege('anon','catalogue_private','USAGE') OR
    has_schema_privilege('authenticated','catalogue_private','USAGE') OR
    has_table_privilege('anon','catalogue_private.projects','SELECT') OR
    has_table_privilege('authenticated','catalogue_private.projects','SELECT') THEN
   RAISE EXCEPTION 'Private catalogue exposed to browser roles';
 END IF;
 IF NOT (SELECT relrowsecurity FROM pg_class
         WHERE oid='catalogue_private.projects'::regclass) THEN
   RAISE EXCEPTION 'Private catalogue RLS is disabled';
 END IF;
END
$phase2$;
SELECT 'phase2-isolated-acceptance-passed' AS outcome;
ROLLBACK;
