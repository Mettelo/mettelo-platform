create index if not exists idx_project_tasks_milestone on public.project_tasks(milestone_id);

drop policy if exists "milestones manageable by project leads" on public.project_milestones;
create policy "leads insert milestones" on public.project_milestones for insert to authenticated with check (public.is_project_lead(project_id));
create policy "leads update milestones" on public.project_milestones for update to authenticated using (public.is_project_lead(project_id)) with check (public.is_project_lead(project_id));
create policy "leads delete milestones" on public.project_milestones for delete to authenticated using (public.is_project_lead(project_id));

drop policy if exists "tasks manageable by project leads" on public.project_tasks;
drop policy if exists "assignees update own tasks" on public.project_tasks;
create policy "leads insert tasks" on public.project_tasks for insert to authenticated with check (public.is_project_lead(project_id));
create policy "leads or assignees update tasks" on public.project_tasks for update to authenticated using (public.is_project_lead(project_id) or (select auth.uid())=assignee_user_id) with check (public.is_project_lead(project_id) or (select auth.uid())=assignee_user_id);
create policy "leads delete tasks" on public.project_tasks for delete to authenticated using (public.is_project_lead(project_id));
