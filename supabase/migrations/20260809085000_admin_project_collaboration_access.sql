drop policy if exists "project discussions insertable by members" on public.project_discussions;
create policy "project discussions insertable by members or admins" on public.project_discussions
for insert to authenticated
with check ((select auth.uid())=author_user_id and (public.is_project_member(project_id) or public.is_admin()));

drop policy if exists "project resources insertable by members" on public.project_resources;
create policy "project resources insertable by members or admins" on public.project_resources
for insert to authenticated
with check ((select auth.uid())=added_by and (public.is_project_member(project_id) or public.is_admin()));
