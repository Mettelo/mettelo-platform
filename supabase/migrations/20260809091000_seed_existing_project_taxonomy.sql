-- Tag existing seeded briefs only where the existing project copy clearly supports the classification.
update public.projects
set location_type='remote'
where slug in ('nigeria-cost-of-living-data-explorer','open-data-quality-monitor','graduate-data-job-market-tracker')
  and location ilike '%remote%';

insert into public.project_domains(project_id,domain_id,is_primary)
select p.id,d.id,true
from public.projects p
join public.domains d on d.slug='cross-industry-open-data'
where p.slug in ('nigeria-cost-of-living-data-explorer','open-data-quality-monitor','graduate-data-job-market-tracker')
on conflict (project_id,domain_id) do update set is_primary=true;

insert into public.project_methods(project_id,method_id)
select p.id,m.id
from public.projects p
join public.methods m on m.slug='data-quality'
where p.slug='open-data-quality-monitor'
on conflict (project_id,method_id) do nothing;
