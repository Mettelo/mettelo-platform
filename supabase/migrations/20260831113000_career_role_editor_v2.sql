alter table public.career_roles
  add column if not exists role_proposition text,
  add column if not exists time_commitment text,
  add column if not exists candidate_value text,
  add column if not exists good_fit text,
  add column if not exists not_required text,
  add column if not exists core_capabilities text,
  add column if not exists useful_tools text,
  add column if not exists working_model text,
  add column if not exists success_looks_like text,
  add column if not exists transparency text,
  add column if not exists application_stages jsonb not null default '[]'::jsonb;

comment on column public.career_roles.role_proposition is 'Short candidate-facing role value proposition used in the role hero.';
comment on column public.career_roles.time_commitment is 'Human-readable weekly or project time commitment.';
comment on column public.career_roles.candidate_value is 'Newline-separated value/benefit statements for the contributor.';
comment on column public.career_roles.good_fit is 'Newline-separated candidate-fit statements.';
comment on column public.career_roles.not_required is 'Newline-separated reassurance statements describing what is not required.';
comment on column public.career_roles.core_capabilities is 'Newline-separated capability expectations, separate from tools.';
comment on column public.career_roles.useful_tools is 'Newline-separated useful tools or technologies.';
comment on column public.career_roles.working_model is 'Newline-separated working-model expectations.';
comment on column public.career_roles.success_looks_like is 'Candidate-facing description of successful contribution.';
comment on column public.career_roles.transparency is 'Clear role conditions, especially for volunteer or unpaid work.';
comment on column public.career_roles.application_stages is 'Ordered application-stage objects with label and description.';
