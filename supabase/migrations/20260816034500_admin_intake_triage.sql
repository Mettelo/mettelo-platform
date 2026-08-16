-- Admin Console Part 2: operational intake triage
alter table public.form_submissions
  add column if not exists assigned_to_user_id uuid references auth.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists resolved_at timestamptz,
  add column if not exists duplicate_of_id uuid references public.form_submissions(id) on delete set null,
  add column if not exists converted_application_id uuid references public.project_applications(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists form_submissions_status_created_idx on public.form_submissions(status,created_at desc);
create index if not exists form_submissions_assigned_to_idx on public.form_submissions(assigned_to_user_id);
create index if not exists form_submissions_converted_application_idx on public.form_submissions(converted_application_id) where converted_application_id is not null;
