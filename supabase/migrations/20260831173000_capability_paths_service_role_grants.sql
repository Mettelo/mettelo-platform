-- Capability Paths V1 hardening: explicit service-role privileges.
-- Clean environments must not rely on historical hosted grants.

grant select,insert,update,delete on table public.capabilities to service_role;
grant select,insert,update,delete on table public.project_capabilities to service_role;
grant select,insert,update,delete on table public.capability_paths to service_role;
grant select,insert,update,delete on table public.capability_path_stages to service_role;
grant select,insert,update,delete on table public.capability_path_projects to service_role;
grant select,insert,update,delete on table public.member_capability_paths to service_role;
grant select,insert on table public.capability_path_lifecycle_events to service_role;

grant execute on function public.admin_replace_capability_path_structure(uuid,jsonb,jsonb) to service_role;
grant execute on function public.admin_replace_project_capabilities(uuid,uuid[]) to service_role;
