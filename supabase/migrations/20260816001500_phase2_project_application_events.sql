create table if not exists public.project_application_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.project_applications(id) on delete cascade,
  from_status text,
  to_status text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists project_application_events_application_created_idx
  on public.project_application_events(application_id, created_at);

alter table public.project_application_events enable row level security;

drop policy if exists "members read own project application events" on public.project_application_events;
create policy "members read own project application events"
on public.project_application_events
for select
to authenticated
using (
  exists (
    select 1
    from public.project_applications pa
    where pa.id = application_id
      and pa.user_id = (select auth.uid())
  )
);

drop policy if exists "admins read project application events" on public.project_application_events;
create policy "admins read project application events"
on public.project_application_events
for select
to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create or replace function public.record_project_application_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.project_application_events(application_id, from_status, to_status, actor_user_id, created_at)
    values (new.id, null, new.status, auth.uid(), coalesce(new.submitted_at, now()));
  elsif old.status is distinct from new.status then
    insert into public.project_application_events(application_id, from_status, to_status, actor_user_id, created_at)
    values (new.id, old.status, new.status, auth.uid(), coalesce(new.updated_at, now()));
  end if;
  return new;
end;
$$;

drop trigger if exists project_application_event_audit on public.project_applications;
create trigger project_application_event_audit
after insert or update of status on public.project_applications
for each row execute function public.record_project_application_event();

insert into public.project_application_events(application_id, from_status, to_status, actor_user_id, created_at)
select pa.id, null, 'submitted', null, pa.submitted_at
from public.project_applications pa
where not exists (
  select 1 from public.project_application_events e
  where e.application_id = pa.id and e.to_status = 'submitted'
);

insert into public.project_application_events(application_id, from_status, to_status, actor_user_id, created_at)
select pa.id, 'submitted', pa.status, null, coalesce(pa.updated_at, pa.submitted_at)
from public.project_applications pa
where pa.status <> 'submitted'
  and not exists (
    select 1 from public.project_application_events e
    where e.application_id = pa.id and e.to_status = pa.status
  );
