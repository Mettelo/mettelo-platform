create or replace function public.project_library_apply_stage_v2(p_expected_workbook_sha256 text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private_import
as $$
declare
  rec record;
  r jsonb;
  b jsonb;
  src jsonb;
  role jsonb;
  item text;
  project_uuid uuid;
  child_uuid uuid;
  staged_n int;
  backend_before_n int;
  backend_after_n int;
  canonical_after_n int;
  matched_n int := 0;
  created_n int := 0;
  project_updates_n int := 0;
  ambiguous_n int := 0;
  duplicate_targets_n int := 0;
  i int;
  key_text text;
  role_skills text[];
  run_id uuid;
  expected_keys text[];
  candidate_ids uuid[];
begin
  select count(*) into staged_n from private_import.project_library_stage;
  if staged_n <> 300 then raise exception 'Expected exactly 300 staged projects, found %', staged_n; end if;

  if exists (
    select 1 from private_import.project_library_stage
    where coalesce(payload #>> '{_manifest,workbook_sha256}', '') <> p_expected_workbook_sha256
  ) then raise exception 'Apply blocked: staged workbook hash mismatch'; end if;

  if exists (
    select 1 from private_import.project_library_stage
    where coalesce(payload->>'project_id','') <> project_key
       or coalesce(payload->>'title','') = ''
       or coalesce(payload->>'slug','') = ''
       or jsonb_typeof(payload->'deliverables') <> 'array'
       or jsonb_array_length(payload->'deliverables') = 0
       or jsonb_typeof(payload->'roles') <> 'array'
       or jsonb_array_length(payload->'roles') = 0
       or jsonb_typeof(payload->'brief') <> 'object'
       or jsonb_typeof(payload->'source') <> 'object'
       or coalesce((payload->>'team_size')::int,0) not in (1,3,4,5)
  ) then raise exception 'Apply blocked: staged payload structure invalid'; end if;

  with mapping as (
    select s.project_key,
      array(
        select distinct p.id
        from public.projects p
        where p.canonical_project_key=s.project_key
           or (p.canonical_project_key is null and p.slug=s.payload->>'slug')
           or (p.canonical_project_key is null and lower(trim(p.title))=lower(trim(s.payload->>'title')))
      ) as ids
    from private_import.project_library_stage s
  )
  select count(*) filter (where cardinality(ids)>1) into ambiguous_n from mapping;
  if ambiguous_n > 0 then raise exception 'Apply blocked: % ambiguous project matches', ambiguous_n; end if;

  with mapping as (
    select s.project_key,
      (select p.id from public.projects p
       where p.canonical_project_key=s.project_key
          or (p.canonical_project_key is null and p.slug=s.payload->>'slug')
          or (p.canonical_project_key is null and lower(trim(p.title))=lower(trim(s.payload->>'title')))
       order by (p.canonical_project_key=s.project_key) desc, (p.slug=s.payload->>'slug') desc
       limit 1) as target_id
    from private_import.project_library_stage s
  )
  select count(*) into duplicate_targets_n
  from (select target_id from mapping where target_id is not null group by target_id having count(*)>1) d;
  if duplicate_targets_n > 0 then raise exception 'Apply blocked: % duplicate target mappings', duplicate_targets_n; end if;

  select count(*) into backend_before_n from public.projects;
  insert into private_import.project_library_import_runs(mode,staged_projects,backend_before,ambiguous_projects,details)
  values('apply_v2',staged_n,backend_before_n,ambiguous_n,jsonb_build_object('workbook_sha256',p_expected_workbook_sha256))
  returning id into run_id;

  for rec in select project_key,payload from private_import.project_library_stage order by project_key loop
    r := rec.payload;
    b := r->'brief';
    src := r->'source';

    select array(
      select distinct p.id
      from public.projects p
      where p.canonical_project_key=rec.project_key
         or (p.canonical_project_key is null and p.slug=r->>'slug')
         or (p.canonical_project_key is null and lower(trim(p.title))=lower(trim(r->>'title')))
    ) into candidate_ids;

    if cardinality(candidate_ids) > 1 then raise exception 'Apply blocked during loop: ambiguous %', rec.project_key; end if;
    project_uuid := case when cardinality(candidate_ids)=1 then candidate_ids[1] else null end;

    if project_uuid is null then
      insert into public.projects(
        canonical_project_key,slug,title,summary,problem_statement,difficulty_level,
        duration_weeks,weekly_commitment,team_size_threshold,status,visibility,
        project_type,applications_open
      ) values (
        rec.project_key,r->>'slug',r->>'title',coalesce(r->>'summary',''),r->>'problem_statement',r->>'difficulty',
        nullif(r->>'duration_weeks','')::int,r->>'weekly_commitment',coalesce(nullif(r->>'team_size','')::int,5),
        'draft','private','open',false
      ) returning id into project_uuid;
      created_n := created_n + 1;
    else
      matched_n := matched_n + 1;
      update public.projects set
        canonical_project_key=rec.project_key,
        title=r->>'title',
        summary=coalesce(r->>'summary',''),
        problem_statement=r->>'problem_statement',
        difficulty_level=r->>'difficulty',
        duration_weeks=nullif(r->>'duration_weeks','')::int,
        weekly_commitment=r->>'weekly_commitment',
        team_size_threshold=coalesce(nullif(r->>'team_size','')::int,team_size_threshold),
        updated_at=now()
      where id=project_uuid
        and (canonical_project_key,title,summary,problem_statement,difficulty_level,duration_weeks,weekly_commitment,team_size_threshold)
          is distinct from
            (rec.project_key,r->>'title',coalesce(r->>'summary',''),r->>'problem_statement',r->>'difficulty',nullif(r->>'duration_weeks','')::int,r->>'weekly_commitment',coalesce(nullif(r->>'team_size','')::int,team_size_threshold));
      if found then project_updates_n := project_updates_n + 1; end if;
    end if;

    insert into public.project_problem_briefs(
      project_id,context,stakeholder,primary_question,expected_outcome,success_metrics,constraints,ethics_considerations,
      primary_use_case,primary_objective,supporting_objectives,key_questions,in_scope,out_of_scope,decision_to_support,
      constraints_trade_offs,explicit_assumptions,acceptance_quality_checks,responsible_use_risks,evidence_expectations,
      technical_skills,professional_skills,canonical_methods,canonical_tools,stakeholder_handover,capability_outcome,
      career_domain_path,target_role,path_project_number,path_stage,competency_focus,capability_built,prerequisite_prior_project,
      path_outcome,content_quality_status,director_review_note,updated_at
    ) values (
      project_uuid,coalesce(b->>'context',''),coalesce(b->>'stakeholder',''),coalesce(b->>'decision_to_support',''),
      coalesce(b->>'primary_objective',''),
      coalesce((select string_agg('- '||value,E'\n') from jsonb_array_elements_text(coalesce(b->'success_criteria','[]'::jsonb))),'') ,
      coalesce((select string_agg('- '||value,E'\n') from jsonb_array_elements_text(coalesce(b->'constraints','[]'::jsonb))),'') ,
      coalesce((select string_agg('- '||value,E'\n') from jsonb_array_elements_text(coalesce(b->'responsible_use','[]'::jsonb))),'') ,
      b->>'primary_use_case',b->>'primary_objective',coalesce(b->'supporting_objectives','[]'::jsonb),coalesce(b->'key_questions','[]'::jsonb),
      coalesce(b->'in_scope','[]'::jsonb),coalesce(b->'out_of_scope','[]'::jsonb),b->>'decision_to_support',coalesce(b->'constraints','[]'::jsonb),
      coalesce(b->'assumptions','[]'::jsonb),coalesce(b->'acceptance_checks','[]'::jsonb),coalesce(b->'responsible_use','[]'::jsonb),
      coalesce(b->'evidence','[]'::jsonb),coalesce(b->'technical_skills','[]'::jsonb),coalesce(b->'professional_skills','[]'::jsonb),
      coalesce(b->'methods','[]'::jsonb),coalesce(b->'tools','[]'::jsonb),b->>'handover',b->>'capability_outcome',
      nullif(b->>'career_domain_path',''),nullif(b->>'target_role',''),nullif(b->>'path_project_number',''),nullif(b->>'path_stage',''),
      nullif(b->>'competency_focus',''),nullif(b->>'capability_built',''),nullif(b->>'prerequisite_prior_project',''),nullif(b->>'path_outcome',''),
      nullif(b->>'content_quality_status',''),nullif(b->>'director_review_note',''),now()
    ) on conflict(project_id) do update set
      context=excluded.context,stakeholder=excluded.stakeholder,primary_question=excluded.primary_question,
      expected_outcome=excluded.expected_outcome,success_metrics=excluded.success_metrics,constraints=excluded.constraints,
      ethics_considerations=excluded.ethics_considerations,primary_use_case=excluded.primary_use_case,
      primary_objective=excluded.primary_objective,supporting_objectives=excluded.supporting_objectives,key_questions=excluded.key_questions,
      in_scope=excluded.in_scope,out_of_scope=excluded.out_of_scope,decision_to_support=excluded.decision_to_support,
      constraints_trade_offs=excluded.constraints_trade_offs,explicit_assumptions=excluded.explicit_assumptions,
      acceptance_quality_checks=excluded.acceptance_quality_checks,responsible_use_risks=excluded.responsible_use_risks,
      evidence_expectations=excluded.evidence_expectations,technical_skills=excluded.technical_skills,
      professional_skills=excluded.professional_skills,canonical_methods=excluded.canonical_methods,canonical_tools=excluded.canonical_tools,
      stakeholder_handover=excluded.stakeholder_handover,capability_outcome=excluded.capability_outcome,
      career_domain_path=excluded.career_domain_path,target_role=excluded.target_role,path_project_number=excluded.path_project_number,
      path_stage=excluded.path_stage,competency_focus=excluded.competency_focus,capability_built=excluded.capability_built,
      prerequisite_prior_project=excluded.prerequisite_prior_project,path_outcome=excluded.path_outcome,
      content_quality_status=excluded.content_quality_status,director_review_note=excluded.director_review_note,updated_at=now();

    expected_keys := '{}'::text[];
    i := 0;
    for item in select value from jsonb_array_elements_text(coalesce(r->'deliverables','[]'::jsonb)) loop
      i := i + 1; key_text := rec.project_key||':deliverable:'||lpad(i::text,3,'0'); expected_keys := array_append(expected_keys,key_text); child_uuid := null;
      select d.id into child_uuid from public.project_deliverables d
       where d.project_id=project_uuid and d.project_run_id is null
         and (d.canonical_item_key=key_text or (d.canonical_item_key is null and lower(trim(d.title))=lower(trim(left(item,180)))))
       order by (d.canonical_item_key=key_text) desc limit 1;
      if child_uuid is null then
        insert into public.project_deliverables(project_id,project_run_id,canonical_item_key,title,deliverable_type,acceptance_criteria,public_summary,is_required,status,sort_order)
        values(project_uuid,null,key_text,left(item,180),'canonical',item,item,true,'planned',i);
      else
        update public.project_deliverables set canonical_item_key=key_text,title=left(item,180),deliverable_type='canonical',acceptance_criteria=item,
          public_summary=item,is_required=true,sort_order=i,updated_at=now()
        where id=child_uuid
          and (canonical_item_key,title,deliverable_type,acceptance_criteria,public_summary,is_required,sort_order)
            is distinct from (key_text,left(item,180),'canonical',item,item,true,i);
      end if;
    end loop;
    delete from public.project_deliverables d where d.project_id=project_uuid and d.project_run_id is null and d.canonical_item_key like rec.project_key||':deliverable:%' and not (d.canonical_item_key=any(expected_keys));

    expected_keys := '{}'::text[];
    i := 0;
    for item in select value from jsonb_array_elements_text(coalesce(b->'success_criteria','[]'::jsonb)) loop
      i := i + 1; key_text := rec.project_key||':criterion:'||lpad(i::text,3,'0'); expected_keys := array_append(expected_keys,key_text); child_uuid := null;
      select c.id into child_uuid from public.project_success_criteria c
       where c.project_id=project_uuid and (c.canonical_item_key=key_text or (c.canonical_item_key is null and lower(trim(c.title))=lower(trim(left(item,180)))))
       order by (c.canonical_item_key=key_text) desc limit 1;
      if child_uuid is null then
        insert into public.project_success_criteria(project_id,canonical_item_key,title,description,is_required,visibility,sort_order)
        values(project_uuid,key_text,left(item,180),item,true,'public',i);
      else
        update public.project_success_criteria set canonical_item_key=key_text,title=left(item,180),description=item,is_required=true,visibility='public',sort_order=i,updated_at=now()
        where id=child_uuid
          and (canonical_item_key,title,description,is_required,visibility,sort_order)
            is distinct from (key_text,left(item,180),item,true,'public',i);
      end if;
    end loop;
    delete from public.project_success_criteria c where c.project_id=project_uuid and c.canonical_item_key like rec.project_key||':criterion:%' and not (c.canonical_item_key=any(expected_keys));

    select array_agg(distinct x) into role_skills from (
      select value as x from jsonb_array_elements_text(coalesce(b->'technical_skills','[]'::jsonb))
      union all select value from jsonb_array_elements_text(coalesce(b->'professional_skills','[]'::jsonb))
    ) s;
    role_skills := coalesce(role_skills,'{}'::text[]);
    expected_keys := '{}'::text[];
    i := 0;
    for role in select value from jsonb_array_elements(coalesce(r->'roles','[]'::jsonb)) loop
      i := i + 1; key_text := rec.project_key||':role:'||lpad(i::text,2,'0'); expected_keys := array_append(expected_keys,key_text); child_uuid := null;
      select pr.id into child_uuid from public.project_roles pr
       where pr.project_id=project_uuid and (pr.canonical_role_key=key_text or (pr.canonical_role_key is null and lower(trim(pr.title))=lower(trim(role->>'name'))))
       order by (pr.canonical_role_key=key_text) desc limit 1;
      if child_uuid is null then
        insert into public.project_roles(project_id,canonical_role_key,title,description,skills,openings,responsibilities,recommended_skills,weekly_commitment,role_status)
        values(project_uuid,key_text,role->>'name',nullif(role->'responsibilities'->>0,''),role_skills,coalesce(nullif(role->>'capacity','')::int,1),
          coalesce(role->'responsibilities','[]'::jsonb),role_skills,r->>'weekly_commitment','open');
      else
        update public.project_roles set canonical_role_key=key_text,title=role->>'name',description=nullif(role->'responsibilities'->>0,''),skills=role_skills,
          openings=coalesce(nullif(role->>'capacity','')::int,1),responsibilities=coalesce(role->'responsibilities','[]'::jsonb),recommended_skills=role_skills,
          weekly_commitment=r->>'weekly_commitment'
        where id=child_uuid
          and (canonical_role_key,title,description,skills,openings,responsibilities,recommended_skills,weekly_commitment)
            is distinct from (key_text,role->>'name',nullif(role->'responsibilities'->>0,''),role_skills,coalesce(nullif(role->>'capacity','')::int,1),coalesce(role->'responsibilities','[]'::jsonb),role_skills,r->>'weekly_commitment');
      end if;
    end loop;
    delete from public.project_roles pr where pr.project_id=project_uuid and pr.canonical_role_key like rec.project_key||':role:%' and not (pr.canonical_role_key=any(expected_keys));

    key_text := rec.project_key||':source:01'; child_uuid := null;
    select ds.id into child_uuid from public.project_data_sources ds
     where ds.project_id=project_uuid and ds.project_run_id is null
       and (ds.canonical_source_key=key_text or (ds.canonical_source_key is null and lower(trim(ds.name))=lower(trim(src->>'name'))))
     order by (ds.canonical_source_key=key_text) desc limit 1;
    if child_uuid is null then
      insert into public.project_data_sources(project_id,project_run_id,canonical_source_key,name,description,source_type,external_url,provider_name,licence_name,
        required_subset,provenance,sensitivity,publish_policy,governance_status,retention_policy,internal_storage_policy,may_redistribute,commercial_reuse,
        attribution_required,recommended_archive_format,preservation_action,legal_review_basis,last_classification_review,preservation_mode)
      values(project_uuid,null,key_text,src->>'name',src->>'description',src->>'source_type',src->>'external_url',src->>'provider_name',src->>'licence_name',
        src->>'required_subset',src->>'provenance',coalesce(src->>'sensitivity','public'),coalesce(src->>'publish_policy','restricted'),
        coalesce(src->>'governance_status','verification_required'),src->>'retention_policy',src->>'internal_storage_policy',coalesce((src->>'may_redistribute')::boolean,false),
        src->>'commercial_reuse',src->>'attribution_required',src->>'recommended_archive_format',src->>'preservation_action',src->>'legal_review_basis',
        src->>'last_classification_review',src->>'preservation_mode');
    else
      update public.project_data_sources set canonical_source_key=key_text,name=src->>'name',description=src->>'description',source_type=src->>'source_type',
        external_url=src->>'external_url',provider_name=src->>'provider_name',licence_name=src->>'licence_name',required_subset=src->>'required_subset',
        provenance=src->>'provenance',sensitivity=coalesce(src->>'sensitivity','public'),publish_policy=coalesce(src->>'publish_policy','restricted'),
        governance_status=coalesce(src->>'governance_status','verification_required'),retention_policy=src->>'retention_policy',
        internal_storage_policy=src->>'internal_storage_policy',may_redistribute=coalesce((src->>'may_redistribute')::boolean,false),commercial_reuse=src->>'commercial_reuse',
        attribution_required=src->>'attribution_required',recommended_archive_format=src->>'recommended_archive_format',preservation_action=src->>'preservation_action',
        legal_review_basis=src->>'legal_review_basis',last_classification_review=src->>'last_classification_review',preservation_mode=src->>'preservation_mode',updated_at=now()
      where id=child_uuid
        and (canonical_source_key,name,description,source_type,external_url,provider_name,licence_name,required_subset,provenance,sensitivity,publish_policy,governance_status,
             retention_policy,internal_storage_policy,may_redistribute,commercial_reuse,attribution_required,recommended_archive_format,preservation_action,legal_review_basis,last_classification_review,preservation_mode)
          is distinct from
            (key_text,src->>'name',src->>'description',src->>'source_type',src->>'external_url',src->>'provider_name',src->>'licence_name',src->>'required_subset',src->>'provenance',
             coalesce(src->>'sensitivity','public'),coalesce(src->>'publish_policy','restricted'),coalesce(src->>'governance_status','verification_required'),src->>'retention_policy',src->>'internal_storage_policy',
             coalesce((src->>'may_redistribute')::boolean,false),src->>'commercial_reuse',src->>'attribution_required',src->>'recommended_archive_format',src->>'preservation_action',src->>'legal_review_basis',src->>'last_classification_review',src->>'preservation_mode');
    end if;
    delete from public.project_data_sources ds where ds.project_id=project_uuid and ds.project_run_id is null and ds.canonical_source_key like rec.project_key||':source:%' and ds.canonical_source_key<>key_text;
  end loop;

  select count(*) into backend_after_n from public.projects;
  select count(*) into canonical_after_n from public.projects where canonical_project_key is not null;
  update private_import.project_library_import_runs set completed_at=now(),matched_existing=matched_n,created_projects=created_n,updated_projects=project_updates_n,
    backend_after=backend_after_n,canonical_after=canonical_after_n,
    details=coalesce(details,'{}'::jsonb)||jsonb_build_object('preserved_existing_uuid_count',(select count(*) from private_import.project_identity_baseline b join public.projects p on p.id=b.project_id))
  where id=run_id;

  return jsonb_build_object('run_id',run_id,'staged_projects',staged_n,'backend_before',backend_before_n,'matched_existing',matched_n,
    'created_projects',created_n,'project_updates',project_updates_n,'ambiguous',ambiguous_n,'backend_after',backend_after_n,'canonical_after',canonical_after_n);
end;
$$;

revoke all on function public.project_library_apply_stage_v2(text) from public, anon, authenticated;
grant execute on function public.project_library_apply_stage_v2(text) to service_role;
