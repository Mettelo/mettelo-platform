drop policy if exists "projects readable authenticated" on public.projects;
create policy "projects readable authenticated" on public.projects for select to authenticated using ((visibility='public' and status = any (array['pilot','recruiting','active','review','completed'])) or visibility='members' or public.is_project_member(id) or public.is_admin());

drop policy if exists "project roles readable authenticated" on public.project_roles;
create policy "project roles readable authenticated" on public.project_roles for select to authenticated using (exists (select 1 from public.projects p where p.id=project_roles.project_id and ((p.visibility='public' and p.status = any (array['pilot','recruiting','active','review','completed'])) or p.visibility='members' or public.is_project_member(p.id))) or public.is_admin());
