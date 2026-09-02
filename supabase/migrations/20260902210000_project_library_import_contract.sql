-- Mettelo Project Library: canonical workbook import contract.
-- Extends the existing Project Experience V2 model; it does not create a parallel project system.

alter table public.projects
  add column if not exists canonical_project_key text;
create unique index if not exists projects_canonical_project_key_uidx
  on public.projects(canonical_project_key)
  where canonical_project_key is not null;

alter table public.project_problem_briefs
  add column if not exists decision_to_support text,
  add column if not exists constraints_trade_offs jsonb not null default '[]'::jsonb,
  add column if not exists explicit_assumptions jsonb not null default '[]'::jsonb,
  add column if not exists acceptance_quality_checks jsonb not null default '[]'::jsonb,
  add column if not exists responsible_use_risks jsonb not null default '[]'::jsonb,
  add column if not exists evidence_expectations jsonb not null default '[]'::jsonb,
  add column if not exists technical_skills jsonb not null default '[]'::jsonb,
  add column if not exists professional_skills jsonb not null default '[]'::jsonb,
  add column if not exists canonical_methods jsonb not null default '[]'::jsonb,
  add column if not exists canonical_tools jsonb not null default '[]'::jsonb,
  add column if not exists stakeholder_handover text,
  add column if not exists capability_outcome text;

alter table public.project_problem_briefs drop constraint if exists project_problem_briefs_constraints_trade_offs_array;
alter table public.project_problem_briefs add constraint project_problem_briefs_constraints_trade_offs_array check (jsonb_typeof(constraints_trade_offs)='array');
alter table public.project_problem_briefs drop constraint if exists project_problem_briefs_explicit_assumptions_array;
alter table public.project_problem_briefs add constraint project_problem_briefs_explicit_assumptions_array check (jsonb_typeof(explicit_assumptions)='array');
alter table public.project_problem_briefs drop constraint if exists project_problem_briefs_acceptance_quality_checks_array;
alter table public.project_problem_briefs add constraint project_problem_briefs_acceptance_quality_checks_array check (jsonb_typeof(acceptance_quality_checks)='array');
alter table public.project_problem_briefs drop constraint if exists project_problem_briefs_responsible_use_risks_array;
alter table public.project_problem_briefs add constraint project_problem_briefs_responsible_use_risks_array check (jsonb_typeof(responsible_use_risks)='array');
alter table public.project_problem_briefs drop constraint if exists project_problem_briefs_evidence_expectations_array;
alter table public.project_problem_briefs add constraint project_problem_briefs_evidence_expectations_array check (jsonb_typeof(evidence_expectations)='array');
alter table public.project_problem_briefs drop constraint if exists project_problem_briefs_technical_skills_array;
alter table public.project_problem_briefs add constraint project_problem_briefs_technical_skills_array check (jsonb_typeof(technical_skills)='array');
alter table public.project_problem_briefs drop constraint if exists project_problem_briefs_professional_skills_array;
alter table public.project_problem_briefs add constraint project_problem_briefs_professional_skills_array check (jsonb_typeof(professional_skills)='array');
alter table public.project_problem_briefs drop constraint if exists project_problem_briefs_canonical_methods_array;
alter table public.project_problem_briefs add constraint project_problem_briefs_canonical_methods_array check (jsonb_typeof(canonical_methods)='array');
alter table public.project_problem_briefs drop constraint if exists project_problem_briefs_canonical_tools_array;
alter table public.project_problem_briefs add constraint project_problem_briefs_canonical_tools_array check (jsonb_typeof(canonical_tools)='array');

-- Stable child keys make the controlled importer repeatable without deleting
-- operational history or recreating canonical child records on every run.
alter table public.project_deliverables add column if not exists canonical_item_key text;
create unique index if not exists project_deliverables_canonical_item_uidx
  on public.project_deliverables(project_id,canonical_item_key);

alter table public.project_success_criteria add column if not exists canonical_item_key text;
create unique index if not exists project_success_criteria_canonical_item_uidx
  on public.project_success_criteria(project_id,canonical_item_key);

alter table public.project_roles add column if not exists canonical_role_key text;
create unique index if not exists project_roles_canonical_role_uidx
  on public.project_roles(project_id,canonical_role_key);

alter table public.project_data_sources add column if not exists canonical_source_key text;
create unique index if not exists project_data_sources_canonical_source_uidx
  on public.project_data_sources(project_id,canonical_source_key);

comment on column public.projects.canonical_project_key is 'Stable Project ID from the approved Mettelo Project Library workbook.';
comment on column public.project_deliverables.canonical_item_key is 'Deterministic workbook child key; preserves row identity across re-imports.';
comment on column public.project_success_criteria.canonical_item_key is 'Deterministic workbook child key; preserves row identity across re-imports.';
comment on column public.project_roles.canonical_role_key is 'Deterministic workbook role key; preserves role identity across re-imports.';
comment on column public.project_data_sources.canonical_source_key is 'Deterministic workbook data-source key; preserves resource identity across re-imports.';
