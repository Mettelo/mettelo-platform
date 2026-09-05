-- Align the canonical project application schema with the member submission contract.
-- These fields are already required by the application API and Admin review surface.

alter table public.project_applications
  add column if not exists leadership_interest boolean,
  add column if not exists terms_version text;

comment on column public.project_applications.leadership_interest is
  'Whether the applicant is willing to be considered to lead the project team. An interest signal only.';
comment on column public.project_applications.terms_version is
  'Canonical Project Participation Terms version accepted at submission time.';

-- Keep backward compatibility for legacy rows while enforcing valid structured submissions at write time.
alter table public.project_applications
  drop constraint if exists project_applications_terms_acceptance_pair_check;

alter table public.project_applications
  add constraint project_applications_terms_acceptance_pair_check
  check (
    (terms_accepted_at is null and terms_version is null)
    or
    (terms_accepted_at is not null and nullif(btrim(terms_version), '') is not null)
  );
