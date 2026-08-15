create index if not exists project_application_events_actor_user_idx
  on public.project_application_events(actor_user_id);

drop policy if exists "members read own project application events" on public.project_application_events;
drop policy if exists "admins read project application events" on public.project_application_events;

create policy "members or admins read project application events"
on public.project_application_events
for select
to authenticated
using (
  ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  or exists (
    select 1
    from public.project_applications pa
    where pa.id = application_id
      and pa.user_id = (select auth.uid())
  )
);
