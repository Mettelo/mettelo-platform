alter table public.opportunities
  add column if not exists country_code text,
  add column if not exists applicant_scope text not null default 'unknown',
  add column if not exists work_arrangement text,
  add column if not exists expired_at timestamptz,
  add column if not exists verification_failure_count integer not null default 0,
  add column if not exists last_verification_error text;

alter table public.opportunities drop constraint if exists opportunities_opportunity_type_check;
alter table public.opportunities add constraint opportunities_opportunity_type_check check (opportunity_type = any (array['job','internship','graduate','apprenticeship','referral','volunteer','fellowship','freelance','consulting','project','other']::text[]));

alter table public.opportunities drop constraint if exists opportunities_status_check;
alter table public.opportunities add constraint opportunities_status_check check (status = any (array['draft','published','expired','closed','archived']::text[]));

alter table public.opportunities drop constraint if exists opportunities_sponsorship_status_check;
alter table public.opportunities add constraint opportunities_sponsorship_status_check check (sponsorship_status = any (array['confirmed','licensed_sponsor','not_offered','not_stated','unclear','unknown']::text[]));

alter table public.opportunities drop constraint if exists opportunities_applicant_scope_check;
alter table public.opportunities add constraint opportunities_applicant_scope_check check (applicant_scope = any (array['worldwide','international_accepted','country_restricted','remote_worldwide','unknown']::text[]));

alter table public.opportunities drop constraint if exists opportunities_work_arrangement_check;
alter table public.opportunities add constraint opportunities_work_arrangement_check check (work_arrangement is null or work_arrangement = any (array['remote','hybrid','onsite','unknown']::text[]));

create index if not exists idx_opportunities_country_status on public.opportunities(country_code,status);
create index if not exists idx_opportunities_next_verification on public.opportunities(next_verification_at) where status='published';
create index if not exists idx_opportunities_closes_at_published on public.opportunities(closes_at) where status='published';