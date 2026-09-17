-- Workstream 9 Phase 21: serialize material Admin project operations with member
-- submission and resource-governance decisions on the canonical project row.
begin;

create or replace function public.workstream9_apply_admin_project_operation(
  p_project_id uuid,
  p_action text,
  p_patch jsonb default '{}'::jsonb,
  p_actor_user_id uuid default null,
  p_context jsonb default '{}'::jsonb
)
returns public.projects
language plpgsql
security definer
set search_path=public
as $$
declare
  before_row public.projects%rowtype;
  after_row public.projects%rowtype;
  blockers text[];
  active_count integer:=0;
  unknown_keys jsonb;
  next_type text;
  next_partner text;
begin
  if p_actor_user_id is null then
    raise exception 'ADMIN_ACTOR_REQUIRED' using errcode='42501';
  end if;

  select * into before_row
  from public.projects
  where id=p_project_id
  for update;

  if not found then
    raise exception 'PROJECT_NOT_FOUND' using errcode='P0002';
  end if;

  if p_action in ('publish_pilot','publish_open','publish_recruiting','resume_intake') then
    blockers:=public.workstream2_publication_blockers(p_project_id);
    if coalesce(array_length(blockers,1),0)>0 then
      raise exception 'PROJECT_NOT_PUBLICATION_READY:%',array_to_string(blockers,',')
        using errcode='P0001';
    end if;
  end if;

  if p_action='publish_pilot' then
    update public.projects set status='pilot',visibility='public',applications_open=true,
      application_deadline=case when project_type='open' then null else application_deadline end,
      updated_at=now(),updated_by_user_id=p_actor_user_id
    where id=p_project_id;
  elsif p_action='publish_open' then
    if before_row.project_type<>'open' then
      raise exception 'PUBLISH_OPEN_REQUIRES_OPEN_PROJECT' using errcode='22023';
    end if;
    update public.projects set status='open',visibility='public',applications_open=true,
      application_deadline=null,updated_at=now(),updated_by_user_id=p_actor_user_id
    where id=p_project_id;
  elsif p_action='publish_recruiting' then
    update public.projects set status='recruiting',visibility='public',applications_open=true,
      application_deadline=case when project_type='open' then null else application_deadline end,
      updated_at=now(),updated_by_user_id=p_actor_user_id
    where id=p_project_id;
  elsif p_action='pause_intake' then
    update public.projects set applications_open=false,updated_at=now(),updated_by_user_id=p_actor_user_id
    where id=p_project_id;
  elsif p_action='resume_intake' then
    if before_row.project_type='partner' and before_row.status not in ('pilot','recruiting','open','forming') then
      raise exception 'PARTNER_INTAKE_CANNOT_REOPEN' using errcode='P0001';
    elsif before_row.project_type='open' and before_row.status not in ('pilot','recruiting','open','forming','active','review') then
      raise exception 'PROJECT_INTAKE_CANNOT_REOPEN' using errcode='P0001';
    end if;
    update public.projects set visibility='public',applications_open=true,
      application_deadline=case when project_type='open' then null else application_deadline end,
      updated_at=now(),updated_by_user_id=p_actor_user_id
    where id=p_project_id;
  elsif p_action='unpublish' then
    select
      (select count(*) from public.project_applications where project_id=p_project_id and status not in ('declined','withdrawn'))+
      (select count(*) from public.project_members where project_id=p_project_id)+
      (select count(*) from public.project_runs where project_id=p_project_id and has_started=true)+
      (select count(*) from public.contributions where project_id=p_project_id)
    into active_count;
    if active_count>0 then
      raise exception 'PROJECT_HAS_OPERATIONAL_HISTORY' using errcode='P0001';
    end if;
    update public.projects set status='draft',visibility='private',applications_open=false,
      updated_at=now(),updated_by_user_id=p_actor_user_id
    where id=p_project_id;
  elsif p_action='archive' then
    select
      (select count(*) from public.project_applications where project_id=p_project_id and status in ('submitted','in_review','shortlisted','offered','approved','accepted','waiting_for_team'))+
      (select count(*) from public.project_members where project_id=p_project_id and membership_status in ('waiting','active'))+
      (select count(*) from public.project_runs where project_id=p_project_id and has_started=true and status not in ('completed','cancelled'))
    into active_count;
    if active_count>0 then
      raise exception 'PROJECT_HAS_LIVE_WORK' using errcode='P0001';
    end if;
    update public.projects set status='archived',visibility='private',applications_open=false,
      updated_at=now(),updated_by_user_id=p_actor_user_id
    where id=p_project_id;
  elsif p_action='edit' then
    unknown_keys:=coalesce(p_patch,'{}'::jsonb)-array[
      'title','summary','problem_statement','team_size_threshold','duration_weeks',
      'weekly_commitment','application_deadline','presentation_required',
      'github_repo_required','final_proof_required','project_type','partner_name'
    ];
    if unknown_keys<>'{}'::jsonb then
      raise exception 'UNSUPPORTED_PROJECT_PATCH' using errcode='22023';
    end if;

    next_type:=case when p_patch?'project_type' then nullif(btrim(p_patch->>'project_type'),'') else before_row.project_type end;
    next_partner:=case when p_patch?'partner_name' then nullif(btrim(p_patch->>'partner_name'),'') else before_row.partner_name end;
    if next_type not in ('open','partner') then
      raise exception 'INVALID_PROJECT_TYPE' using errcode='22023';
    end if;
    if next_type='partner' and next_partner is null then
      raise exception 'PARTNER_NAME_REQUIRED' using errcode='22023';
    end if;

    if next_type is distinct from before_row.project_type then
      select
        (select count(*) from public.project_applications where project_id=p_project_id)+
        (select count(*) from public.project_members where project_id=p_project_id)+
        (select count(*) from public.project_runs where project_id=p_project_id)+
        (select count(*) from public.contributions where project_id=p_project_id)
      into active_count;
      if active_count>0 then
        raise exception 'PROJECT_TYPE_LOCKED' using errcode='P0001';
      end if;
    end if;

    if next_type='open' and p_patch?'application_deadline' and nullif(p_patch->>'application_deadline','') is not null then
      raise exception 'OPEN_PROJECT_DEADLINE_NOT_ALLOWED' using errcode='22023';
    end if;

    update public.projects
    set
      title=case when p_patch?'title' then nullif(btrim(p_patch->>'title'),'') else title end,
      summary=case when p_patch?'summary' then nullif(btrim(p_patch->>'summary'),'') else summary end,
      problem_statement=case when p_patch?'problem_statement' then nullif(btrim(p_patch->>'problem_statement'),'') else problem_statement end,
      team_size_threshold=case when p_patch?'team_size_threshold' then greatest(1,least(50,(p_patch->>'team_size_threshold')::integer)) else team_size_threshold end,
      duration_weeks=case when p_patch?'duration_weeks' then case when nullif(p_patch->>'duration_weeks','') is null then null else greatest(1,least(104,(p_patch->>'duration_weeks')::integer)) end else duration_weeks end,
      weekly_commitment=case when p_patch?'weekly_commitment' then nullif(btrim(p_patch->>'weekly_commitment'),'') else weekly_commitment end,
      application_deadline=case
        when next_type='open' then null
        when p_patch?'application_deadline' then nullif(p_patch->>'application_deadline','')::timestamptz
        else application_deadline
      end,
      presentation_required=case when p_patch?'presentation_required' then (p_patch->>'presentation_required')::boolean else presentation_required end,
      github_repo_required=case when p_patch?'github_repo_required' then (p_patch->>'github_repo_required')::boolean else github_repo_required end,
      final_proof_required=case when p_patch?'final_proof_required' then (p_patch->>'final_proof_required')::boolean else final_proof_required end,
      project_type=next_type,
      partner_name=next_partner,
      project_type_review_required=case when next_type is distinct from before_row.project_type then false else project_type_review_required end,
      project_type_reviewed_at=case when next_type is distinct from before_row.project_type then now() else project_type_reviewed_at end,
      project_type_reviewed_by=case when next_type is distinct from before_row.project_type then p_actor_user_id else project_type_reviewed_by end,
      updated_at=now(),
      updated_by_user_id=p_actor_user_id
    where id=p_project_id;
  else
    raise exception 'UNSUPPORTED_PROJECT_OPERATION' using errcode='22023';
  end if;

  select * into after_row from public.projects where id=p_project_id;

  if after_row.status='draft' and (after_row.visibility<>'private' or after_row.applications_open) then
    raise exception 'INVALID_DRAFT_LIFECYCLE' using errcode='23514';
  end if;
  if after_row.applications_open and after_row.visibility<>'public' then
    raise exception 'INVALID_APPLICATION_VISIBILITY' using errcode='23514';
  end if;
  if after_row.status='archived' and (after_row.visibility<>'private' or after_row.applications_open) then
    raise exception 'INVALID_ARCHIVE_LIFECYCLE' using errcode='23514';
  end if;

  if p_action='edit' and after_row.visibility='public' then
    blockers:=public.workstream2_publication_blockers(p_project_id);
    if coalesce(array_length(blockers,1),0)>0 then
      raise exception 'PUBLIC_PROJECT_WOULD_BECOME_INVALID:%',array_to_string(blockers,',')
        using errcode='P0001';
    end if;
  end if;

  insert into public.project_governance_events(
    project_id,actor_user_id,actor_scope,event_type,from_status,to_status,reason,metadata
  ) values (
    p_project_id,p_actor_user_id,'admin','admin_project_'||p_action,
    before_row.status,after_row.status,'Workstream 9 canonical Admin project operation.',
    jsonb_build_object(
      'previous',to_jsonb(before_row),
      'new',to_jsonb(after_row),
      'context',coalesce(p_context,'{}'::jsonb),
      'atomic',true
    )
  );

  return after_row;
end;
$$;

revoke all on function public.workstream9_apply_admin_project_operation(uuid,text,jsonb,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.workstream9_apply_admin_project_operation(uuid,text,jsonb,uuid,jsonb) to service_role,postgres;

-- The canonical resource review must lock the project before it changes governance,
-- so publication and governance can never pass one another on stale state.
create or replace function public.apply_project_resource_governance_review(
  target_resource_id uuid,
  actor_user_id uuid,
  decision_value text,
  notes_value text,
  evidence_url_value text,
  retention_policy_value text,
  internal_storage_policy_value text,
  internal_storage_url_value text,
  public_use_approved boolean
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  source_project_id uuid;
  source_record public.project_data_sources%rowtype;
  quality_value text;
begin
  if decision_value not in ('verification_required','amber','green','red') then raise exception 'INVALID_GOVERNANCE_DECISION'; end if;
  if retention_policy_value not in ('permitted','restricted','not_permitted','unknown') then raise exception 'INVALID_RETENTION_POLICY'; end if;
  if internal_storage_policy_value not in ('permitted','restricted','not_permitted','unknown') then raise exception 'INVALID_STORAGE_POLICY'; end if;

  select ds.project_id into source_project_id
  from public.project_data_sources ds
  where ds.id=target_resource_id and ds.project_run_id is null;
  if not found then raise exception 'CANONICAL_RESOURCE_NOT_FOUND'; end if;

  perform 1 from public.projects where id=source_project_id for update;
  if not found then raise exception 'PROJECT_NOT_FOUND'; end if;

  select * into source_record
  from public.project_data_sources ds
  where ds.id=target_resource_id and ds.project_id=source_project_id and ds.project_run_id is null
  for update;
  if not found then raise exception 'CANONICAL_RESOURCE_NOT_FOUND'; end if;

  if decision_value='green' and (source_record.external_url is null or source_record.licence_name is null or (source_record.licence_url is null and evidence_url_value is null)) then
    raise exception 'GREEN_REQUIRES_LICENCE_EVIDENCE';
  end if;
  if public_use_approved and (decision_value<>'green' or source_record.sensitivity<>'public') then
    raise exception 'PUBLIC_USE_REQUIRES_GREEN_PUBLIC_RESOURCE';
  end if;

  quality_value:=case when decision_value='green' then 'approved' when decision_value='verification_required' then 'unreviewed' else 'issues_found' end;

  update public.project_data_sources
  set governance_status=decision_value,
      governance_verified_at=now(),
      governance_verified_by=actor_user_id,
      retention_policy=retention_policy_value,
      internal_storage_policy=internal_storage_policy_value,
      internal_storage_url=nullif(internal_storage_url_value,''),
      publish_policy=case when public_use_approved then 'permitted' else 'not_permitted' end,
      quality_status=quality_value,
      updated_at=now()
  where id=target_resource_id;

  insert into public.project_data_source_governance_reviews(data_source_id,decision,notes,evidence_url,reviewer_user_id)
  values(target_resource_id,decision_value,nullif(notes_value,''),nullif(evidence_url_value,''),actor_user_id);

  insert into public.project_governance_events(project_id,actor_user_id,actor_scope,event_type,from_status,to_status,reason,metadata)
  select
    source_record.project_id,actor_user_id,'admin','resource_governance_reviewed',
    p.governance_status,p.governance_status,
    coalesce(nullif(notes_value,''),concat('Resource ',source_record.name,' reviewed as ',decision_value,'.')),
    jsonb_build_object(
      'resource_id',target_resource_id,
      'resource_name',source_record.name,
      'decision',decision_value,
      'retention_policy',retention_policy_value,
      'internal_storage_policy',internal_storage_policy_value,
      'public_use_approved',public_use_approved,
      'evidence_url',nullif(evidence_url_value,''),
      'atomic_review',true,
      'project_lock',true
    )
  from public.projects p where p.id=source_record.project_id;
end;
$$;

revoke all on function public.apply_project_resource_governance_review(uuid,uuid,text,text,text,text,text,text,boolean) from public,anon,authenticated;
grant execute on function public.apply_project_resource_governance_review(uuid,uuid,text,text,text,text,text,text,boolean) to service_role,postgres;

commit;
