create table if not exists public.opportunity_ingestion_sources (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('greenhouse','lever')),
  organisation_name text not null,
  source_key text not null,
  region text not null default 'global' check (region in ('global','eu')),
  employer_domain text,
  is_active boolean not null default true,
  auto_publish_enabled boolean not null default true,
  last_synced_at timestamptz,
  last_sync_status text,
  last_sync_error text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider, source_key, region)
);

create table if not exists public.opportunity_ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.opportunity_ingestion_sources(id) on delete cascade,
  status text not null default 'running' check (status in ('running','completed','failed')),
  discovered_count integer not null default 0,
  ingested_count integer not null default 0,
  published_count integer not null default 0,
  review_count integer not null default 0,
  rejected_count integer not null default 0,
  error_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.opportunities add column if not exists ingestion_source_id uuid references public.opportunity_ingestion_sources(id) on delete set null;
create unique index if not exists opportunities_source_external_job_id_uidx on public.opportunities(ingestion_source_id,external_job_id) where ingestion_source_id is not null and external_job_id is not null;
create index if not exists opportunity_ingestion_sources_active_idx on public.opportunity_ingestion_sources(is_active,provider);
create index if not exists opportunity_ingestion_runs_source_idx on public.opportunity_ingestion_runs(source_id,started_at desc);

alter table public.opportunity_ingestion_sources enable row level security;
alter table public.opportunity_ingestion_runs enable row level security;

drop policy if exists "admins manage opportunity ingestion sources" on public.opportunity_ingestion_sources;
create policy "admins manage opportunity ingestion sources" on public.opportunity_ingestion_sources for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins read opportunity ingestion runs" on public.opportunity_ingestion_runs;
create policy "admins read opportunity ingestion runs" on public.opportunity_ingestion_runs for select to authenticated using (public.is_admin());
