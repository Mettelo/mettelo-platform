-- Mettelo project-discovery taxonomy coverage audit.
-- Read-only: run against the target Supabase environment before release and after bulk imports.
-- Ambiguous or missing values are reported; this script intentionally does not infer mappings.

with public_projects as (
  select id,difficulty_level,team_size_threshold,duration_weeks,weekly_commitment,
         location_type,project_type,status,applications_open
  from public.projects
  where visibility='public'
    and status in ('pilot','recruiting','open','forming','active','review','completed')
)
select
  count(*) as public_projects,
  count(difficulty_level) as experience_present,
  count(team_size_threshold) as format_present,
  count(duration_weeks) as duration_present,
  count(weekly_commitment) as commitment_present,
  count(location_type) as working_model_present,
  count(project_type) as source_present
from public_projects;

select
  'industry' as dimension,
  count(distinct p.id) as projects_with_governed_value,
  count(*) as governed_relations
from public.projects p
join public.project_domains x on x.project_id=p.id
where p.visibility='public' and p.status in ('pilot','recruiting','open','forming','active','review','completed')
union all
select 'tool',count(distinct p.id),count(*)
from public.projects p join public.project_tools x on x.project_id=p.id
where p.visibility='public' and p.status in ('pilot','recruiting','open','forming','active','review','completed')
union all
select 'capability',count(distinct p.id),count(*)
from public.projects p join public.project_capabilities x on x.project_id=p.id
where p.visibility='public' and p.status in ('pilot','recruiting','open','forming','active','review','completed');

-- Career / Role integrity. canonical_role_key is audited separately from the visible
-- project role title because imported per-project identifiers are not career taxonomy.
select
  coalesce(pr.canonical_role_key,'<missing>') as imported_canonical_role_key,
  count(distinct p.id) as project_count,
  array_agg(distinct pr.title order by pr.title) as project_role_titles
from public.projects p
join public.project_roles pr on pr.project_id=p.id
where p.visibility='public' and p.status in ('pilot','recruiting','open','forming','active','review','completed')
group by coalesce(pr.canonical_role_key,'<missing>')
order by project_count desc,imported_canonical_role_key;

select d.slug,d.name,count(distinct p.id) as public_project_count
from public.projects p
join public.project_domains pd on pd.project_id=p.id
join public.domains d on d.id=pd.domain_id
where p.visibility='public' and p.status in ('pilot','recruiting','open','forming','active','review','completed')
group by d.slug,d.name order by public_project_count desc,d.name;

select t.slug,t.name,count(distinct p.id) as public_project_count
from public.projects p
join public.project_tools pt on pt.project_id=p.id
join public.tools t on t.id=pt.tool_id
where p.visibility='public' and p.status in ('pilot','recruiting','open','forming','active','review','completed')
group by t.slug,t.name order by public_project_count desc,t.name;

select c.slug,c.name,count(distinct p.id) as public_project_count
from public.projects p
join public.project_capabilities pc on pc.project_id=p.id
join public.capabilities c on c.id=pc.capability_id
where p.visibility='public' and p.status in ('pilot','recruiting','open','forming','active','review','completed')
group by c.slug,c.name order by public_project_count desc,c.name;
