-- Synthetic, deterministic fixture for an EPHEMERAL CI postgres service only.
-- Never execute against a real Supabase database.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
DO $roles$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
END $roles$;
CREATE TABLE public.projects (id uuid PRIMARY KEY);
CREATE TABLE public.project_runs (
 id uuid PRIMARY KEY,
 project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT
);
CREATE TABLE public.project_applications (
 id uuid PRIMARY KEY,
 project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT
);
CREATE TABLE public.project_members (
 id uuid PRIMARY KEY,
 project_run_id uuid NOT NULL REFERENCES public.project_runs(id) ON DELETE RESTRICT
);
CREATE TABLE public.project_offers (
 id uuid PRIMARY KEY,
 project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT
);
INSERT INTO public.projects
SELECT md5('legacy-project-'||i)::uuid FROM generate_series(1,305) AS i;
INSERT INTO public.project_runs
SELECT md5('legacy-run-'||i)::uuid,md5('legacy-project-'||i)::uuid
FROM generate_series(1,10) AS i;
INSERT INTO public.project_applications
SELECT md5('legacy-application-'||i)::uuid,md5('legacy-project-'||i)::uuid
FROM generate_series(1,12) AS i;
INSERT INTO public.project_members
SELECT md5('legacy-member-'||i)::uuid,md5('legacy-run-'||i)::uuid
FROM generate_series(1,8) AS i;
INSERT INTO public.project_offers
SELECT md5('legacy-offer-'||i)::uuid,md5('legacy-project-'||i)::uuid
FROM generate_series(1,4) AS i;
CREATE TEMP TABLE legacy_baseline AS
 SELECT 'projects' AS kind,md5(string_agg(id::text,',' ORDER BY id)) AS digest FROM public.projects
 UNION ALL SELECT 'runs',md5(string_agg(id::text,',' ORDER BY id)) FROM public.project_runs
 UNION ALL SELECT 'applications',md5(string_agg(id::text,',' ORDER BY id)) FROM public.project_applications
 UNION ALL SELECT 'members',md5(string_agg(id::text,',' ORDER BY id)) FROM public.project_members
 UNION ALL SELECT 'offers',md5(string_agg(id::text,',' ORDER BY id)) FROM public.project_offers;
-- Persist a baseline in the disposable database to compare across psql sessions.
CREATE TABLE public.phase2_ci_baseline AS SELECT * FROM legacy_baseline;
