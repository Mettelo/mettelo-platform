-- Seed the first public Labs briefs as real source-of-truth records.
insert into public.projects (slug,title,summary,problem_statement,status,visibility,location,duration_weeks,weekly_commitment)
values
('nigeria-cost-of-living-data-explorer','Nigeria Cost of Living Data Explorer','A public-facing data product turning fragmented price and location data into useful household insight.','Households, researchers and professionals need clearer ways to understand how cost-of-living pressure varies by location and category across Nigeria.','pilot','public','Remote',8,'3–5 hours / week'),
('open-data-quality-monitor','Open Data Quality Monitor','A reusable framework for profiling public datasets and surfacing missingness, freshness and consistency issues.','Open datasets are useful only when users can quickly understand their quality, freshness and limitations.','pilot','public','Remote',6,'3–5 hours / week'),
('graduate-data-job-market-tracker','Graduate Data Job Market Tracker','A recurring insight product on early-career Data & AI hiring patterns across Nigeria and the UK.','Early-career professionals need better evidence about role demand, skills, geography and hiring patterns rather than anecdotal job-market advice.','draft','public','Nigeria + UK · Remote',8,'3–5 hours / week')
on conflict (slug) do update set
  title=excluded.title,
  summary=excluded.summary,
  problem_statement=excluded.problem_statement,
  location=excluded.location,
  duration_weeks=excluded.duration_weeks,
  weekly_commitment=excluded.weekly_commitment,
  updated_at=now();

insert into public.project_roles (project_id,title,discipline,description,skills,openings)
select p.id,v.title,v.discipline,v.description,v.skills,v.openings
from public.projects p
join (values
('nigeria-cost-of-living-data-explorer','Data Analyst','Data Analysis','Explore, validate and communicate price and location patterns.',array['SQL','Python','Data visualisation']::text[],2),
('nigeria-cost-of-living-data-explorer','Data Engineer','Data Engineering','Structure and document repeatable data ingestion and transformation.',array['Python','SQL','ETL']::text[],1),
('nigeria-cost-of-living-data-explorer','Research / UX','Research','Help frame user questions, research context and usability.',array['Research','UX','Storytelling']::text[],1),
('nigeria-cost-of-living-data-explorer','Project Lead','Delivery','Coordinate scope, team rhythm, decisions and final delivery.',array['Delivery','Stakeholder management']::text[],1),
('nigeria-cost-of-living-data-explorer','QA Reviewer','Quality','Review methodology, outputs, documentation and reproducibility.',array['QA','Data quality']::text[],1),
('open-data-quality-monitor','Analytics Engineer','Analytics Engineering','Design reusable profiling logic and data-quality outputs.',array['SQL','Python','Data modelling']::text[],1),
('open-data-quality-monitor','Data Analyst','Data Analysis','Test quality rules and communicate issues clearly.',array['SQL','Data quality','Visualisation']::text[],1),
('open-data-quality-monitor','Python Contributor','Engineering','Build reusable profiling and validation utilities.',array['Python','Testing']::text[],1),
('open-data-quality-monitor','Documentation / QA','Quality','Document the framework and review reproducibility.',array['Documentation','QA']::text[],2)
) as v(slug,title,discipline,description,skills,openings) on p.slug=v.slug
where not exists (
  select 1 from public.project_roles r where r.project_id=p.id and r.title=v.title
);
