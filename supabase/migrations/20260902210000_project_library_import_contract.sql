-- Mettelo Project Library: canonical workbook import contract.
-- Upgrades the current production Project Experience schema in place; no parallel project system.

alter table public.projects
  add column if not exists canonical_project_key text;
create unique index if not exists projects_canonical_project_key_uidx
  on public.projects(canonical_project_key)
  where canonical_project_key is not null;

-- Production currently has the original compact brief. Add the canonical planning
-- fields required by Public/Member Project Detail and the authorised Mettelo Lab.
alter table public.project_problem_briefs
  add column if not exists primary_use_case text,
  add column if not exists primary_objective text,
  add column if not exists supporting_objectives jsonb not null default '[]'::jsonb,
  add column if not exists key_questions jsonb not null default '[]'::jsonb,
  add column if not exists in_scope jsonb not null default '[]'::jsonb,
  add column if not exists out_of_scope jsonb not null default '[]'::jsonb,
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

alter table public.project_problem_briefs drop constraint if exists project_problem_briefs_supporting_objectives_array;
alter table public.project_problem_briefs add constraint project_problem_briefs_supporting_objectives_array check (jsonb_typeof(supporting_objectives)='array');
alter table public.project_problem_briefs drop constraint if exists project_problem_briefs_key_questions_array;
alter table public.project_problem_briefs add constraint project_problem_briefs_key_questions_array check (jsonb_typeof(key_questions)='array');
alter table public.project_problem_briefs drop constraint if exists project_problem_briefs_in_scope_array;
alter table public.project_problem_briefs add constraint project_problem_briefs_in_scope_array check (jsonb_typeof(in_scope)='array');
alter table public.project_problem_briefs drop constraint if exists project_problem_briefs_out_of_scope_array;
alter table public.project_problem_briefs add constraint project_problem_briefs_out_of_scope_array check (jsonb_typeof(out_of_scope)='array');
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

-- Enrich existing deliverables without changing their UUIDs or operational state.
alter table public.project_deliverables
  add column if not exists public_summary text,
  add column if not exists expected_format text,
  add column if not exists sort_order integer not null default 0,
  add column if not exists canonical_item_key text;
create unique index if not exists project_deliverables_canonical_item_uidx
  on public.project_deliverables(project_id,canonical_item_key)
  where canonical_item_key is not null;

-- Production does not yet have a canonical success-criteria table. Clean/local
-- migration histories may already contain the earlier Project Experience V2
-- version, so create the table when absent and then add every canonical column
-- idempotently before creating indexes.
create table if not exists public.project_success_criteria (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  measurement text,
  is_required boolean not null default true,
  visibility text not null default 'public',
  sort_order integer not null default 0,
  canonical_item_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.project_success_criteria
  add column if not exists description text,
  add column if not exists measurement text,
  add column if not exists is_required boolean not null default true,
  add column if not exists visibility text not null default 'public',
  add column if not exists sort_order integer not null default 0,
  add column if not exists canonical_item_key text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();
create unique index if not exists project_success_criteria_canonical_item_uidx
  on public.project_success_criteria(project_id,canonical_item_key)
  where canonical_item_key is not null;
create index if not exists project_success_criteria_project_sort_idx
  on public.project_success_criteria(project_id,sort_order,created_at);
alter table public.project_success_criteria enable row level security;
grant select, insert, update, delete on table public.project_success_criteria to service_role;

-- Preserve existing role identity/status; add canonical planning metadata in place.
alter table public.project_roles
  add column if not exists responsibilities jsonb not null default '[]'::jsonb,
  add column if not exists recommended_skills text[] not null default '{}'::text[],
  add column if not exists weekly_commitment text,
  add column if not exists role_status text not null default 'open',
  add column if not exists canonical_role_key text;
alter table public.project_roles drop constraint if exists project_roles_responsibilities_array;
alter table public.project_roles add constraint project_roles_responsibilities_array check (jsonb_typeof(responsibilities)='array');
create unique index if not exists project_roles_canonical_role_uidx
  on public.project_roles(project_id,canonical_role_key)
  where canonical_role_key is not null;

-- Resource governance is explicit. Direct URLs remain in this protected table and
-- are projected only by authorised Lab code; discovery loaders do not select them.
alter table public.project_data_sources
  add column if not exists provider_name text,
  add column if not exists licence_name text,
  add column if not exists required_subset text,
  add column if not exists approximate_size text,
  add column if not exists provenance text,
  add column if not exists publish_policy text not null default 'restricted',
  add column if not exists governance_status text not null default 'unreviewed',
  add column if not exists governance_verified_at timestamptz,
  add column if not exists retention_policy text,
  add column if not exists internal_storage_policy text,
  add column if not exists internal_storage_url text,
  add column if not exists canonical_source_key text;
create unique index if not exists project_data_sources_canonical_source_uidx
  on public.project_data_sources(project_id,canonical_source_key)
  where canonical_source_key is not null;

comment on column public.projects.canonical_project_key is 'Stable Project ID from the approved Mettelo Project Library workbook.';
comment on column public.project_deliverables.canonical_item_key is 'Deterministic workbook child key; preserves row identity across re-imports.';
comment on column public.project_success_criteria.canonical_item_key is 'Deterministic workbook child key; preserves row identity across re-imports.';
comment on column public.project_roles.canonical_role_key is 'Deterministic workbook role key; preserves role identity across re-imports.';
comment on column public.project_data_sources.canonical_source_key is 'Deterministic workbook data-source key; preserves resource identity across re-imports.';