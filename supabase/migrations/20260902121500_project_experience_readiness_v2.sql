-- Project Experience V2 — differentiated completeness/readiness model.
--
-- A single boolean is not enough for Project Architect/Admin review. The review
-- surface needs to distinguish critical missing content, quality gaps, resource
-- verification work, publication blockers and Lab configuration readiness.
-- This remains an additive/read-only projection; lifecycle enforcement stays in
-- the existing Project Architect governance service.

create or replace view public.project_experience_readiness
with (security_invoker=true)
as
with assessed as (
  select
    p.id as project_id,
    p.slug,
    p.title,
    array_remove(array[
      case when nullif(btrim(coalesce(p.title,'')),'') is null then 'title' end,
      case when nullif(btrim(coalesce(p.summary,'')),'') is null then 'summary' end,
      case when nullif(btrim(coalesce(p.problem_statement,'')),'') is null then 'problem_statement' end,
      case when pb.project_id is null or nullif(btrim(coalesce(pb.context,'')),'') is null then 'business_context' end,
      case when pb.project_id is null or nullif(btrim(coalesce(pb.stakeholder,'')),'') is null then 'stakeholder' end,
      case when pb.project_id is null or nullif(btrim(coalesce(pb.expected_outcome,'')),'') is null then 'expected_outcome' end,
      case when not exists(select 1 from public.project_roles r where r.project_id=p.id and coalesce(r.role_status,'open') in ('open','limited')) then 'roles' end,
      case when not exists(select 1 from public.project_deliverables d where d.project_id=p.id and d.project_run_id is null and d.is_required) then 'deliverables' end,
      case when not exists(select 1 from public.project_success_criteria sc where sc.project_id=p.id and sc.is_required) then 'success_criteria' end
    ],null)::text[] as critical_missing,
    array_remove(array[
      case when pb.project_id is null or nullif(btrim(coalesce(pb.primary_use_case,'')),'') is null then 'primary_use_case' end,
      case when pb.project_id is null or nullif(btrim(coalesce(pb.primary_objective,'')),'') is null then 'primary_objective' end,
      case when not exists(select 1 from public.project_milestones m where m.project_id=p.id and m.project_run_id is null) then 'timeline' end,
      case when not exists(select 1 from public.project_capabilities pc where pc.project_id=p.id) then 'capabilities' end,
      case when not exists(select 1 from public.project_capabilities pc where pc.project_id=p.id and pc.evidence_expected) then 'evidence_expectations' end
    ],null)::text[] as quality_gaps,
    coalesce((
      select array_agg(
        concat('resource:',ds.id::text,':',coalesce(nullif(btrim(ds.name),''),'unnamed'),':',ds.governance_status)
        order by ds.created_at,ds.id
      )
      from public.project_data_sources ds
      where ds.project_id=p.id
        and ds.project_run_id is null
        and ds.governance_status in ('unreviewed','verification_required','amber')
    ),'{}'::text[]) as verification_required,
    coalesce((
      select array_agg(
        concat('resource:',ds.id::text,':',coalesce(nullif(btrim(ds.name),''),'unnamed'),':red')
        order by ds.created_at,ds.id
      )
      from public.project_data_sources ds
      where ds.project_id=p.id
        and ds.project_run_id is null
        and ds.governance_status='red'
    ),'{}'::text[]) as red_resource_blockers,
    array_remove(array[
      case when pb.project_id is null then 'project_brief' end,
      case when not exists(select 1 from public.project_deliverables d where d.project_id=p.id and d.project_run_id is null and d.is_required) then 'deliverables' end,
      case when not exists(select 1 from public.project_success_criteria sc where sc.project_id=p.id and sc.is_required) then 'success_criteria' end,
      case when not exists(select 1 from public.project_milestones m where m.project_id=p.id and m.project_run_id is null) then 'timeline' end
    ],null)::text[] as lab_missing
  from public.projects p
  left join public.project_problem_briefs pb on pb.project_id=p.id
)
select
  project_id,
  slug,
  title,
  cardinality(critical_missing)=0 as experience_ready,
  critical_missing as missing_requirements,
  critical_missing,
  quality_gaps,
  verification_required,
  red_resource_blockers,
  critical_missing || verification_required || red_resource_blockers as publication_blockers,
  lab_missing,
  cardinality(critical_missing)=0 as public_detail_ready,
  cardinality(critical_missing)=0 as application_ready,
  cardinality(verification_required)=0 and cardinality(red_resource_blockers)=0 as resource_governance_ready,
  cardinality(critical_missing)=0
    and cardinality(verification_required)=0
    and cardinality(red_resource_blockers)=0 as publication_ready,
  cardinality(lab_missing)=0 as lab_ready
from assessed;

grant select on public.project_experience_readiness to authenticated;
grant select on public.project_experience_readiness to service_role;
