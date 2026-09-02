-- Project Experience V2 — reusable source/provider registry.
--
-- Provider identity should not be copied into every project resource. This table
-- owns reusable attribution metadata while the existing provider_name/provider_url
-- columns remain a compatibility fallback for legacy/imported records.

create table if not exists public.project_resource_providers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null unique,
  website_url text,
  logo_asset_path text,
  is_active boolean not null default true,
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_resource_providers_slug_check check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint project_resource_providers_website_url_check check (website_url is null or website_url ~* '^https://'),
  constraint project_resource_providers_logo_asset_path_check check (
    logo_asset_path is null
    or (
      logo_asset_path like '/%'
      and logo_asset_path not like '//%'
      and logo_asset_path not like '%..%'
    )
  )
);

create index if not exists project_resource_providers_active_name_idx
  on public.project_resource_providers(is_active,name);

alter table public.project_data_sources
  add column if not exists provider_id uuid references public.project_resource_providers(id) on delete set null;

create index if not exists project_data_sources_provider_idx
  on public.project_data_sources(provider_id,project_id);

alter table public.project_resource_providers enable row level security;

drop policy if exists "active project resource providers are readable" on public.project_resource_providers;
create policy "active project resource providers are readable"
on public.project_resource_providers
for select
to anon,authenticated
using (
  is_active
  or coalesce((select auth.jwt()->'app_metadata'->>'role'),'')='admin'
);

-- Provider records are governance metadata, not arbitrary project copy. Creation
-- and maintenance therefore stays with Admin/service-side governance workflows.
-- Project Architects select an existing provider or leave the provider unresolved;
-- they do not silently create a new provider while creating a project.
grant select on public.project_resource_providers to anon,authenticated;
grant select,insert,update,delete on public.project_resource_providers to service_role;
grant select,insert,update,delete on public.project_resource_providers to postgres;

grant select,insert,update,delete on public.project_data_sources to service_role;
