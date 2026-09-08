-- Project Experience Phase 18: governed collaboration need foundation.
--
-- This is the missing PROJECT -> RUN -> COLLABORATION NEED link required by
-- Phase 18. It deliberately stores only recruitment intent that is not already
-- canonical elsewhere. Team size, open places, joining cutoff, project stage,
-- recruitment state and public project content continue to derive live from
-- projects/project_runs/project_members and are never copied into this table.

create table if not exists public.project_collaboration_needs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  project_run_id uuid not null references public.project_runs(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  source_project_role_id uuid references public.project_roles(id) on delete restrict,
  responsibility text,
  target_role_catalogue_id uuid references public.project_role_catalogue(id) on delete restrict,
  target_domain_id uuid references public.domains(id) on delete restrict,
  experience_level text check (experience_level is null or experience_level in ('entry','mid','senior','lead','executive')),
  weekly_commitment text,
  member_message text check (member_message is null or char_length(btrim(member_message)) between 1 and 800),
  status text not null default 'active' check (status in ('active','closed','cancelled')),
  source text not null default 'member' check (source in ('member','phase15_solo_to_team','phase16_replacement','admin')),
  closed_reason text,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_collaboration_need_status_check check (
    (status='active' and closed_at is null)
    or (status in ('closed','cancelled') and closed_at is not null)
  ),
  constraint project_collaboration_need_message_trimmed check (
    member_message is null or member_message=btrim(member_message)
  ),
  constraint project_collaboration_need_responsibility_trimmed check (
    responsibility is null or (responsibility=btrim(responsibility) and char_length(responsibility) between 1 and 160)
  )
);

create table if not exists public.project_collaboration_need_capabilities (
  collaboration_need_id uuid not null references public.project_collaboration_needs(id) on delete cascade,
  capability_id uuid not null references public.capabilities(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key(collaboration_need_id,capability_id)
);

create index if not exists project_collaboration_needs_discovery_idx
  on public.project_collaboration_needs(status,created_at desc,project_id,project_run_id);
create index if not exists project_collaboration_needs_project_run_idx
  on public.project_collaboration_needs(project_id,project_run_id,status);
create index if not exists project_collaboration_needs_role_idx
  on public.project_collaboration_needs(target_role_catalogue_id,status)
  where target_role_catalogue_id is not null;
create index if not exists project_collaboration_needs_domain_idx
  on public.project_collaboration_needs(target_domain_id,status)
  where target_domain_id is not null;
create index if not exists project_collaboration_need_capabilities_capability_idx
  on public.project_collaboration_need_capabilities(capability_id,collaboration_need_id);

-- Prevent duplicate active vacancies for the same canonical need. A responsibility
-- can have only one live recruitment record in the same run. Needs not tied to a
-- responsibility are de-duplicated by their target role in that run.
create unique index if not exists project_collaboration_needs_one_active_responsibility
  on public.project_collaboration_needs(project_run_id,lower(responsibility))
  where status='active' and responsibility is not null;
create unique index if not exists project_collaboration_needs_one_active_role
  on public.project_collaboration_needs(project_run_id,target_role_catalogue_id)
  where status='active' and responsibility is null and target_role_catalogue_id is not null;

alter table public.project_collaboration_needs enable row level security;
alter table public.project_collaboration_need_capabilities enable row level security;

-- Authenticated members may discover only active opportunities belonging to a
-- public/member-visible project and a currently forming/active run. Public web
-- exposure is intentionally server-projected later; anon receives no table grant.
drop policy if exists project_collaboration_needs_member_read on public.project_collaboration_needs;
create policy project_collaboration_needs_member_read
on public.project_collaboration_needs
for select
to authenticated
using (
  status='active'
  and exists (
    select 1 from public.projects p
    where p.id=project_collaboration_needs.project_id
      and p.visibility in ('public','members')
      and p.status not in ('cancelled','completed','archived')
  )
  and exists (
    select 1 from public.project_runs r
    where r.id=project_collaboration_needs.project_run_id
      and r.project_id=project_collaboration_needs.project_id
      and r.status in ('forming','active')
  )
);

drop policy if exists project_collaboration_need_capabilities_member_read on public.project_collaboration_need_capabilities;
create policy project_collaboration_need_capabilities_member_read
on public.project_collaboration_need_capabilities
for select
to authenticated
using (
  exists (
    select 1 from public.project_collaboration_needs n
    where n.id=project_collaboration_need_capabilities.collaboration_need_id
      and n.status='active'
  )
);

revoke all on table public.project_collaboration_needs from anon,authenticated;
revoke all on table public.project_collaboration_need_capabilities from anon,authenticated;
grant select on table public.project_collaboration_needs to authenticated;
grant select on table public.project_collaboration_need_capabilities to authenticated;
grant all on table public.project_collaboration_needs to service_role;
grant all on table public.project_collaboration_need_capabilities to service_role;

create or replace function public.phase18_validate_collaboration_need_context()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  run_project uuid;
  role_project uuid;
  responsibility_known boolean:=false;
begin
  select project_id into run_project from public.project_runs where id=new.project_run_id;
  if run_project is null or run_project<>new.project_id then
    raise exception using errcode='23514',message='COLLABORATION_NEED_RUN_PROJECT_MISMATCH';
  end if;

  if new.source_project_role_id is not null then
    select project_id into role_project from public.project_roles where id=new.source_project_role_id;
    if role_project is null or role_project<>new.project_id then
      raise exception using errcode='23514',message='COLLABORATION_NEED_ROLE_PROJECT_MISMATCH';
    end if;
  end if;

  if new.responsibility is not null then
    select exists(
      select 1
      from public.project_roles pr,
           unnest(coalesce(pr.responsibilities,array[]::text[])) item(value)
      where pr.project_id=new.project_id
        and (new.source_project_role_id is null or pr.id=new.source_project_role_id)
        and lower(btrim(item.value))=lower(btrim(new.responsibility))
    ) into responsibility_known;
    if not responsibility_known then
      raise exception using errcode='23514',message='COLLABORATION_NEED_RESPONSIBILITY_NOT_CANONICAL';
    end if;
    new.responsibility=btrim(new.responsibility);
  end if;

  if new.member_message is not null then new.member_message=btrim(new.member_message); end if;
  if new.weekly_commitment is not null then new.weekly_commitment=nullif(btrim(new.weekly_commitment),''); end if;
  new.updated_at=now();
  return new;
end;
$$;

revoke all on function public.phase18_validate_collaboration_need_context() from public,anon,authenticated;

drop trigger if exists project_collaboration_need_context_guard on public.project_collaboration_needs;
create trigger project_collaboration_need_context_guard
before insert or update
on public.project_collaboration_needs
for each row execute function public.phase18_validate_collaboration_need_context();

comment on table public.project_collaboration_needs is
  'Phase 18 governed collaboration recruitment intent tied to one canonical project run. Capacity, joining state and project content are derived live and are not duplicated here.';
comment on table public.project_collaboration_need_capabilities is
  'Canonical capability references requested by a Phase 18 collaboration need.';
