alter table public.opportunities
  add column if not exists role_family text,
  add column if not exists role_category text,
  add column if not exists data_ai_relevance_score integer,
  add column if not exists data_ai_relevance_status text not null default 'unclassified',
  add column if not exists verification_status text not null default 'needs_review',
  add column if not exists verification_score integer,
  add column if not exists verification_reasons text[] not null default '{}',
  add column if not exists source_type text,
  add column if not exists source_organisation text,
  add column if not exists official_application_url text,
  add column if not exists employer_domain text,
  add column if not exists external_job_id text,
  add column if not exists discovered_at timestamptz not null default now(),
  add column if not exists original_published_at timestamptz,
  add column if not exists last_verified_at timestamptz,
  add column if not exists next_verification_at timestamptz,
  add column if not exists eligibility_status text not null default 'unknown',
  add column if not exists eligible_countries text[] not null default '{}',
  add column if not exists remote_scope text,
  add column if not exists sponsorship_status text not null default 'unknown',
  add column if not exists suspicion_score integer not null default 0,
  add column if not exists review_required boolean not null default true,
  add column if not exists rejection_reason text,
  add column if not exists publication_mode text not null default 'manual',
  add column if not exists classification_version text;

alter table public.opportunities drop constraint if exists opportunities_data_ai_relevance_score_check;
alter table public.opportunities add constraint opportunities_data_ai_relevance_score_check check (data_ai_relevance_score is null or data_ai_relevance_score between 0 and 100);
alter table public.opportunities drop constraint if exists opportunities_verification_score_check;
alter table public.opportunities add constraint opportunities_verification_score_check check (verification_score is null or verification_score between 0 and 100);
alter table public.opportunities drop constraint if exists opportunities_suspicion_score_check;
alter table public.opportunities add constraint opportunities_suspicion_score_check check (suspicion_score between 0 and 100);
alter table public.opportunities drop constraint if exists opportunities_data_ai_relevance_status_check;
alter table public.opportunities add constraint opportunities_data_ai_relevance_status_check check (data_ai_relevance_status in ('unclassified','high','medium','low','rejected'));
alter table public.opportunities drop constraint if exists opportunities_verification_status_check;
alter table public.opportunities add constraint opportunities_verification_status_check check (verification_status in ('needs_review','high_confidence','verified','rejected','expired'));
alter table public.opportunities drop constraint if exists opportunities_eligibility_status_check;
alter table public.opportunities add constraint opportunities_eligibility_status_check check (eligibility_status in ('clear','unclear','unknown'));
alter table public.opportunities drop constraint if exists opportunities_sponsorship_status_check;
alter table public.opportunities add constraint opportunities_sponsorship_status_check check (sponsorship_status in ('confirmed','not_offered','unclear','unknown'));
alter table public.opportunities drop constraint if exists opportunities_publication_mode_check;
alter table public.opportunities add constraint opportunities_publication_mode_check check (publication_mode in ('manual','auto'));

create table if not exists public.opportunity_role_taxonomy (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text unique not null,
  category text not null,
  confidence_tier text not null check (confidence_tier in ('high','medium','low')),
  requires_description_review boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.opportunity_role_taxonomy (slug,name,category,confidence_tier,requires_description_review) values
('data-analyst','Data Analyst','data-analytics','high',false),
('senior-data-analyst','Senior Data Analyst','data-analytics','high',false),
('business-intelligence-analyst','Business Intelligence Analyst','data-analytics','high',false),
('bi-developer','BI Developer','data-analytics','high',false),
('analytics-engineer','Analytics Engineer','data-analytics','high',false),
('data-engineer','Data Engineer','data-analytics','high',false),
('data-scientist','Data Scientist','data-analytics','high',false),
('decision-scientist','Decision Scientist','data-analytics','high',false),
('product-analyst','Product Analyst','data-analytics','high',false),
('marketing-analyst','Marketing Analyst','data-analytics','high',false),
('crm-analyst','CRM Analyst','data-analytics','high',false),
('digital-analyst','Digital Analyst','data-analytics','high',false),
('web-analyst','Web Analyst','data-analytics','high',false),
('insight-analyst','Insight Analyst','data-analytics','high',false),
('statistician','Statistician','data-analytics','high',false),
('quantitative-analyst','Quantitative Analyst','data-analytics','high',false),
('data-quality-analyst','Data Quality Analyst','data-analytics','high',false),
('data-governance','Data Governance','data-analytics','high',false),
('data-architect','Data Architect','data-infrastructure','high',false),
('ai-engineer','AI Engineer','ai-ml','high',false),
('machine-learning-engineer','Machine Learning Engineer','ai-ml','high',false),
('applied-scientist','Applied Scientist','ai-ml','high',false),
('nlp-engineer','NLP Engineer','ai-ml','high',false),
('computer-vision-engineer','Computer Vision Engineer','ai-ml','high',false),
('generative-ai-engineer','Generative AI Engineer','ai-ml','high',false),
('llm-engineer','LLM Engineer','ai-ml','high',false),
('mlops-engineer','MLOps Engineer','ai-ml','high',false),
('data-platform-engineer','Data Platform Engineer','data-infrastructure','high',false),
('database-engineer','Database Engineer','data-infrastructure','high',false),
('cloud-data-engineer','Cloud Data Engineer','data-infrastructure','high',false),
('data-warehouse-engineer','Data Warehouse Engineer','data-infrastructure','high',false),
('business-analyst','Business Analyst','adjacent-analytical','medium',true),
('performance-analyst','Performance Analyst','adjacent-analytical','medium',true),
('research-analyst','Research Analyst','adjacent-analytical','medium',true),
('commercial-analyst','Commercial Analyst','adjacent-analytical','medium',true),
('product-manager-ai','Product Manager — AI','adjacent-analytical','medium',true)
on conflict (slug) do update set name=excluded.name,category=excluded.category,confidence_tier=excluded.confidence_tier,requires_description_review=excluded.requires_description_review,is_active=true;

create table if not exists public.opportunity_verification_checks (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  check_type text not null,
  result text not null check (result in ('pass','warn','fail','unknown')),
  score integer check (score is null or score between 0 and 100),
  detail text,
  checked_at timestamptz not null default now(),
  checked_by text not null default 'system'
);

create index if not exists idx_opportunities_review_queue on public.opportunities(review_required,verification_status,status,updated_at desc);
create index if not exists idx_opportunities_reverify on public.opportunities(next_verification_at) where status='published';
create index if not exists idx_opportunities_external_job on public.opportunities(external_job_id) where external_job_id is not null;
create index if not exists idx_opportunity_checks_opportunity on public.opportunity_verification_checks(opportunity_id,checked_at desc);

alter table public.opportunity_role_taxonomy enable row level security;
alter table public.opportunity_verification_checks enable row level security;

drop policy if exists "role taxonomy readable" on public.opportunity_role_taxonomy;
create policy "role taxonomy readable" on public.opportunity_role_taxonomy for select to public using (is_active);

drop policy if exists "admins read opportunity checks" on public.opportunity_verification_checks;
create policy "admins read opportunity checks" on public.opportunity_verification_checks for select to authenticated using (public.is_admin());
drop policy if exists "admins manage opportunity checks" on public.opportunity_verification_checks;
create policy "admins manage opportunity checks" on public.opportunity_verification_checks for all to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.enforce_auto_opportunity_publication()
returns trigger language plpgsql as $$
begin
  if new.status='published' and new.publication_mode='auto' then
    if coalesce(new.data_ai_relevance_score,0) < 85
      or new.data_ai_relevance_status <> 'high'
      or coalesce(new.verification_score,0) < 85
      or new.verification_status not in ('high_confidence','verified')
      or new.review_required
      or coalesce(new.suspicion_score,100) > 20
      or coalesce(new.organisation,'') = ''
      or coalesce(new.official_application_url,new.source_url,'') = ''
      or (new.closes_at is not null and new.closes_at <= now()) then
        raise exception 'Opportunity does not meet Mettelo auto-publication requirements';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_auto_opportunity_publication on public.opportunities;
create trigger trg_enforce_auto_opportunity_publication before insert or update of status,publication_mode,data_ai_relevance_score,data_ai_relevance_status,verification_score,verification_status,review_required,suspicion_score,organisation,official_application_url,source_url,closes_at on public.opportunities for each row execute function public.enforce_auto_opportunity_publication();
