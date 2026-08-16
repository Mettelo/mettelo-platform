drop policy if exists "applications updatable authenticated" on public.project_applications;

create policy "applications updatable by admin"
on public.project_applications
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());
