-- CI compatibility layer for project-run objects that exist in the hosted database
-- but whose original creation predates the repository's canonical migration history.
-- Applied only in the disposable local CI workdir before Phase 1 run-boundary hardening.

alter table public.projects
  add column if not exists team_size_threshold integer not null default 5,
  add column if not exists forming_deadline timestamptz,
  add column if not exists kickoff_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancellation_reason text,
  add column if not exists project_type text not null default 'open';

alter table public.project_members
  add column if not exists membership_status text not null default 'waiting',
  add column if not exists activated_at timestamptz,
  add column if not exists left_at timestamptz,
  add column if not exists project_run_id uuid references public.project_runs(id) on delete set null;

alter table public.project_discussions add column if not exists project_run_id uuid references public.project_runs(id) on delete cascade;
alter table public.project_resources add column if not exists project_run_id uuid references public.project_runs(id) on delete cascade;
alter table public.project_meetings add column if not exists project_run_id uuid references public.project_runs(id) on delete cascade;
alter table public.project_milestones add column if not exists project_run_id uuid references public.project_runs(id) on delete cascade;
alter table public.project_tasks add column if not exists project_run_id uuid references public.project_runs(id) on delete cascade;
alter table public.project_presentations add column if not exists project_run_id uuid references public.project_runs(id) on delete cascade;
alter table public.contributions add column if not exists project_run_id uuid references public.project_runs(id) on delete set null;

create index if not exists idx_project_members_run_user on public.project_members(project_run_id,user_id) where project_run_id is not null;
create index if not exists idx_project_discussions_run on public.project_discussions(project_run_id) where project_run_id is not null;
create index if not exists idx_project_resources_run on public.project_resources(project_run_id) where project_run_id is not null;
create index if not exists idx_project_meetings_run on public.project_meetings(project_run_id) where project_run_id is not null;
create index if not exists idx_project_milestones_run on public.project_milestones(project_run_id) where project_run_id is not null;
create index if not exists idx_project_tasks_run on public.project_tasks(project_run_id) where project_run_id is not null;
create index if not exists idx_project_presentations_run on public.project_presentations(project_run_id) where project_run_id is not null;
create index if not exists idx_contributions_run on public.contributions(project_run_id) where project_run_id is not null;

create or replace function public.is_project_run_member(target_run uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.project_members pm
    where pm.project_run_id=target_run
      and pm.user_id=auth.uid()
      and pm.membership_status in ('waiting','active','completed')
  );
$$;

create or replace function public.is_project_run_lead(target_run uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.project_members pm
    where pm.project_run_id=target_run
      and pm.user_id=auth.uid()
      and pm.team_role='project_lead'
      and pm.membership_status in ('active','completed')
  ) or public.is_admin();
$$;

create or replace function public.resolve_project_run(target_project uuid, actor uuid default null::uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare result uuid;
begin
  if actor is not null then
    select pm.project_run_id into result
    from public.project_members pm
    join public.project_runs pr on pr.id=pm.project_run_id
    where pm.project_id=target_project
      and pm.user_id=actor
      and pm.project_run_id is not null
      and pm.membership_status in ('waiting','active','completed')
    order by case pm.membership_status when 'active' then 1 when 'waiting' then 2 else 3 end, pr.run_number desc
    limit 1;
  end if;
  if result is null then
    select id into result
    from public.project_runs
    where project_id=target_project and status in ('forming','active','review')
    order by case status when 'forming' then 1 when 'active' then 2 else 3 end, run_number desc
    limit 1;
  end if;
  return result;
end
$$;

create or replace function public.set_project_run_from_actor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.project_run_id is null and new.project_id is not null then
    if tg_table_name='project_discussions' then new.project_run_id:=resolve_project_run(new.project_id,new.author_user_id);
    elsif tg_table_name='project_resources' then new.project_run_id:=resolve_project_run(new.project_id,new.added_by);
    elsif tg_table_name='project_meetings' then new.project_run_id:=resolve_project_run(new.project_id,new.organiser_user_id);
    elsif tg_table_name='contributions' then new.project_run_id:=resolve_project_run(new.project_id,new.user_id);
    else new.project_run_id:=resolve_project_run(new.project_id,auth.uid());
    end if;
  end if;
  return new;
end
$$;

create or replace function public.keep_open_project_available()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare target_run uuid; next_no integer;
begin
  if old.project_type='open' and new.status in ('active','review','completed') then
    select id into target_run
    from public.project_runs
    where project_id=old.id and status in ('forming','active','review')
    order by case status when 'review' then 1 when 'active' then 2 else 3 end, run_number desc
    limit 1;
    if target_run is not null then
      update public.project_runs
      set status=case new.status when 'active' then 'active' when 'review' then 'review' else 'completed' end,
          kickoff_at=case when new.status='active' then coalesce(kickoff_at,new.kickoff_at,now()) else kickoff_at end,
          completed_at=case when new.status='completed' then now() else completed_at end,
          updated_at=now()
      where id=target_run;
    end if;
    if new.status='completed' then
      select coalesce(max(run_number),0)+1 into next_no from public.project_runs where project_id=old.id;
      if not exists(select 1 from public.project_runs where project_id=old.id and status='forming') then
        insert into public.project_runs(project_id,run_number,status,team_size_threshold)
        values(old.id,next_no,'forming',old.team_size_threshold);
      end if;
    end if;
    new.status='open';
    new.kickoff_at=null;
    new.ends_at=null;
  end if;
  return new;
end
$$;
