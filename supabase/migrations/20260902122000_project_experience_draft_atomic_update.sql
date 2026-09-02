-- Project Experience V2 Phase 4: atomic canonical draft revision.
-- The HTTP route validates authorisation/input. This service-role-only function owns
-- persistence so a child-record failure cannot leave a half-updated project definition.

create or replace function public.apply_project_experience_draft_update(
  target_project_id uuid,
  actor_user_id uuid,
  payload jsonb,
  target_risk_level text,
  target_risk_reasons text[],
  target_admin_review_required boolean
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  resource_record record;
  deliverable_record record;
  criterion_record record;
  milestone_record record;
  role_record record;
  capability_record record;
  current_resource public.project_data_sources%rowtype;
  resource_changed boolean;
  resource_reviewed boolean;
  now_at timestamptz := now();
begin
  if not exists(select 1 from public.projects p where p.id=target_project_id and p.governance_status in ('draft','changes_requested')) then
    raise exception 'PROJECT_NOT_EDITABLE';
  end if;

  if exists(
    select 1 from public.project_data_sources ds
    where ds.project_id=target_project_id and ds.project_run_id is null
      and not exists(
        select 1 from jsonb_to_recordset(coalesce(payload->'resources','[]'::jsonb)) as incoming(id uuid)
        where incoming.id=ds.id
      )
      and (ds.governance_status<>'unreviewed' or exists(select 1 from public.project_data_source_governance_reviews gr where gr.data_source_id=ds.id))
  ) then raise exception 'REVIEWED_RESOURCE_REMOVAL_BLOCKED'; end if;

  update public.projects set
    title=payload->>'title',summary=payload->>'summary',problem_statement=payload->'brief'->>'primary_question',project_archetype=payload->>'project_archetype',
    project_type=case when coalesce((payload->>'partner_project')::boolean,false) then 'partner' else 'open' end,
    partner_name=nullif(payload->>'partner_name',''),location=coalesce(nullif(payload->>'location',''),'Remote'),difficulty_level=nullif(payload->>'difficulty_level',''),
    duration_weeks=nullif(payload->>'duration_weeks','')::integer,weekly_commitment=nullif(payload->>'weekly_commitment',''),team_size_threshold=coalesce(nullif(payload->>'team_size_threshold','')::integer,5),
    presentation_required=coalesce((payload->>'presentation_required')::boolean,false),risk_level=target_risk_level,risk_reasons=target_risk_reasons,admin_review_required=target_admin_review_required,updated_at=now_at
  where id=target_project_id;

  insert into public.project_problem_briefs(project_id,context,stakeholder,primary_question,expected_outcome,success_metrics,constraints,ethics_considerations,primary_use_case,primary_objective,supporting_objectives,key_questions,in_scope,out_of_scope,updated_by,updated_at)
  values(target_project_id,coalesce(payload->'brief'->>'context',''),coalesce(payload->'brief'->>'stakeholder',''),coalesce(payload->'brief'->>'primary_question',''),coalesce(payload->'brief'->>'expected_outcome',''),coalesce(payload->'brief'->>'success_metrics',''),coalesce(payload->'brief'->>'constraints',''),coalesce(payload->'brief'->>'ethics_considerations',''),nullif(payload->'brief'->>'primary_use_case',''),nullif(payload->'brief'->>'primary_objective',''),coalesce(payload->'brief'->'supporting_objectives','[]'::jsonb),coalesce(payload->'brief'->'key_questions','[]'::jsonb),coalesce(payload->'brief'->'in_scope','[]'::jsonb),coalesce(payload->'brief'->'out_of_scope','[]'::jsonb),actor_user_id,now_at)
  on conflict(project_id) do update set context=excluded.context,stakeholder=excluded.stakeholder,primary_question=excluded.primary_question,expected_outcome=excluded.expected_outcome,success_metrics=excluded.success_metrics,constraints=excluded.constraints,ethics_considerations=excluded.ethics_considerations,primary_use_case=excluded.primary_use_case,primary_objective=excluded.primary_objective,supporting_objectives=excluded.supporting_objectives,key_questions=excluded.key_questions,in_scope=excluded.in_scope,out_of_scope=excluded.out_of_scope,updated_by=excluded.updated_by,updated_at=excluded.updated_at;

  for resource_record in select * from jsonb_to_recordset(coalesce(payload->'resources','[]'::jsonb)) as r(id uuid,name text,description text,source_type text,external_url text,provider_id uuid,provider_name text,provider_url text,licence_name text,licence_url text,required_subset text,approximate_size text,data_period text,data_format text,unit_of_observation text,known_limitations text,provenance text,sensitivity text)
  loop
    if resource_record.id is null then
      insert into public.project_data_sources(project_id,project_run_id,name,description,source_type,external_url,provider_id,provider_name,provider_url,licence_name,licence_url,required_subset,approximate_size,data_period,data_format,unit_of_observation,known_limitations,provenance,sensitivity,owner_user_id,access_status,quality_status,download_policy,publish_policy,retention_policy,internal_storage_policy,governance_status,added_by)
      values(target_project_id,null,resource_record.name,resource_record.description,resource_record.source_type,resource_record.external_url,resource_record.provider_id,resource_record.provider_name,resource_record.provider_url,resource_record.licence_name,resource_record.licence_url,resource_record.required_subset,resource_record.approximate_size,resource_record.data_period,resource_record.data_format,resource_record.unit_of_observation,resource_record.known_limitations,resource_record.provenance,resource_record.sensitivity,null,'needs_access','unreviewed','team_only','not_permitted','unknown','unknown','unreviewed',actor_user_id);
    else
      select * into current_resource from public.project_data_sources ds where ds.id=resource_record.id and ds.project_id=target_project_id and ds.project_run_id is null;
      if not found then raise exception 'RESOURCE_NOT_IN_PROJECT'; end if;
      resource_changed := current_resource.name is distinct from resource_record.name or current_resource.description is distinct from resource_record.description or current_resource.source_type is distinct from resource_record.source_type or current_resource.external_url is distinct from resource_record.external_url or current_resource.provider_id is distinct from resource_record.provider_id or current_resource.provider_name is distinct from resource_record.provider_name or current_resource.provider_url is distinct from resource_record.provider_url or current_resource.licence_name is distinct from resource_record.licence_name or current_resource.licence_url is distinct from resource_record.licence_url or current_resource.required_subset is distinct from resource_record.required_subset or current_resource.approximate_size is distinct from resource_record.approximate_size or current_resource.data_period is distinct from resource_record.data_period or current_resource.data_format is distinct from resource_record.data_format or current_resource.unit_of_observation is distinct from resource_record.unit_of_observation or current_resource.known_limitations is distinct from resource_record.known_limitations or current_resource.provenance is distinct from resource_record.provenance or current_resource.sensitivity is distinct from resource_record.sensitivity;
      if resource_changed and current_resource.governance_status='green' then raise exception 'GREEN_RESOURCE_EDIT_BLOCKED'; end if;
      if resource_changed then
        select exists(select 1 from public.project_data_source_governance_reviews gr where gr.data_source_id=resource_record.id) into resource_reviewed;
        update public.project_data_sources set name=resource_record.name,description=resource_record.description,source_type=resource_record.source_type,external_url=resource_record.external_url,provider_id=resource_record.provider_id,provider_name=resource_record.provider_name,provider_url=resource_record.provider_url,licence_name=resource_record.licence_name,licence_url=resource_record.licence_url,required_subset=resource_record.required_subset,approximate_size=resource_record.approximate_size,data_period=resource_record.data_period,data_format=resource_record.data_format,unit_of_observation=resource_record.unit_of_observation,known_limitations=resource_record.known_limitations,provenance=resource_record.provenance,sensitivity=resource_record.sensitivity,governance_status=case when resource_reviewed or current_resource.governance_status<>'unreviewed' then 'unreviewed' else governance_status end,governance_verified_at=case when resource_reviewed or current_resource.governance_status<>'unreviewed' then null else governance_verified_at end,governance_verified_by=case when resource_reviewed or current_resource.governance_status<>'unreviewed' then null else governance_verified_by end,publish_policy=case when resource_reviewed or current_resource.governance_status<>'unreviewed' then 'not_permitted' else publish_policy end,quality_status=case when resource_reviewed or current_resource.governance_status<>'unreviewed' then 'unreviewed' else quality_status end,updated_at=now_at where id=resource_record.id;
      end if;
    end if;
  end loop;
  delete from public.project_data_sources ds where ds.project_id=target_project_id and ds.project_run_id is null and ds.governance_status='unreviewed' and not exists(select 1 from public.project_data_source_governance_reviews gr where gr.data_source_id=ds.id) and not exists(select 1 from jsonb_to_recordset(coalesce(payload->'resources','[]'::jsonb)) as incoming(id uuid) where incoming.id=ds.id);

  for deliverable_record in select * from jsonb_to_recordset(coalesce(payload->'deliverables','[]'::jsonb)) as d(id uuid,title text,deliverable_type text,acceptance_criteria text,public_summary text,expected_format text,is_required boolean,sort_order integer)
  loop
    if deliverable_record.id is null then insert into public.project_deliverables(project_id,project_run_id,workstream_id,title,deliverable_type,acceptance_criteria,public_summary,expected_format,is_required,sort_order,status,created_by) values(target_project_id,null,null,deliverable_record.title,deliverable_record.deliverable_type,deliverable_record.acceptance_criteria,deliverable_record.public_summary,deliverable_record.expected_format,coalesce(deliverable_record.is_required,true),coalesce(deliverable_record.sort_order,0),'planned',actor_user_id);
    else update public.project_deliverables set title=deliverable_record.title,deliverable_type=deliverable_record.deliverable_type,acceptance_criteria=deliverable_record.acceptance_criteria,public_summary=deliverable_record.public_summary,expected_format=deliverable_record.expected_format,is_required=coalesce(deliverable_record.is_required,true),sort_order=coalesce(deliverable_record.sort_order,0),updated_at=now_at where id=deliverable_record.id and project_id=target_project_id and project_run_id is null; if not found then raise exception 'DELIVERABLE_NOT_IN_PROJECT'; end if; end if;
  end loop;
  delete from public.project_deliverables d where d.project_id=target_project_id and d.project_run_id is null and not exists(select 1 from jsonb_to_recordset(coalesce(payload->'deliverables','[]'::jsonb)) as incoming(id uuid) where incoming.id=d.id);

  for criterion_record in select * from jsonb_to_recordset(coalesce(payload->'success_criteria','[]'::jsonb)) as c(id uuid,title text,description text,measurement text,is_required boolean,visibility text,sort_order integer)
  loop
    if criterion_record.id is null then insert into public.project_success_criteria(project_id,title,description,measurement,is_required,visibility,sort_order,created_by_user_id) values(target_project_id,criterion_record.title,criterion_record.description,criterion_record.measurement,coalesce(criterion_record.is_required,true),coalesce(criterion_record.visibility,'public'),coalesce(criterion_record.sort_order,0),actor_user_id);
    else update public.project_success_criteria set title=criterion_record.title,description=criterion_record.description,measurement=criterion_record.measurement,is_required=coalesce(criterion_record.is_required,true),visibility=coalesce(criterion_record.visibility,'public'),sort_order=coalesce(criterion_record.sort_order,0),updated_at=now_at where id=criterion_record.id and project_id=target_project_id; if not found then raise exception 'SUCCESS_CRITERION_NOT_IN_PROJECT'; end if; end if;
  end loop;
  delete from public.project_success_criteria c where c.project_id=target_project_id and not exists(select 1 from jsonb_to_recordset(coalesce(payload->'success_criteria','[]'::jsonb)) as incoming(id uuid) where incoming.id=c.id);

  for milestone_record in select * from jsonb_to_recordset(coalesce(payload->'milestones','[]'::jsonb)) as m(id uuid,title text,description text,week_start integer,week_end integer,expected_output text,sort_order integer)
  loop
    if milestone_record.id is null then insert into public.project_milestones(project_id,project_run_id,title,description,week_start,week_end,expected_output,sort_order,status) values(target_project_id,null,milestone_record.title,milestone_record.description,milestone_record.week_start,milestone_record.week_end,milestone_record.expected_output,coalesce(milestone_record.sort_order,0),'planned');
    else update public.project_milestones set title=milestone_record.title,description=milestone_record.description,week_start=milestone_record.week_start,week_end=milestone_record.week_end,expected_output=milestone_record.expected_output,sort_order=coalesce(milestone_record.sort_order,0),updated_at=now_at where id=milestone_record.id and project_id=target_project_id and project_run_id is null; if not found then raise exception 'MILESTONE_NOT_IN_PROJECT'; end if; end if;
  end loop;
  delete from public.project_milestones m where m.project_id=target_project_id and m.project_run_id is null and not exists(select 1 from jsonb_to_recordset(coalesce(payload->'milestones','[]'::jsonb)) as incoming(id uuid) where incoming.id=m.id);

  for role_record in select * from jsonb_to_recordset(coalesce(payload->'roles','[]'::jsonb)) as r(id uuid,title text,discipline text,description text,openings integer,skills text[],responsibilities jsonb,recommended_skills jsonb,experience_expectation text,weekly_commitment text,application_requirements text)
  loop
    if role_record.id is null then insert into public.project_roles(project_id,title,discipline,description,openings,skills,responsibilities,recommended_skills,experience_expectation,weekly_commitment,application_requirements,role_status) values(target_project_id,role_record.title,role_record.discipline,role_record.description,coalesce(role_record.openings,1),coalesce(role_record.skills,'{}'::text[]),coalesce(role_record.responsibilities,'[]'::jsonb),coalesce(role_record.recommended_skills,'[]'::jsonb),role_record.experience_expectation,role_record.weekly_commitment,role_record.application_requirements,'open');
    else update public.project_roles set title=role_record.title,discipline=role_record.discipline,description=role_record.description,openings=coalesce(role_record.openings,1),skills=coalesce(role_record.skills,'{}'::text[]),responsibilities=coalesce(role_record.responsibilities,'[]'::jsonb),recommended_skills=coalesce(role_record.recommended_skills,'[]'::jsonb),experience_expectation=role_record.experience_expectation,weekly_commitment=role_record.weekly_commitment,application_requirements=role_record.application_requirements,role_status='open' where id=role_record.id and project_id=target_project_id; if not found then raise exception 'ROLE_NOT_IN_PROJECT'; end if; end if;
  end loop;
  update public.project_roles r set role_status='closed' where r.project_id=target_project_id and r.role_status<>'closed' and not exists(select 1 from jsonb_to_recordset(coalesce(payload->'roles','[]'::jsonb)) as incoming(id uuid) where incoming.id=r.id);

  for capability_record in select * from jsonb_to_recordset(coalesce(payload->'capabilities','[]'::jsonb)) as c(capability_id uuid,importance text,evidence_expected boolean)
  loop
    insert into public.project_capabilities(project_id,capability_id,importance,evidence_expected) values(target_project_id,capability_record.capability_id,coalesce(capability_record.importance,'core'),coalesce(capability_record.evidence_expected,false)) on conflict(project_id,capability_id) do update set importance=excluded.importance,evidence_expected=excluded.evidence_expected;
  end loop;
  delete from public.project_capabilities pc where pc.project_id=target_project_id and not exists(select 1 from jsonb_to_recordset(coalesce(payload->'capabilities','[]'::jsonb)) as incoming(capability_id uuid) where incoming.capability_id=pc.capability_id);
end;
$$;

revoke all on function public.apply_project_experience_draft_update(uuid,uuid,jsonb,text,text[],boolean) from public,anon,authenticated;
grant execute on function public.apply_project_experience_draft_update(uuid,uuid,jsonb,text,text[],boolean) to service_role,postgres;
