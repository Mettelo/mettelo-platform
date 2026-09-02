-- Project Experience V2 + Catalogue Filters V2: atomic maintenance of discoverability classification.
-- Keeps working model, primary Domain, canonical Role families and optional Tools editable
-- without route-level partial writes. Capability selection remains owned by the canonical
-- Project Experience draft revision because it also carries Proof evidence expectations.

create or replace function public.apply_project_catalogue_classification_revision(
  target_project_id uuid,
  actor_user_id uuid,
  actor_scope_value text,
  working_model_value text,
  location_value text,
  domain_id_value uuid,
  role_family_ids uuid[],
  tool_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  current_status text;
begin
  if actor_scope_value not in ('project_architect','admin') then raise exception 'INVALID_ACTOR_SCOPE'; end if;
  if working_model_value not in ('remote','hybrid','onsite') then raise exception 'INVALID_WORKING_MODEL'; end if;
  if domain_id_value is null then raise exception 'DOMAIN_REQUIRED'; end if;
  if coalesce(cardinality(role_family_ids),0)<1 then raise exception 'ROLE_FAMILY_REQUIRED'; end if;
  if working_model_value<>'remote' and nullif(btrim(location_value),'') is null then raise exception 'LOCATION_REQUIRED'; end if;

  select p.governance_status into current_status
  from public.projects p
  where p.id=target_project_id
  for update;
  if current_status is null then raise exception 'PROJECT_NOT_FOUND'; end if;
  if current_status not in ('draft','changes_requested') then raise exception 'PROJECT_NOT_EDITABLE'; end if;

  if not exists(select 1 from public.domains d where d.id=domain_id_value and d.is_active) then raise exception 'INVALID_DOMAIN'; end if;
  if exists(select 1 from unnest(coalesce(role_family_ids,'{}'::uuid[])) id where not exists(select 1 from public.project_role_catalogue r where r.id=id and r.active)) then raise exception 'INVALID_ROLE_FAMILY'; end if;
  if exists(select 1 from unnest(coalesce(tool_ids,'{}'::uuid[])) id where not exists(select 1 from public.tools t where t.id=id and t.is_active)) then raise exception 'INVALID_TOOL'; end if;

  update public.projects set
    location_type=working_model_value,
    catalogue_working_model_source='explicit',
    location=case when working_model_value='remote' then 'Remote' else nullif(btrim(location_value),'') end,
    updated_at=now()
  where id=target_project_id;

  delete from public.project_domains where project_id=target_project_id;
  insert into public.project_domains(project_id,domain_id,is_primary)
  values(target_project_id,domain_id_value,true);

  delete from public.project_role_families where project_id=target_project_id;
  insert into public.project_role_families(project_id,role_catalogue_id,source)
  select target_project_id,id,'architect_authored'
  from unnest(role_family_ids) id;

  delete from public.project_tools where project_id=target_project_id;
  insert into public.project_tools(project_id,tool_id)
  select target_project_id,id
  from unnest(coalesce(tool_ids,'{}'::uuid[])) id;

  insert into public.project_governance_events(project_id,actor_user_id,actor_scope,event_type,from_status,to_status,reason,metadata)
  values(
    target_project_id,actor_user_id,actor_scope_value,'project_catalogue_classification_updated',current_status,current_status,
    'Governed project catalogue classification updated in place.',
    jsonb_build_object('working_model',working_model_value,'domain_id',domain_id_value,'role_family_count',cardinality(role_family_ids),'tool_count',coalesce(cardinality(tool_ids),0),'atomic_catalogue_revision',true)
  );
end;
$$;

revoke all on function public.apply_project_catalogue_classification_revision(uuid,uuid,text,text,text,uuid,uuid[],uuid[]) from public,anon,authenticated;
grant execute on function public.apply_project_catalogue_classification_revision(uuid,uuid,text,text,text,uuid,uuid[],uuid[]) to service_role,postgres;
