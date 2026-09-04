create or replace function public.admin_replace_project_discovery_taxonomy(
  p_project_id uuid,
  p_domain_ids uuid[] default '{}',
  p_tool_ids uuid[] default '{}',
  p_method_ids uuid[] default '{}'
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists(select 1 from public.projects where id=p_project_id) then
    raise exception 'Project not found';
  end if;

  if exists(select 1 from unnest(coalesce(p_domain_ids,'{}'::uuid[])) as selected(id) left join public.domains d on d.id=selected.id where d.id is null or d.is_active is not true) then
    raise exception 'Invalid or inactive domain';
  end if;
  if exists(select 1 from unnest(coalesce(p_tool_ids,'{}'::uuid[])) as selected(id) left join public.tools t on t.id=selected.id where t.id is null or t.is_active is not true) then
    raise exception 'Invalid or inactive tool';
  end if;
  if exists(select 1 from unnest(coalesce(p_method_ids,'{}'::uuid[])) as selected(id) left join public.methods m on m.id=selected.id where m.id is null or m.is_active is not true) then
    raise exception 'Invalid or inactive method';
  end if;

  delete from public.project_domains where project_id=p_project_id;
  insert into public.project_domains(project_id,domain_id,is_primary)
  select p_project_id,selected.id,selected.ord=1 from unnest(coalesce(p_domain_ids,'{}'::uuid[])) with ordinality as selected(id,ord);

  delete from public.project_tools where project_id=p_project_id;
  insert into public.project_tools(project_id,tool_id)
  select p_project_id,selected.id from unnest(coalesce(p_tool_ids,'{}'::uuid[])) as selected(id);

  delete from public.project_methods where project_id=p_project_id;
  insert into public.project_methods(project_id,method_id)
  select p_project_id,selected.id from unnest(coalesce(p_method_ids,'{}'::uuid[])) as selected(id);
end;
$$;

revoke all on function public.admin_replace_project_discovery_taxonomy(uuid,uuid[],uuid[],uuid[]) from public, anon, authenticated;
grant execute on function public.admin_replace_project_discovery_taxonomy(uuid,uuid[],uuid[],uuid[]) to service_role;
