create index if not exists idx_presentation_slots_created_by on public.presentation_slots(created_by);
create index if not exists idx_project_discussions_parent on public.project_discussions(parent_id);
create index if not exists idx_project_resources_added_by on public.project_resources(added_by);

drop policy if exists "admins manage presentation slots" on public.presentation_slots;
create policy "admins insert presentation slots" on public.presentation_slots for insert to authenticated with check (public.is_admin());
create policy "admins update presentation slots" on public.presentation_slots for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins delete presentation slots" on public.presentation_slots for delete to authenticated using (public.is_admin());

drop policy if exists "project presenters manageable by leads" on public.project_presenters;
create policy "project presenters insertable by leads" on public.project_presenters for insert to authenticated with check (exists(select 1 from public.project_presentations pp where pp.id=project_presenters.presentation_id and public.is_project_lead(pp.project_id)));
create policy "project presenters deletable by leads" on public.project_presenters for delete to authenticated using (exists(select 1 from public.project_presentations pp where pp.id=project_presenters.presentation_id and public.is_project_lead(pp.project_id)));