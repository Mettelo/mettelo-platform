-- Record the exact inline participation-terms version accepted with project interest.
-- Full role applications continue to use their existing attachment-backed terms flow.

alter table if exists public.project_applications
  add column if not exists terms_version text;

comment on column public.project_applications.terms_version is
  'Version identifier of inline Mettelo Project Participation Terms accepted for project-interest submissions.';
