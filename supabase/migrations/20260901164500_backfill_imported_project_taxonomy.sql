-- Repair public project discovery facets for governed imported projects.
-- Imported projects can carry approved domain/tool/method metadata in the import ledger
-- while the canonical project taxonomy junctions remain empty. Public filters read the
-- canonical junctions, so populate only confident taxonomy matches and keep those tables
-- as the source of truth after this migration.

with imported_projects as (
  select distinct on (o.project_id)
    o.project_id,
    r.normalized
  from public.capability_path_import_project_origins o
  join public.capability_path_import_rows r
    on r.batch_id = o.batch_id
   and r.row_kind = 'project'
   and r.source_key = o.source_project_key
  where jsonb_typeof(r.normalized) = 'object'
  order by o.project_id, o.created_at desc
), domain_matches as (
  select ip.project_id, d.id as domain_id
  from imported_projects ip
  join public.domains d
    on d.is_active = true
   and nullif(trim(ip.normalized->>'domain'),'') is not null
   and (
     lower(trim(ip.normalized->>'domain')) = lower(d.name)
     or lower(trim(ip.normalized->>'domain')) like lower(d.name) || ' /%'
   )
)
insert into public.project_domains(project_id,domain_id,is_primary)
select dm.project_id, dm.domain_id, true
from domain_matches dm
where not exists (
  select 1 from public.project_domains existing
  where existing.project_id = dm.project_id and existing.is_primary
)
on conflict (project_id,domain_id) do nothing;

with imported_projects as (
  select distinct on (o.project_id)
    o.project_id,
    r.normalized
  from public.capability_path_import_project_origins o
  join public.capability_path_import_rows r
    on r.batch_id = o.batch_id
   and r.row_kind = 'project'
   and r.source_key = o.source_project_key
  where jsonb_typeof(r.normalized) = 'object'
  order by o.project_id, o.created_at desc
), imported_tools as (
  select ip.project_id, trim(value) as raw_tool
  from imported_projects ip
  cross join lateral jsonb_array_elements_text(
    case when jsonb_typeof(ip.normalized->'tools') = 'array' then ip.normalized->'tools' else '[]'::jsonb end
  ) value
), tool_matches as (
  select distinct it.project_id, t.id as tool_id
  from imported_tools it
  join public.tools t
    on t.is_active = true
   and (
     lower(it.raw_tool) = lower(t.name)
     or lower(it.raw_tool) like lower(t.name) || '/%'
     or lower(it.raw_tool) like '%/' || lower(t.name)
   )
)
insert into public.project_tools(project_id,tool_id)
select project_id,tool_id from tool_matches
on conflict (project_id,tool_id) do nothing;

with imported_projects as (
  select distinct on (o.project_id)
    o.project_id,
    r.normalized
  from public.capability_path_import_project_origins o
  join public.capability_path_import_rows r
    on r.batch_id = o.batch_id
   and r.row_kind = 'project'
   and r.source_key = o.source_project_key
  where jsonb_typeof(r.normalized) = 'object'
  order by o.project_id, o.created_at desc
), imported_methods as (
  select ip.project_id, trim(value) as raw_method
  from imported_projects ip
  cross join lateral jsonb_array_elements_text(
    case when jsonb_typeof(ip.normalized->'methods') = 'array' then ip.normalized->'methods' else '[]'::jsonb end
  ) value
), method_matches as (
  select distinct im.project_id, m.id as method_id
  from imported_methods im
  join public.methods m
    on m.is_active = true
   and lower(im.raw_method) = lower(m.name)
)
insert into public.project_methods(project_id,method_id)
select project_id,method_id from method_matches
on conflict (project_id,method_id) do nothing;
