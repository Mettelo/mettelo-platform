begin;

create or replace function public.get_public_project_experience_detail(p_project_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
    when not exists (
      select 1
      from public.projects p
      where p.id = p_project_id
        and p.visibility = 'public'
        and p.status in ('pilot','recruiting','open','forming','active','review','completed')
    ) then null
    else jsonb_build_object(
      'deliverables', coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'title',d.title,'deliverable_type',d.deliverable_type,'acceptance_criteria',d.acceptance_criteria,'public_summary',d.public_summary,'expected_format',d.expected_format,'is_required',d.is_required) order by d.sort_order,d.created_at) from public.project_deliverables d where d.project_id=p_project_id and d.project_run_id is null and d.status<>'cancelled'),'[]'::jsonb),
      'data_sources', coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'name',s.name,'description',s.description,'source_type',s.source_type,'provider_name',s.provider_name,'licence_name',s.licence_name,'required_subset',s.required_subset,'approximate_size',s.approximate_size,'data_period',s.data_period,'data_format',s.data_format,'known_limitations',s.known_limitations,'provenance',s.provenance) order by s.created_at) from public.project_data_sources s where s.project_id=p_project_id and s.project_run_id is null and s.sensitivity='public' and s.publish_policy='permitted' and s.governance_status='green'),'[]'::jsonb),
      'success_criteria', coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'title',c.title,'description',c.description,'measurement',c.measurement,'is_required',c.is_required) order by c.sort_order,c.created_at) from public.project_success_criteria c where c.project_id=p_project_id and c.visibility='public'),'[]'::jsonb),
      'capabilities', coalesce((select jsonb_agg(jsonb_build_object('name',capability.name,'type',capability.capability_type,'importance',pc.importance,'evidence_expected',pc.evidence_expected) order by capability.name) from public.project_capabilities pc join public.capabilities capability on capability.id=pc.capability_id where pc.project_id=p_project_id),'[]'::jsonb),
      'path_contexts', coalesce((select jsonb_agg(jsonb_build_object('path_name',path.name,'path_slug',path.slug,'stage_name',stage.name,'position',placement.position,'competency_focus',placement.competency_focus,'capability_built',placement.capability_built,'path_outcome',placement.path_outcome) order by placement.position) from public.capability_path_projects placement join public.capability_paths path on path.id=placement.path_id and path.status='published' left join public.capability_path_stages stage on stage.id=placement.stage_id where placement.project_id=p_project_id),'[]'::jsonb),
      'import_origin', (select jsonb_build_object('normalized',jsonb_build_object('technical_skills',import_row.normalized->'technical_skills','professional_skills',import_row.normalized->'professional_skills','tools',import_row.normalized->'tools','methods',import_row.normalized->'methods','domain',import_row.normalized->'domain')) from public.capability_path_import_project_origins origin left join public.capability_path_import_rows import_row on import_row.batch_id=origin.batch_id and import_row.row_kind='project' and import_row.source_key=origin.source_project_key where origin.project_id=p_project_id order by origin.created_at desc limit 1),
      'brief', (select jsonb_build_object('context',b.context,'stakeholder',b.stakeholder,'primary_use_case',b.primary_use_case,'primary_objective',b.primary_objective,'supporting_objectives',b.supporting_objectives,'key_questions',b.key_questions,'in_scope',b.in_scope,'out_of_scope',b.out_of_scope,'success_metrics',b.success_metrics,'decision_to_support',b.decision_to_support,'constraints_trade_offs',b.constraints_trade_offs,'explicit_assumptions',b.explicit_assumptions,'acceptance_quality_checks',b.acceptance_quality_checks,'responsible_use_risks',b.responsible_use_risks,'evidence_expectations',b.evidence_expectations,'technical_skills',b.technical_skills,'professional_skills',b.professional_skills,'canonical_methods',b.canonical_methods,'canonical_tools',b.canonical_tools,'stakeholder_handover',b.stakeholder_handover,'capability_outcome',b.capability_outcome) from public.project_problem_briefs b where b.project_id=p_project_id limit 1),
      'milestones', coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'title',m.title,'description',m.description,'week_start',m.week_start,'week_end',m.week_end,'expected_output',m.expected_output) order by m.sort_order,m.created_at) from public.project_milestones m where m.project_id=p_project_id and m.project_run_id is null),'[]'::jsonb),
      'role_details', coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'responsibilities',r.responsibilities,'recommended_skills',r.recommended_skills,'experience_expectation',r.experience_expectation,'weekly_commitment',r.weekly_commitment) order by r.created_at) from public.project_roles r where r.project_id=p_project_id),'[]'::jsonb)
    )
  end;
$$;

revoke all on function public.get_public_project_experience_detail(uuid) from public;
grant execute on function public.get_public_project_experience_detail(uuid) to anon, authenticated;

comment on function public.get_public_project_experience_detail(uuid) is 'Phase 4 public-safe Project Experience projection. Returns only whitelisted public project detail. Internal import keys, resource governance administration, retention decisions, protected URLs/storage/access/review evidence, detailed application requirements, role workflow state and run-scoped execution data are deliberately excluded.';

commit;
