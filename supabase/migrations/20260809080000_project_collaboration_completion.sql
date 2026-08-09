alter table public.projects add column if not exists presentation_required boolean not null default false;
alter table public.project_milestones add column if not exists is_required boolean not null default true;
alter table public.project_tasks add column if not exists is_required boolean not null default true;

create table if not exists public.project_discussions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  author_user_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references public.project_discussions(id) on delete cascade,
  message_type text not null default 'update' check (message_type = any (array['update','question','blocker','decision'])),
  body text not null check (char_length(body) between 1 and 5000),
  mentioned_user_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_resources (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  resource_type text not null check (resource_type = any (array['github','google_drive','onedrive','figma','canva','power_bi','tableau','looker','dataset','documentation','other'])),
  url text not null,
  description text,
  added_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.project_meetings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  purpose text,
  platform text not null check (platform = any (array['google_meet','microsoft_teams','zoom','other'])),
  starts_at timestamptz not null,
  ends_at timestamptz,
  join_url text not null,
  organiser_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'scheduled' check (status = any (array['scheduled','completed','cancelled'])),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.presentation_slots (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  meeting_url text,
  location_label text,
  status text not null default 'available' check (status = any (array['available','booked','closed'])),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(starts_at, ends_at)
);

create table if not exists public.project_presentations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects(id) on delete cascade,
  slot_id uuid references public.presentation_slots(id) on delete set null,
  meeting_url text,
  deck_url text,
  status text not null default 'not_booked' check (status = any (array['not_booked','booked','presented','verified','changes_required'])),
  reviewer_notes text,
  booked_by uuid references auth.users(id) on delete set null,
  presented_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_presenters (
  presentation_id uuid not null references public.project_presentations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (presentation_id, user_id)
);

create index if not exists idx_project_discussions_project_created on public.project_discussions(project_id, created_at desc);
create index if not exists idx_project_discussions_author on public.project_discussions(author_user_id);
create index if not exists idx_project_resources_project on public.project_resources(project_id, created_at desc);
create index if not exists idx_project_meetings_project_starts on public.project_meetings(project_id, starts_at);
create index if not exists idx_project_meetings_organiser on public.project_meetings(organiser_user_id);
create index if not exists idx_presentation_slots_status_starts on public.presentation_slots(status, starts_at);
create index if not exists idx_project_presentations_slot on public.project_presentations(slot_id);
create index if not exists idx_project_presentations_booked_by on public.project_presentations(booked_by);
create index if not exists idx_project_presenters_user on public.project_presenters(user_id);

alter table public.project_discussions enable row level security;
alter table public.project_resources enable row level security;
alter table public.project_meetings enable row level security;
alter table public.presentation_slots enable row level security;
alter table public.project_presentations enable row level security;
alter table public.project_presenters enable row level security;

create policy "project discussions readable by members" on public.project_discussions for select to authenticated using (public.is_project_member(project_id) or public.is_admin());
create policy "project discussions insertable by members" on public.project_discussions for insert to authenticated with check ((select auth.uid())=author_user_id and public.is_project_member(project_id));
create policy "project discussions editable by author or lead" on public.project_discussions for update to authenticated using ((select auth.uid())=author_user_id or public.is_project_lead(project_id)) with check ((select auth.uid())=author_user_id or public.is_project_lead(project_id));

create policy "project resources readable by members" on public.project_resources for select to authenticated using (public.is_project_member(project_id) or public.is_admin());
create policy "project resources insertable by members" on public.project_resources for insert to authenticated with check ((select auth.uid())=added_by and public.is_project_member(project_id));
create policy "project resources manageable by author or lead" on public.project_resources for delete to authenticated using ((select auth.uid())=added_by or public.is_project_lead(project_id));

create policy "project meetings readable by members" on public.project_meetings for select to authenticated using (public.is_project_member(project_id) or public.is_admin());
create policy "project meetings insertable by leads" on public.project_meetings for insert to authenticated with check (public.is_project_lead(project_id) and (select auth.uid())=organiser_user_id);
create policy "project meetings updatable by leads" on public.project_meetings for update to authenticated using (public.is_project_lead(project_id)) with check (public.is_project_lead(project_id));
create policy "project meetings deletable by leads" on public.project_meetings for delete to authenticated using (public.is_project_lead(project_id));

create policy "presentation slots readable authenticated" on public.presentation_slots for select to authenticated using (status='available' or public.is_admin());
create policy "admins manage presentation slots" on public.presentation_slots for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "project presentations readable by members" on public.project_presentations for select to authenticated using (public.is_project_member(project_id) or public.is_admin());
create policy "project presentations insertable by leads" on public.project_presentations for insert to authenticated with check (public.is_project_lead(project_id));
create policy "project presentations updatable by leads" on public.project_presentations for update to authenticated using (public.is_project_lead(project_id)) with check (public.is_project_lead(project_id));

create policy "project presenters readable by project members" on public.project_presenters for select to authenticated using (exists(select 1 from public.project_presentations pp where pp.id=project_presenters.presentation_id and (public.is_project_member(pp.project_id) or public.is_admin())));
create policy "project presenters manageable by leads" on public.project_presenters for all to authenticated using (exists(select 1 from public.project_presentations pp where pp.id=project_presenters.presentation_id and public.is_project_lead(pp.project_id))) with check (exists(select 1 from public.project_presentations pp where pp.id=project_presenters.presentation_id and public.is_project_lead(pp.project_id)));

create or replace function public.project_completion_readiness(target_project uuid)
returns jsonb
language sql
stable
set search_path=public
as $$
  with p as (select id,presentation_required from public.projects where id=target_project),
  m as (select count(*) filter (where is_required) required_count,count(*) filter (where is_required and status='completed') completed_count from public.project_milestones where project_id=target_project),
  t as (select count(*) filter (where is_required) required_count,count(*) filter (where is_required and status='done') completed_count from public.project_tasks where project_id=target_project),
  members as (select count(*) filter (where team_role in ('contributor','project_lead')) member_count from public.project_members where project_id=target_project),
  verified_members as (select count(distinct c.user_id) verified_count from public.contributions c join public.project_members pm on pm.project_id=c.project_id and pm.user_id=c.user_id where c.project_id=target_project and pm.team_role in ('contributor','project_lead') and c.verification_status='verified'),
  pending as (select count(*) pending_count from public.contributions where project_id=target_project and verification_status in ('pending','needs_changes')),
  pres as (select status from public.project_presentations where project_id=target_project)
  select jsonb_build_object(
    'ready',(m.required_count>0 and m.required_count=m.completed_count and t.required_count=t.completed_count and pending.pending_count=0 and members.member_count=verified_members.verified_count and (not p.presentation_required or coalesce(pres.status,'not_booked')='verified')),
    'required_milestones',m.required_count,'completed_milestones',m.completed_count,
    'required_tasks',t.required_count,'completed_tasks',t.completed_count,
    'project_members_requiring_proof',members.member_count,'members_with_verified_proof',verified_members.verified_count,
    'pending_contributions',pending.pending_count,'presentation_required',p.presentation_required,'presentation_status',coalesce(pres.status,'not_booked')
  ) from p,m,t,members,verified_members,pending left join pres on true;
$$;
revoke all on function public.project_completion_readiness(uuid) from public;
grant execute on function public.project_completion_readiness(uuid) to authenticated;

create or replace function public.enforce_project_completion()
returns trigger language plpgsql set search_path=public as $$
declare readiness jsonb;
begin
  if new.status='completed' and old.status is distinct from 'completed' then
    readiness:=public.project_completion_readiness(new.id);
    if coalesce((readiness->>'ready')::boolean,false) is not true then raise exception 'Project is not ready for completion: %',readiness::text; end if;
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_project_completion() from public;
drop trigger if exists trg_enforce_project_completion on public.projects;
create trigger trg_enforce_project_completion before update of status on public.projects for each row execute function public.enforce_project_completion();