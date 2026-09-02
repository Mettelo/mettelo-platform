-- Project Experience V2 Phase 4: atomic Admin resource-governance decision.
-- Resource state, immutable review evidence and the project governance event must
-- either all commit or all roll back.

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
  source_record public.project_data_sources%rowtype;
  quality_value text;
begin
  if decision_value not in ('verification_required','amber','green','red') then raise exception 'INVALID_GOVERNANCE_DECISION'; end if;
  if retention_policy_value not in ('permitted','restricted','not_permitted','unknown') then raise exception 'INVALID_RETENTION_POLICY'; end if;
  if internal_storage_policy_value not in ('permitted','restricted','not_permitted','unknown') then raise exception 'INVALID_STORAGE_POLICY'; end if;

  select * into source_record
  from public.project_data_sources ds
  where ds.id=target_resource_id and ds.project_run_id is null
  for update;
  if not found then raise exception 'CANONICAL_RESOURCE_NOT_FOUND'; end if;

  if decision_value='green' and (source_record.external_url is null or source_record.licence_name is null or (source_record.licence_url is null and evidence_url_value is null)) then
    raise exception 'GREEN_REQUIRES_LICENCE_EVIDENCE';
  end if;
  if public_use_approved and (decision_value<>'green' or source_record.sensitivity<>'public') then
    raise exception 'PUBLIC_USE_REQUIRES_GREEN_PUBLIC_RESOURCE';
  end if;

  quality_value := case when decision_value='green' then 'approved' when decision_value='verification_required' then 'unreviewed' else 'issues_found' end;

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
    source_record.project_id,
    actor_user_id,
    'admin',
    'resource_governance_reviewed',
    p.governance_status,
    p.governance_status,
    coalesce(nullif(notes_value,''),concat('Resource ',source_record.name,' reviewed as ',decision_value,'.')),
    jsonb_build_object(
      'resource_id',target_resource_id,
      'resource_name',source_record.name,
      'decision',decision_value,
      'retention_policy',retention_policy_value,
      'internal_storage_policy',internal_storage_policy_value,
      'public_use_approved',public_use_approved,
      'evidence_url',nullif(evidence_url_value,''),
      'atomic_review',true
    )
  from public.projects p where p.id=source_record.project_id;
end;
$$;

revoke all on function public.apply_project_resource_governance_review(uuid,uuid,text,text,text,text,text,text,boolean) from public,anon,authenticated;
grant execute on function public.apply_project_resource_governance_review(uuid,uuid,text,text,text,text,text,text,boolean) to service_role,postgres;
