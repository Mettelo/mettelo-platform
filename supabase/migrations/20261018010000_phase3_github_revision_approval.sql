-- Phase 3 draft-only revision approval. NOT applied to Production.
-- Single transaction, row lock, optimistic revision and immutable identity.
CREATE OR REPLACE FUNCTION public.phase3_approve_github_revision(
 p_project_id uuid, p_actor_user_id uuid, p_expected_revision integer,
 p_manifest jsonb, p_blob_sha text
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
 current_project record;
 first_import jsonb;
 last_revision integer;
 next_revision integer;
BEGIN
 IF p_actor_user_id IS NULL OR p_expected_revision IS NULL OR p_expected_revision < 1 OR p_expected_revision > 100000
 OR p_manifest IS NULL OR jsonb_typeof(p_manifest) <> 'object'
 OR length(coalesce(p_blob_sha,'')) <> 40 OR p_blob_sha !~ '^[0-9a-f]{40}$'
 THEN RAISE EXCEPTION 'Invalid revision approval input'; END IF;
 SELECT id,canonical_project_key,github_url,status,visibility
 INTO current_project FROM public.projects WHERE id=p_project_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'GitHub project not found'; END IF;
 IF current_project.status <> 'draft' OR current_project.visibility <> 'private'
 THEN RAISE EXCEPTION 'Only private drafts may accept GitHub manifest revisions'; END IF;
 SELECT metadata->'github_import' INTO first_import FROM public.project_activity_log
 WHERE project_id=p_project_id AND event_type='project_created'
 ORDER BY created_at,id LIMIT 1;
 IF first_import IS NULL OR first_import->'manifest_snapshot' IS NULL
 OR first_import->>'external_id' IS DISTINCT FROM current_project.canonical_project_key
 OR first_import->>'repository' IS DISTINCT FROM current_project.github_url
 THEN RAISE EXCEPTION 'Initial GitHub manifest provenance is missing'; END IF;
 IF p_manifest->>'id' IS DISTINCT FROM current_project.canonical_project_key
 OR p_manifest->>'repository' IS DISTINCT FROM current_project.github_url
 OR p_manifest->>'status' <> 'Available'
 OR length(coalesce(p_manifest->>'name','')) NOT BETWEEN 1 AND 180
 OR length(coalesce(p_manifest->>'brief','')) NOT BETWEEN 1 AND 900
 OR length(coalesce(p_manifest->>'problem','')) NOT BETWEEN 1 AND 4000
 THEN RAISE EXCEPTION 'Manifest identity or required metadata is invalid'; END IF;
 SELECT coalesce(max((metadata->'github_import'->>'revision')::integer),0)
 INTO last_revision FROM public.project_activity_log
 WHERE project_id=p_project_id AND event_type='github_manifest_revision_approved';
 last_revision := greatest(coalesce(last_revision,0),coalesce((first_import->>'revision')::integer,1));
 IF last_revision <> p_expected_revision
 THEN RAISE EXCEPTION 'Stale GitHub manifest revision; refresh before approval'; END IF;
 next_revision:=last_revision+1;
 UPDATE public.projects SET
  title=p_manifest->>'name',
  summary=p_manifest->>'brief',
  problem_statement=p_manifest->>'problem',
  updated_at=now(),updated_by_user_id=p_actor_user_id
 WHERE id=p_project_id;
 INSERT INTO public.project_activity_log(
  project_id,event_type,actor_type,actor_user_id,from_status,to_status,metadata
 ) VALUES (
  p_project_id,'github_manifest_revision_approved','user',p_actor_user_id,'draft','draft',
  jsonb_build_object('github_import',jsonb_build_object(
   'external_id',current_project.canonical_project_key,
   'repository',current_project.github_url,
   'manifest_blob_sha',p_blob_sha,
   'manifest_snapshot',p_manifest,
   'revision',next_revision))
 );
 RETURN next_revision;
END;
$$;
-- Supabase may grant EXECUTE directly to anon and authenticated by default.\n-- Revoking only PUBLIC does not remove those explicit grants.\nREVOKE ALL ON FUNCTION public.phase3_approve_github_revision(uuid,uuid,integer,jsonb,text) FROM PUBLIC, anon, authenticated;
DO $grant$
BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN
  GRANT EXECUTE ON FUNCTION public.phase3_approve_github_revision(uuid,uuid,integer,jsonb,text) TO service_role;
 END IF;
END $grant$;
