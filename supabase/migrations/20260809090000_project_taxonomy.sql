-- Structured project taxonomy for discovery, filtering and recommendations.
alter table public.projects
  add column if not exists difficulty_level text,
  add column if not exists location_type text;

do $$ begin
  alter table public.projects add constraint projects_difficulty_level_check check (difficulty_level is null or difficulty_level in ('entry','intermediate','advanced'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.projects add constraint projects_location_type_check check (location_type is null or location_type in ('remote','hybrid','onsite'));
exception when duplicate_object then null; end $$;

create table if not exists public.domains (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null unique,
  description text,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.tools (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null unique,
  category text not null,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.methods (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null unique,
  category text not null default 'analytics',
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.project_domains (
  project_id uuid not null references public.projects(id) on delete cascade,
  domain_id uuid not null references public.domains(id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (project_id, domain_id)
);

create unique index if not exists project_domains_one_primary_idx
  on public.project_domains(project_id) where is_primary;

create table if not exists public.project_tools (
  project_id uuid not null references public.projects(id) on delete cascade,
  tool_id uuid not null references public.tools(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (project_id, tool_id)
);

create table if not exists public.project_methods (
  project_id uuid not null references public.projects(id) on delete cascade,
  method_id uuid not null references public.methods(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (project_id, method_id)
);

create index if not exists project_domains_domain_idx on public.project_domains(domain_id, project_id);
create index if not exists project_tools_tool_idx on public.project_tools(tool_id, project_id);
create index if not exists project_methods_method_idx on public.project_methods(method_id, project_id);
create index if not exists projects_discovery_idx on public.projects(visibility, status, difficulty_level, location_type);

alter table public.domains enable row level security;
alter table public.tools enable row level security;
alter table public.methods enable row level security;
alter table public.project_domains enable row level security;
alter table public.project_tools enable row level security;
alter table public.project_methods enable row level security;

drop policy if exists "taxonomy domains are readable" on public.domains;
create policy "taxonomy domains are readable" on public.domains for select using (is_active);
drop policy if exists "taxonomy tools are readable" on public.tools;
create policy "taxonomy tools are readable" on public.tools for select using (is_active);
drop policy if exists "taxonomy methods are readable" on public.methods;
create policy "taxonomy methods are readable" on public.methods for select using (is_active);

drop policy if exists "visible project domains are readable" on public.project_domains;
create policy "visible project domains are readable" on public.project_domains for select using (
  exists (select 1 from public.projects p where p.id=project_id and p.visibility='public')
  or exists (select 1 from public.project_members pm where pm.project_id=project_id and pm.user_id=auth.uid())
  or coalesce(auth.jwt()->'app_metadata'->>'role','')='admin'
);
drop policy if exists "visible project tools are readable" on public.project_tools;
create policy "visible project tools are readable" on public.project_tools for select using (
  exists (select 1 from public.projects p where p.id=project_id and p.visibility='public')
  or exists (select 1 from public.project_members pm where pm.project_id=project_id and pm.user_id=auth.uid())
  or coalesce(auth.jwt()->'app_metadata'->>'role','')='admin'
);
drop policy if exists "visible project methods are readable" on public.project_methods;
create policy "visible project methods are readable" on public.project_methods for select using (
  exists (select 1 from public.projects p where p.id=project_id and p.visibility='public')
  or exists (select 1 from public.project_members pm where pm.project_id=project_id and pm.user_id=auth.uid())
  or coalesce(auth.jwt()->'app_metadata'->>'role','')='admin'
);

insert into public.domains(slug,name,sort_order) values
('healthcare-life-sciences','Healthcare & Life Sciences',10),('finance-fintech','Finance & FinTech',20),('retail-ecommerce','Retail & E-commerce',30),('marketing-customer-analytics','Marketing & Customer Analytics',40),('transport-logistics-supply-chain','Transport, Logistics & Supply Chain',50),('government-public-sector','Government & Public Sector',60),('education-edtech','Education & EdTech',70),('energy-utilities','Energy & Utilities',80),('telecommunications','Telecommunications',90),('real-estate-property','Real Estate & Property',100),('manufacturing-industrial','Manufacturing & Industrial',110),('agriculture-food','Agriculture & Food',120),('media-entertainment-sports','Media, Entertainment & Sports',130),('climate-environment-sustainability','Climate, Environment & Sustainability',140),('technology-saas','Technology & SaaS',150),('cross-industry-open-data','Cross-industry / Open Data',160)
on conflict (slug) do update set name=excluded.name, sort_order=excluded.sort_order, is_active=true;

insert into public.tools(slug,name,category,sort_order) values
('sql','SQL','analysis',10),('python','Python','analysis',20),('excel','Excel','analysis',30),('power-bi','Power BI','bi',40),('tableau','Tableau','bi',50),('looker','Looker','bi',60),('r','R','analysis',70),('bigquery','BigQuery','warehouse',80),('postgresql','PostgreSQL','database',90),('mysql','MySQL','database',100),('sql-server','SQL Server','database',110),('snowflake','Snowflake','warehouse',120),('databricks','Databricks','warehouse',130),('dbt','dbt','data-engineering',140),('airflow','Airflow','data-engineering',150),('spark','Apache Spark','data-engineering',160),('kafka','Kafka','data-engineering',170),('azure-data-factory','Azure Data Factory','data-engineering',180),('aws','AWS','cloud',190),('azure','Azure','cloud',200),('google-cloud','Google Cloud','cloud',210),('github','GitHub','development',220),('gitlab','GitLab','development',230),('docker','Docker','development',240),('jupyter','Jupyter','development',250),('streamlit','Streamlit','development',260),('fastapi','FastAPI','development',270),('ga4','GA4','digital-analytics',280),('google-tag-manager','Google Tag Manager','digital-analytics',290),('mixpanel','Mixpanel','digital-analytics',300),('amplitude','Amplitude','digital-analytics',310),('machine-learning','Machine Learning','ai',320),('generative-ai','Generative AI','ai',330),('llms','LLMs','ai',340),('nlp','NLP','ai',350),('computer-vision','Computer Vision','ai',360),('rag','RAG','ai',370),('ai-agents','AI Agents','ai',380),('openai','OpenAI','ai',390),('hugging-face','Hugging Face','ai',400),('tensorflow','TensorFlow','ai',410),('pytorch','PyTorch','ai',420),('scikit-learn','scikit-learn','ai',430)
on conflict (slug) do update set name=excluded.name, category=excluded.category, sort_order=excluded.sort_order, is_active=true;

insert into public.methods(slug,name,category,sort_order) values
('forecasting','Forecasting','analytics',10),('time-series','Time Series','analytics',20),('data-quality','Data Quality','analytics',30),('dashboarding','Dashboarding','analytics',40),('ab-testing','A/B Testing','experimentation',50),('experimentation','Experimentation','experimentation',60),('customer-segmentation','Customer Segmentation','customer',70),('marketing-attribution','Marketing Attribution','marketing',80),('marketing-mix-modelling','Marketing Mix Modelling','marketing',90),('geospatial-analysis','Geospatial Analysis','analytics',100),('statistical-modelling','Statistical Modelling','analytics',110),('survey-analysis','Survey Analysis','research',120),('causal-inference','Causal Inference','analytics',130),('anomaly-detection','Anomaly Detection','analytics',140),('optimisation','Optimisation','analytics',150),('predictive-analytics','Predictive Analytics','analytics',160),('classification','Classification','machine-learning',170),('regression','Regression','machine-learning',180),('clustering','Clustering','machine-learning',190),('recommendation-systems','Recommendation Systems','machine-learning',200)
on conflict (slug) do update set name=excluded.name, category=excluded.category, sort_order=excluded.sort_order, is_active=true;