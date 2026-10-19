-- Phase 3: schema-only migration. Reviewed but NOT executed against Production.
-- Existing 305 project records are preserved. Unique NULLs remain permitted.
-- Preflight: abort if legacy canonical keys or normalised GitHub URLs collide.
DO $preflight$
BEGIN
 IF EXISTS (
  SELECT 1 FROM public.projects WHERE canonical_project_key IS NOT NULL
  GROUP BY canonical_project_key HAVING count(*)>1
 ) THEN RAISE EXCEPTION 'Duplicate canonical project IDs: resolve before migration'; END IF;
 IF EXISTS (
  SELECT 1 FROM public.projects WHERE github_url IS NOT NULL
  GROUP BY lower(trim(trailing '/' FROM github_url)) HAVING count(*)>1
 ) THEN RAISE EXCEPTION 'Duplicate normalised GitHub URLs: resolve before migration'; END IF;
END $preflight$;
CREATE UNIQUE INDEX IF NOT EXISTS projects_canonical_project_key_unique_phase3
 ON public.projects(canonical_project_key) WHERE canonical_project_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS projects_normalised_github_url_unique_phase3
 ON public.projects(lower(trim(trailing '/' FROM github_url))) WHERE github_url IS NOT NULL;
