-- Capability Paths V1 Phase 2: Admin lifecycle governance.
-- Additive only. No workbook data is imported by this migration.

alter table public.capability_paths
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists updated_by uuid references public.profiles(id) on delete set null,
  add column if not exists published_by uuid references public.profiles(id) on delete set null,
  add column if not exists archived_by uuid references public.profiles(id) on delete set null;

create index if not exists capability_paths_updated_at_idx
  on public.capability_paths(updated_at desc);

comment on column public.capability_paths.created_by is 'Admin user who created the path.';
comment on column public.capability_paths.updated_by is 'Admin user who most recently changed path authoring data.';
comment on column public.capability_paths.published_by is 'Admin user who most recently published the path.';
comment on column public.capability_paths.archived_by is 'Admin user who most recently archived the path.';
