-- Import-origin rows must not prevent the governed rollback function from deleting
-- import-created Draft entities. The batch + normalized rows remain the durable audit record.
alter table public.capability_path_import_path_origins
  drop constraint if exists capability_path_import_path_origins_path_id_fkey;
alter table public.capability_path_import_path_origins
  add constraint capability_path_import_path_origins_path_id_fkey
  foreign key(path_id) references public.capability_paths(id) on delete cascade;

alter table public.capability_path_import_project_origins
  drop constraint if exists capability_path_import_project_origins_project_id_fkey;
alter table public.capability_path_import_project_origins
  add constraint capability_path_import_project_origins_project_id_fkey
  foreign key(project_id) references public.projects(id) on delete cascade;

alter table public.capability_path_import_placement_origins
  drop constraint if exists capability_path_import_placement_origins_path_id_fkey;
alter table public.capability_path_import_placement_origins
  add constraint capability_path_import_placement_origins_path_id_fkey
  foreign key(path_id) references public.capability_paths(id) on delete cascade;

alter table public.capability_path_import_placement_origins
  drop constraint if exists capability_path_import_placement_origins_project_id_fkey;
alter table public.capability_path_import_placement_origins
  add constraint capability_path_import_placement_origins_project_id_fkey
  foreign key(project_id) references public.projects(id) on delete cascade;
