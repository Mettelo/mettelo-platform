-- Project Experience V2 — Phase 1 canonical content foundation.
--
-- The existing Lab schema is the execution authority. This migration does not
-- create a competing project-management system. It adds a project-level
-- definition layer to the existing brief/resource/deliverable/milestone models
-- so CREATE -> DISCOVER -> APPLY -> START -> DELIVER -> PROVE can share one
-- canonical project source.

-- ---------------------------------------------------------------------------
-- Structured challenge / decision brief
-- ---------------------------------------------------------------------------
alter table public.project_problem_briefs
  add column if not exists primary_use_case text,
  add column if not exists primary_objective text,
  add column if not exists supporting_objectives jsonb not null default '[]'::jsonb,
  add column if not exists key_questions jsonb not null default '[]'::jsonb,
  add column if not exists in_scope jsonb not null default '[]'::jsonb,
  add column if not exists out_of_scope jsonb not null default '[]'::jsonb;

alter table public.project_problem_briefs drop constraint if exists project_problem_briefs_supporting_objectives_array;
alter table public.project_problem_briefs add constraint project_problem_briefs_supporting_objectives_array check (jsonb_typeof(supporting_objectives)='array');
alter table public.project_problem_briefs drop constraint if exists project_problem_briefs_key_questions_array;
alter table public.project_problem_briefs add constraint project_problem_briefs_key_questions_array check (jsonb_typeof(key_questions)='array');
alter table public.project_problem_briefs drop constraint if exists project_problem_briefs_in_scope_array;
alter table public.project_problem_briefs add constraint project_problem_briefs_in_scope_array check (jsonb_typeof(in_scope)='array');
alter table public.project_problem_briefs drop constraint if exists project_problem_briefs_out_of_scope_array;
alter table public.project_problem_briefs add constraint project_problem_briefs_out_of_scope_array check (jsonb_typeof(out_of_scope)='array');

-- ---------------------------------------------------------------------------
-- Role definition extensions. Capacity/application lifecycle remains in the
-- existing project_roles + project_applications model.
-- ---------------------------------------------------------------------------
alter table public.project_roles
  add column if not exists responsibilities jsonb not null default '[]'::jsonb,
  add column if not exists recommended_skills jsonb not null default '[]'::jsonb,
  add column if not exists experience_expectation text,
  add column if not exists weekly_commitment text,
  add column if not exists role_status text not null default 'open',
  add column if not exists application_requirements text;

alter table public.project_roles drop constraint if exists project_roles_responsibilities_array;
alter table public.project_roles add constraint project_roles_responsibilities_array check (jsonb_typeof(responsibilities)='array');
alter table public.project_roles drop constraint if exists project_roles_recommended_skills_array;
alter table public.project_roles add constraint project_roles_recommended_skills_array check (jsonb_typeof(recommended_skills)='array');
alter table public.project_roles drop constraint if exists project_roles_role_status_check;
alter table public.project_roles add constraint project_roles_role_status_check check (role_status in ('open','limited','closed','filled'));

-- ---------------------------------------------------------------------------
-- Canonical project resources.
--
-- Existing project_data_sources were run-only. A NULL run now means the
-- canonical project resource definition. Run-specific rows continue to work
-- unchanged. Public Project Detail must still explicitly require both
-- sensitivity='public' AND publish_policy='permitted'.
-- ---------------------------------------------------------------------------
alter table public.project_data_sources alter column project_run_id drop not null;

alter table public.project_data_sources
  add column if not exists provider_name text,
  add column if not exists provider_url text,
  add column if not exists licence_name text,
  add column if not exists licence_url text,
  add column if not exists required_subset text,
  add column if not exists approximate_size text,
  add column if not exists retention_policy text not null default 'unknown',
  add column if not exists internal_storage_policy text not null default 'unknown',
  add column if not exists internal_storage_url text,
  add column if not exists governance_status text not null default 'unreviewed',
  add column if not exists governance_verified_at timestamptz,
  add column if not exists governance_verified_by uuid references auth.users(id) on delete set null;

alter table public.project_data_sources drop constraint if exists project_data_sources_provider_url_check;
alter table public.project_data_sources add constraint project_data_sources_provider_url_check check (provider_url is null or provider_url ~* '^https://');
alter table public.project_data_sources drop constraint if exists project_data_sources_licence_url_check;
alter table public.project_data_sources add constraint project_data_sources_licence_url_check check (licence_url is null or licence_url ~* '^https://');
alter table public.project_data_sources drop constraint if exists project_data_sources_internal_storage_url_check;
alter table public.project_data_sources add constraint project_data_sources_internal_storage_url_check check (internal_storage_url is null or internal_storage_url ~* '^https://');
alter table public.project_data_sources drop constraint if exists project_data_sources_retention_policy_check;
alter table public.project_data_sources add constraint project_data_sources_retention_policy_check check (retention_policy in ('permitted','restricted','not_permitted','unknown'));
alter table public.project_data_sources drop constraint if exists project_data_sources_internal_storage_policy_check;
alter table public.project_data_sources add constraint project_data_sources_internal_storage_policy_check check (internal_storage_policy in ('permitted','restricted','not_permitted','unknown'));
alter table public.project_data_sources drop constraint if exists project_data_sources_governance_status_check;
alter table public.project_data_sources add constraint project_data_sources_governance_status_check check (governance_status in ('unreviewed','verification_required','amber','green','red'));

create table if not exists public.project_data_source_governance_reviews (
  id uuid primary key default gen_random_uuid(),
  data_source_id uuid not null references public.project_data_sources(id) on delete cascade,
  decision text not null check (decision in ('verification_required','amber','green','red')),
  notes text,
  evidence_url text check (evidence_url is null or evidence_url ~* '^https://'),
  reviewer_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists project_data_source_governance_reviews_source_idx on public.project_data_source_governance_reviews(data_source_id,created_at desc);
alter table public.project_data_source_governance_reviews enable row level security;
drop policy if exists "admins read project data governance reviews" on public.project_data_source_governance_reviews;
create policy "admins read project data governance reviews" on public.project_data_source_governance_reviews for select to authenticated using (coalesce((select auth.jwt()->'app_metadata'->>'role'),'')='admin');
drop policy if exists "admins manage project data governance reviews" on public.project_data_source_governance_reviews;
create policy "admins manage project data governance reviews" on public.project_data_source_governance_reviews for all to authenticated using (coalesce((select auth.jwt()->'app_metadata'->>'role'),'')='admin') with check (coalesce((select auth.jwt()->'app_metadata'->>'role'),'')='admin');
grant select,insert,update,delete on public.project_data_source_governance_reviews to authenticated;

-- Accepted team members can read the canonical resource definitions for their
-- project. Existing run-member access remains unchanged for run-scoped rows.
drop policy if exists "run members read data sources" on public.project_data_sources;
create policy "project members read data sources" on public.project_data_sources for select to authenticated using (
  (project_run_id is not null and public.mettelo_is_run_member(project_run_id))
  or (
    project_run_id is null and (
      exists(select 1 from public.project_members pm where pm.project_id=project_data_sources.project_id and pm.user_id=(select auth.uid()) and pm.membership_status in ('active','completed'))
      or coalesce((select auth.jwt()->'app_metadata'->>'role'),'')='admin'
    )
  )
);

-- ---------------------------------------------------------------------------
-- Canonical deliverable definitions.
--
-- NULL project_run_id is the reusable expected-output definition. Run-specific
-- deliverables remain independent execution instances with their own owner,
-- reviewer and status. This preserves multi-run history without copying the
-- public/member project brief into separate content stores.
-- ---------------------------------------------------------------------------
alter table public.project_deliverables alter column project_run_id drop not null;
alter table public.project_deliverables
  add column if not exists public_summary text,
  add column if not exists expected_format text,
  add column if not exists sort_order integer not null default 0;
create index if not exists project_deliverables_project_template_idx on public.project_deliverables(project_id,sort_order,id) where project_run_id is null;

drop policy if exists "run members read deliverables" on public.project_deliverables;
create policy "project members read deliverables" on public.project_deliverables for select to authenticated using (
  (project_run_id is not null and public.mettelo_is_run_member(project_run_id))
  or (
    project_run_id is null and (
      exists(select 1 from public.project_members pm where pm.project_id=project_deliverables.project_id and pm.user_id=(select auth.uid()) and pm.membership_status in ('active','completed'))
      or coalesce((select auth.jwt()->'app_metadata'->>'role'),'')='admin'
    )
  )
);

-- ---------------------------------------------------------------------------
-- Ordered project-level success criteria. Execution acceptance criteria remain
-- on tasks/deliverables and are not duplicated here.
-- ---------------------------------------------------------------------------
create table if not exists public.project_success_criteria (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  measurement text,
  is_required boolean not null default true,
  visibility text not null default 'public' check (visibility in ('public','member','team','admin')),
  sort_order integer not null default 0,
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists project_success_criteria_project_order_idx on public.project_success_criteria(project_id,sort_order,id);
alter table public.project_success_criteria enable row level security;
drop policy if exists "project members read success criteria" on public.project_success_criteria;
create policy "project members read success criteria" on public.project_success_criteria for select to authenticated using (
  visibility in ('public','member')
  or exists(select 1 from public.project_members pm where pm.project_id=project_success_criteria.project_id and pm.user_id=(select auth.uid()) and pm.membership_status in ('active','completed'))
  or coalesce((select auth.jwt()->'app_metadata'->>'role'),'')='admin'
);
drop policy if exists "admins manage success criteria" on public.project_success_criteria;
create policy "admins manage success criteria" on public.project_success_criteria for all to authenticated using (coalesce((select auth.jwt()->'app_metadata'->>'role'),'')='admin') with check (coalesce((select auth.jwt()->'app_metadata'->>'role'),'')='admin');
grant select on public.project_success_criteria to authenticated;
grant insert,update,delete on public.project_success_criteria to authenticated;

-- ---------------------------------------------------------------------------
-- Timeline presentation metadata on the existing project milestone entity.
-- ---------------------------------------------------------------------------
alter table public.project_milestones
  add column if not exists week_start integer,
  add column if not exists week_end integer,
  add column if not exists expected_output text;
alter table public.project_milestones drop constraint if exists project_milestones_week_start_check;
alter table public.project_milestones add constraint project_milestones_week_start_check check (week_start is null or week_start >= 1);
alter table public.project_milestones drop constraint if exists project_milestones_week_end_check;
alter table public.project_milestones add constraint project_milestones_week_end_check check (week_end is null or week_end >= coalesce(week_start,1));

-- ---------------------------------------------------------------------------
-- Non-enforcing Phase 1 completeness view. Publication enforcement is added in
-- the Admin/Project Architect phase after legacy projects have been enriched.
-- ---------------------------------------------------------------------------
create or replace view public.project_experience_readiness
with (security_invoker=true)
as
select
  p.id as project_id,
  p.slug,
  p.title,
  (
    nullif(btrim(coalesce(p.title,'')),'') is not null
    and nullif(btrim(coalesce(p.summary,'')),'') is not null
    and nullif(btrim(coalesce(p.problem_statement,'')),'') is not null
    and nullif(btrim(coalesce(pb.context,'')),'') is not null
    and nullif(btrim(coalesce(pb.stakeholder,'')),'') is not null
    and nullif(btrim(coalesce(pb.expected_outcome,'')),'') is not null
    and exists(select 1 from public.project_roles r where r.project_id=p.id)
  ) as experience_ready,
  array_remove(array[
    case when nullif(btrim(coalesce(p.title,'')),'') is null then 'title' end,
    case when nullif(btrim(coalesce(p.summary,'')),'') is null then 'summary' end,
    case when nullif(btrim(coalesce(p.problem_statement,'')),'') is null then 'problem_statement' end,
    case when pb.project_id is null or nullif(btrim(coalesce(pb.context,'')),'') is null then 'business_context' end,
    case when pb.project_id is null or nullif(btrim(coalesce(pb.stakeholder,'')),'') is null then 'stakeholder' end,
    case when pb.project_id is null or nullif(btrim(coalesce(pb.expected_outcome,'')),'') is null then 'expected_outcome' end,
    case when not exists(select 1 from public.project_roles r where r.project_id=p.id) then 'roles' end
  ],null)::text[] as missing_requirements
from public.projects p
left join public.project_problem_briefs pb on pb.project_id=p.id;

grant select on public.project_experience_readiness to authenticated;
grant select on public.project_experience_readiness to service_role;
