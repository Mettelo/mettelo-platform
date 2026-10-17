-- Phase 2B catalogue foundation, ADDITIVE ONLY.
-- Apply to an isolated, restored test database first; never automatic Production rollout.
-- Does not read, update, or remove the 305 existing project records.
create schema if not exists catalogue_private;
revoke all on schema catalogue_private from public, anon, authenticated;
create table if not exists catalogue_private.revisions (
 id uuid primary key default gen_random_uuid(),
 source_repo text not null check (source_repo = 'Mettelo/project-library'),
 source_commit_sha text not null check (source_commit_sha ~ '^[a-f0-9]{40}$'),
 content_sha256 text not null check (content_sha256 ~ '^[a-f0-9]{64}$'),
 record_count integer not null check (record_count = 50),
 state text not null default 'staged' check (state in ('staged','validated','approved','rejected')),
 created_at timestamptz not null default now(),
 unique(source_repo,source_commit_sha,content_sha256),
 unique(id,state)
);
create table if not exists catalogue_private.projects (
 revision_id uuid not null references catalogue_private.revisions(id) on delete restrict,
 external_id text not null check (external_id ~ '^MTL-(DA|DE|DS|AI|XF|BA)-[0-9]{3}$'),
 name text not null check (length(btrim(name)) > 0),
 brief text not null check (length(btrim(brief)) > 0),
 master_repository_url text not null check (master_repository_url ~ '^https://github[.]com/Mettelo/[A-Za-z0-9_.-]+/?$'),
 metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
 created_at timestamptz not null default now(),
 primary key(revision_id,external_id),
 unique(revision_id,master_repository_url)
);
create table if not exists catalogue_private.operational_mappings (
 external_id text primary key check (external_id ~ '^MTL-(DA|DE|DS|AI|XF|BA)-[0-9]{3}$'),
 operational_project_id uuid not null unique references public.projects(id) on delete restrict,
 mapping_status text not null default 'pending' check (mapping_status in ('pending','reviewed','approved','retired')),
 recorded_at timestamptz not null default now()
);
create table if not exists catalogue_private.sync_attempts (
 id uuid primary key default gen_random_uuid(),
 revision_id uuid references catalogue_private.revisions(id) on delete restrict,
 result text not null check (result in ('started','validated','failed','promoted')),
 error_code text,
 attempted_at timestamptz not null default now()
);
alter table catalogue_private.revisions enable row level security;
alter table catalogue_private.projects enable row level security;
alter table catalogue_private.operational_mappings enable row level security;
alter table catalogue_private.sync_attempts enable row level security;
revoke all on all tables in schema catalogue_private from public, anon, authenticated;
revoke all on all sequences in schema catalogue_private from public, anon, authenticated;
-- No anonymous/authenticated policies. No publication view. No cross-schema cascade.
