-- Phase 6: governed project meetings, presentations and learning events.

alter table public.project_meetings
  add column if not exists event_type text not null default 'team_working_session',
  add column if not exists visibility text not null default 'project_team',
  add column if not exists agenda text,
  add column if not exists learning_objectives text,
  add column if not exists timezone text not null default 'Europe/London',
  add column if not exists registration_deadline timestamptz,
  add column if not exists capacity integer,
  add column if not exists approval_required boolean not null default false,
  add column if not exists linked_milestone_id uuid references public.project_milestones(id) on delete set null,
  add column if not exists linked_deliverable_id uuid references public.project_deliverables(id) on delete set null,
  add column if not exists previous_event_id uuid references public.project_meetings(id) on delete set null,
  add column if not exists provider text not null default 'livekit',
  add column if not exists provider_room_name text,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

alter table public.project_meetings drop constraint if exists project_meetings_event_type_check;
alter table public.project_meetings add constraint project_meetings_event_type_check check (event_type in ('team_working_session','project_review','final_presentation','learning_session'));
alter table public.project_meetings drop constraint if exists project_meetings_visibility_check;
alter table public.project_meetings add constraint project_meetings_visibility_check check (visibility in ('project_team','named_members','community_learning','approval_required'));
alter table public.project_meetings drop constraint if exists project_meetings_capacity_check;
alter table public.project_meetings add constraint project_meetings_capacity_check check (capacity is null or capacity between 1 and 500);

create table if not exists public.project_event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.project_meetings(id) on delete cascade,
  project_run_id uuid not null references public.project_runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_role text not null check (event_role in ('learner','observer','presenter','required_attendee')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(event_id,user_id)
);

create table if not exists public.project_event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.project_meetings(id) on delete cascade,
  project_run_id uuid not null references public.project_runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_role text not null default 'learner' check (event_role in ('learner','observer')),
  status text not null default 'reserved' check (status in ('reserved','pending_approval','waitlisted','offered','cancelled','declined')),
  offered_until timestamptz,
  registered_at timestamptz not null default now(),
  cancelled_at timestamptz,
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  unique(event_id,user_id)
);

create table if not exists public.project_event_resources (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.project_meetings(id) on delete cascade,
  project_run_id uuid not null references public.project_runs(id) on delete cascade,
  title text not null,
  external_url text not null check (external_url ~ '^https://'),
  is_approved_for_attendees boolean not null default false,
  added_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.project_event_attendance (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.project_meetings(id) on delete cascade,
  project_run_id uuid not null references public.project_runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider_participant_id text,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  source text not null default 'provider' check (source in ('provider','admin_correction')),
  unique(event_id,user_id,joined_at)
);

create table if not exists public.project_event_reviews (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.project_meetings(id) on delete restrict,
  project_run_id uuid not null references public.project_runs(id) on delete cascade,
  reviewer_user_id uuid not null references auth.users(id) on delete restrict,
  outcome text not null check (outcome in ('pass','revisions_required','not_passed')),
  reason text not null,
  action_items text,
  created_at timestamptz not null default now(),
  unique(event_id)
);

create table if not exists public.project_event_audit (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.project_meetings(id) on delete cascade,
  project_run_id uuid not null references public.project_runs(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists project_meetings_run_start_idx on public.project_meetings(project_run_id,starts_at,status);
create index if not exists project_meetings_milestone_idx on public.project_meetings(linked_milestone_id) where linked_milestone_id is not null;
create index if not exists project_meetings_deliverable_idx on public.project_meetings(linked_deliverable_id) where linked_deliverable_id is not null;
create index if not exists project_meetings_previous_event_idx on public.project_meetings(previous_event_id) where previous_event_id is not null;
create index if not exists project_event_participant_user_idx on public.project_event_participants(user_id,event_id);
create index if not exists project_event_registration_queue_idx on public.project_event_registrations(event_id,status,registered_at);
create index if not exists project_event_user_upcoming_idx on public.project_event_registrations(user_id,status,registered_at desc);
create index if not exists project_event_resource_event_idx on public.project_event_resources(event_id,is_approved_for_attendees);
create index if not exists project_event_attendance_event_idx on public.project_event_attendance(event_id,user_id);
create index if not exists project_event_review_run_idx on public.project_event_reviews(project_run_id,created_at desc);
create index if not exists project_event_audit_run_idx on public.project_event_audit(project_run_id,created_at desc);

create or replace function public.mettelo_can_access_project_event(target_event uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists (
    select 1 from public.project_meetings e
    where e.id=target_event and (
      public.mettelo_is_run_member(e.project_run_id)
      or exists(select 1 from public.project_event_participants p where p.event_id=e.id and p.user_id=auth.uid())
      or exists(select 1 from public.project_event_registrations r where r.event_id=e.id and r.user_id=auth.uid() and r.status in ('reserved','offered'))
    )
  );
$$;
revoke all on function public.mettelo_can_access_project_event(uuid) from public;
grant execute on function public.mettelo_can_access_project_event(uuid) to authenticated;

alter table public.project_event_participants enable row level security;
alter table public.project_event_registrations enable row level security;
alter table public.project_event_resources enable row level security;
alter table public.project_event_attendance enable row level security;
alter table public.project_event_reviews enable row level security;
alter table public.project_event_audit enable row level security;

create policy "event invitees read own invitation" on public.project_event_participants for select to authenticated using (user_id=(select auth.uid()) or public.mettelo_is_run_member(project_run_id));
create policy "event leads manage invitations" on public.project_event_participants for all to authenticated using (public.mettelo_is_run_lead(project_run_id)) with check (public.mettelo_is_run_lead(project_run_id));
create policy "members read own registration" on public.project_event_registrations for select to authenticated using (user_id=(select auth.uid()) or public.mettelo_is_run_lead(project_run_id));
create policy "members create own registration" on public.project_event_registrations for insert to authenticated with check (user_id=(select auth.uid()));
create policy "members cancel own registration" on public.project_event_registrations for update to authenticated using (user_id=(select auth.uid()) or public.mettelo_is_run_lead(project_run_id)) with check (user_id=(select auth.uid()) or public.mettelo_is_run_lead(project_run_id));
create policy "attendees read approved event resources" on public.project_event_resources for select to authenticated using (public.mettelo_is_run_member(project_run_id) or (is_approved_for_attendees and public.mettelo_can_access_project_event(event_id)));
create policy "event leads manage resources" on public.project_event_resources for all to authenticated using (public.mettelo_is_run_lead(project_run_id)) with check (public.mettelo_is_run_lead(project_run_id));
create policy "members read own attendance" on public.project_event_attendance for select to authenticated using (user_id=(select auth.uid()) or public.mettelo_is_run_lead(project_run_id));
create policy "event leads read reviews" on public.project_event_reviews for select to authenticated using (public.mettelo_is_run_member(project_run_id));
create policy "reviewers create review" on public.project_event_reviews for insert to authenticated with check (reviewer_user_id=(select auth.uid()) and public.mettelo_is_run_member(project_run_id));
create policy "admins read event audit" on public.project_event_audit for select to authenticated using (coalesce(auth.jwt()->'app_metadata'->>'role','')='admin');

grant select on public.project_event_participants,public.project_event_registrations,public.project_event_resources,public.project_event_attendance,public.project_event_reviews to authenticated;
grant insert,update on public.project_event_registrations to authenticated;
grant insert,update,delete on public.project_event_participants,public.project_event_resources to authenticated;
grant insert on public.project_event_reviews to authenticated;

create or replace function public.guard_project_event_review_independence()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if exists(select 1 from public.project_event_participants where event_id=new.event_id and user_id=new.reviewer_user_id and event_role='presenter') then
    raise exception 'A presenter cannot review their own project event';
  end if;
  if not exists(select 1 from public.project_members where project_run_id=new.project_run_id and user_id=new.reviewer_user_id and team_role='reviewer' and membership_status in ('active','completed'))
     and coalesce(auth.jwt()->'app_metadata'->>'role','') <> 'admin' then
    raise exception 'An independent Project Reviewer is required';
  end if;
  return new;
end;
$$;
drop trigger if exists guard_project_event_review_independence on public.project_event_reviews;
create trigger guard_project_event_review_independence before insert on public.project_event_reviews for each row execute function public.guard_project_event_review_independence();

create or replace function public.guard_required_event_review_before_completion()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status='completed' and old.status is distinct from 'completed' and exists(
    select 1 from public.project_meetings e
    where e.project_run_id=new.id and e.event_type in ('project_review','final_presentation') and e.status<>'cancelled'
      and not exists(select 1 from public.project_event_reviews r where r.event_id=e.id and r.outcome='pass')
  ) then raise exception 'Required project event reviews must pass before completion'; end if;
  return new;
end;
$$;
drop trigger if exists guard_required_event_reviews_on_completion on public.project_runs;
create trigger guard_required_event_reviews_on_completion before update of status on public.project_runs for each row execute function public.guard_required_event_review_before_completion();

comment on table public.project_event_registrations is 'Event-only access. A registration must never be treated as project membership.';
comment on table public.project_event_attendance is 'Supporting evidence only; attendance does not create Mettelo Proof.';
