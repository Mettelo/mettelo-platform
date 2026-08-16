begin;

create table if not exists public.contribution_review_events (
  id uuid primary key default gen_random_uuid(),
  contribution_id uuid not null references public.contributions(id) on delete cascade,
  project_run_id uuid not null references public.project_runs(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('submitted','changes_requested','resubmitted','approved','rejected')),
  comment text,
  evidence_url text,
  created_at timestamptz not null default now()
);

create index if not exists contribution_review_events_contribution_idx on public.contribution_review_events(contribution_id,created_at desc);
create index if not exists contribution_review_events_run_idx on public.contribution_review_events(project_run_id,created_at desc);

alter table public.contribution_review_events enable row level security;

drop policy if exists "Project members can read contribution review history" on public.contribution_review_events;
create policy "Project members can read contribution review history" on public.contribution_review_events
for select using (
  exists (
    select 1 from public.contributions c
    where c.id=contribution_id and c.user_id=auth.uid()
  )
  or exists (
    select 1 from public.project_members pm
    where pm.project_run_id=contribution_review_events.project_run_id
      and pm.user_id=auth.uid()
      and pm.membership_status in ('active','completed')
  )
  or coalesce(auth.jwt()->'app_metadata'->>'role','')='admin'
);

drop policy if exists "Contributors can record their submission history" on public.contribution_review_events;
create policy "Contributors can record their submission history" on public.contribution_review_events
for insert with check (
  actor_user_id=auth.uid()
  and event_type in ('submitted','resubmitted')
  and exists (
    select 1 from public.contributions c
    where c.id=contribution_id
      and c.user_id=auth.uid()
      and c.project_run_id=contribution_review_events.project_run_id
  )
);

commit;
