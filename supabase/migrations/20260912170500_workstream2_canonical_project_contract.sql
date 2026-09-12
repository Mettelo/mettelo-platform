-- Workstream 2 — canonical project definition / public discovery / member decision recovery.
-- Additive only: existing project IDs, slugs, applications, memberships, runs, Lab and Proof history are preserved.

-- Structured acceptance criteria and dependencies were the two missing project-definition relations.
create table if not exists public.project_acceptance_criteria (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  criterion text not null check (length(btrim(criterion)) between 3 and 1200),
  is_required boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists project_acceptance_criteria_project_idx
  on public.project_acceptance_criteria(project_id, sort_order, id);

create table if not exists public.project_dependencies (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null check (length(btrim(title)) between 2 and 180),
  description text,
  dependency_type text not null default 'other' check (dependency_type in ('data','access','tool','stakeholder','project','other')),
  is_required boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists project_dependencies_project_idx
  on public.project_dependencies(project_id, sort_order, id);

alter table public.project_acceptance_criteria enable row level security;
alter table public.project_dependencies enable row level security;

-- Definition children inherit project visibility. Public users see only children of public projects.
drop policy if exists "public read published project acceptance criteria" on public.project_acceptance_criteria;
create policy "public read published project acceptance criteria"
on public.project_acceptance_criteria for select
to anon, authenticated
using (exists (
  select 1 from public.projects p
  where p.id=project_id and p.visibility='public'
    and p.status in ('pilot','recruiting','open','forming','active','review','completed')
));

drop policy if exists "public read published project dependencies" on public.project_dependencies;
create policy "public read published project dependencies"
on public.project_dependencies for select
to anon, authenticated
using (exists (
  select 1 from public.projects p
  where p.id=project_id and p.visibility='public'
    and p.status in ('pilot','recruiting','open','forming','active','review','completed')
));

grant select on public.project_acceptance_criteria, public.project_dependencies to anon, authenticated;
grant select, insert, update, delete on public.project_acceptance_criteria, public.project_dependencies to service_role;

-- Reconciliation is diagnostic only. It deliberately does not mutate historical projects.
create or replace view public.workstream2_project_reconciliation
with (security_invoker=true)
as
select
  p.id as project_id,
  p.slug,
  p.title,
  p.status,
  p.visibility,
  p.project_type,
  p.participation_mode,
  p.min_team_size,
  p.target_team_size,
  p.max_team_size,
  array_remove(array[
    case when p.participation_mode='team' and coalesce(p.min_team_size,0)<2 then 'TEAM_MINIMUM_BELOW_2' end,
    case when coalesce(p.target_team_size,0)<coalesce(p.min_team_size,0) then 'TARGET_BELOW_MINIMUM' end,
    case when coalesce(p.max_team_size,0)<coalesce(p.target_team_size,0) then 'MAXIMUM_BELOW_TARGET' end,
    case when p.participation_mode='solo' and (p.min_team_size<>1 or p.target_team_size<>1 or p.max_team_size<>1) then 'INVALID_SOLO_GEOMETRY' end,
    case when nullif(btrim(coalesce(p.slug,'')),'') is null then 'MISSING_SLUG' end
  ],null)::text[] as reconciliation_findings
from public.projects p;

grant select on public.workstream2_project_reconciliation to service_role;

-- Canonical aggregate capacity projection. It exposes counts/geometry only, never run IDs,
-- member identities, applications, offers or Lab data.
create or replace function public.get_public_project_capacity(p_project_id uuid)
returns table(
  project_id uuid,
  participation_mode text,
  confirmed_members integer,
  reserved_members integer,
  occupied_places integer,
  min_team_size integer,
  target_team_size integer,
  max_team_size integer,
  capacity_available boolean,
  recruitment_state text
)
language plpgsql
security definer
stable
set search_path=public
as $$
declare
  v_project public.projects%rowtype;
  v_run_id uuid;
  v_confirmed integer:=0;
  v_reserved integer:=0;
begin
  select * into v_project from public.projects p
  where p.id=p_project_id
    and p.visibility='public'
    and p.status in ('pilot','recruiting','open','forming','active','review','completed');
  if not found then return; end if;

  if v_project.project_type='open' then
    select r.id into v_run_id
    from public.project_runs r
    where r.project_id=p_project_id
      and r.status in ('forming','active','review','paused')
    order by r.run_number desc
    limit 1;
  end if;

  if v_run_id is not null then
    select count(*)::integer into v_confirmed
    from public.project_members pm
    where pm.project_run_id=v_run_id
      and pm.membership_status in ('waiting','active');
  else
    select count(*)::integer into v_confirmed
    from public.project_members pm
    where pm.project_id=p_project_id
      and pm.membership_status in ('waiting','active');
  end if;

  select count(*)::integer into v_reserved
  from public.project_offers o
  where o.project_id=p_project_id
    and o.status in ('pending','accepted')
    and o.capacity_released_at is null
    and o.capacity_consumed_at is null;

  return query select
    v_project.id,
    v_project.participation_mode,
    v_confirmed,
    v_reserved,
    v_confirmed+v_reserved,
    v_project.min_team_size,
    v_project.target_team_size,
    v_project.max_team_size,
    (v_project.max_team_size is null or v_confirmed+v_reserved<v_project.max_team_size),
    case
      when v_project.status='completed' then 'completed'
      when coalesce(v_project.applications_open,false) is not true then 'closed'
      when v_project.max_team_size is not null and v_confirmed+v_reserved>=v_project.max_team_size then 'full'
      when v_project.status='active' then 'active'
      when v_confirmed>=coalesce(v_project.min_team_size,v_project.team_size_threshold,1) then 'ready_for_eligibility'
      when v_confirmed+v_reserved>0 then 'team_forming'
      else 'open'
    end;
end;
$$;
revoke all on function public.get_public_project_capacity(uuid) from public;
grant execute on function public.get_public_project_capacity(uuid) to anon, authenticated, service_role;

-- One database-authoritative publication blocker function. The existing readiness view
-- remains the canonical content/resource readiness engine; geometry and lifecycle metadata
-- are added here so the Admin UI and direct SQL/API mutation cannot disagree.
create or replace function public.workstream2_publication_blockers(p_project_id uuid)
returns text[]
language plpgsql
security definer
stable
set search_path=public
as $$
declare
  v_project public.projects%rowtype;
  v_readiness public.project_experience_readiness%rowtype;
  v_blockers text[]:='{}'::text[];
begin
  select * into v_project from public.projects where id=p_project_id;
  if not found then return array['PROJECT_NOT_FOUND']; end if;

  select * into v_readiness from public.project_experience_readiness where project_id=p_project_id;
  if found then v_blockers:=coalesce(v_readiness.publication_blockers,'{}'::text[]); else v_blockers:=array_append(v_blockers,'READINESS_UNAVAILABLE'); end if;

  if v_project.project_type not in ('open','partner') then v_blockers:=array_append(v_blockers,'PROJECT_TYPE'); end if;
  if v_project.participation_mode not in ('solo','team','flexible') then v_blockers:=array_append(v_blockers,'PARTICIPATION_MODE'); end if;
  if v_project.participation_mode='team' and coalesce(v_project.min_team_size,0)<2 then v_blockers:=array_append(v_blockers,'TEAM_MINIMUM'); end if;
  if coalesce(v_project.target_team_size,0)<coalesce(v_project.min_team_size,0) then v_blockers:=array_append(v_blockers,'TARGET_BELOW_MINIMUM'); end if;
  if coalesce(v_project.max_team_size,0)<coalesce(v_project.target_team_size,0) then v_blockers:=array_append(v_blockers,'MAXIMUM_BELOW_TARGET'); end if;
  if v_project.participation_mode='solo' and (v_project.min_team_size<>1 or v_project.target_team_size<>1 or v_project.max_team_size<>1) then v_blockers:=array_append(v_blockers,'SOLO_GEOMETRY'); end if;
  if nullif(btrim(coalesce(v_project.slug,'')),'') is null then v_blockers:=array_append(v_blockers,'SLUG'); end if;
  if nullif(btrim(coalesce(v_project.weekly_commitment,'')),'') is null then v_blockers:=array_append(v_blockers,'WEEKLY_COMMITMENT'); end if;
  if v_project.duration_weeks is null or v_project.duration_weeks<1 then v_blockers:=array_append(v_blockers,'DURATION'); end if;
  if v_project.project_type='partner' and nullif(btrim(coalesce(v_project.partner_name,'')),'') is null then v_blockers:=array_append(v_blockers,'PARTNER_NAME'); end if;
  if v_project.project_type='open' and v_project.application_deadline is not null then v_blockers:=array_append(v_blockers,'OPEN_PROJECT_DEADLINE'); end if;

  return (select coalesce(array_agg(distinct x order by x),'{}'::text[]) from unnest(v_blockers) x);
end;
$$;
revoke all on function public.workstream2_publication_blockers(uuid) from public;
grant execute on function public.workstream2_publication_blockers(uuid) to service_role;

create or replace function public.workstream2_guard_project_publication()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_blockers text[];
  v_public boolean;
begin
  v_public := new.visibility='public' and new.status in ('pilot','recruiting','open','forming','active','review');
  if v_public and (
    old.visibility is distinct from new.visibility
    or old.status is distinct from new.status
    or old.applications_open is distinct from new.applications_open
  ) then
    v_blockers:=public.workstream2_publication_blockers(new.id);
    if cardinality(v_blockers)>0 then
      raise exception 'PROJECT_NOT_PUBLICATION_READY:%',array_to_string(v_blockers,',') using errcode='23514';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists workstream2_guard_project_publication on public.projects;
create trigger workstream2_guard_project_publication
before update of status,visibility,applications_open on public.projects
for each row execute function public.workstream2_guard_project_publication();

-- Role-neutral initial interest. Formal role allocation remains a later-phase concern.
-- The legacy parameters are retained for API compatibility but role IDs are deliberately
-- ignored for application_kind='interest'. Capacity is checked under the project row lock.
create or replace function public.submit_project_interest(
  p_project_id uuid,
  p_participation_preference text,
  p_primary_project_role_id uuid default null,
  p_secondary_project_role_id uuid default null,
  p_flexible_preference text default null,
  p_role_fit_statement text default null,
  p_motivation_statement text default null,
  p_relevant_skills text[] default '{}',
  p_contribution_areas text[] default '{}',
  p_contribution_statement text default null,
  p_commitment_response text default null,
  p_availability text default null,
  p_availability_note text default null,
  p_collaboration_availability text default null,
  p_leadership_interest boolean default false,
  p_portfolio_url text default null,
  p_terms_version text default null,
  p_collaboration_need_id uuid default null
) returns public.project_applications
language plpgsql security definer set search_path=public
as $$
declare
  v_user_id uuid:=auth.uid();
  v_project public.projects%rowtype;
  v_existing public.project_applications%rowtype;
  v_inserted public.project_applications%rowtype;
  v_confirmed integer:=0;
  v_reserved integer:=0;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_project_id::text||':'||v_user_id::text,0));
  select * into v_project from public.projects where id=p_project_id for update;
  if not found then raise exception 'PROJECT_NOT_FOUND' using errcode='P0002'; end if;
  if coalesce(v_project.applications_open,false) is not true or v_project.visibility<>'public' then raise exception 'PROJECT_CLOSED' using errcode='P0001'; end if;
  if v_project.project_type='open' and v_project.status not in ('pilot','recruiting','open','forming','active','review') then raise exception 'PROJECT_CLOSED' using errcode='P0001';
  elsif v_project.project_type='partner' and v_project.status not in ('pilot','recruiting','open','forming') then raise exception 'PROJECT_CLOSED' using errcode='P0001';
  elsif v_project.project_type not in ('open','partner') then raise exception 'PROJECT_CLOSED' using errcode='P0001'; end if;
  if v_project.application_deadline is not null and v_project.application_deadline<now() then raise exception 'DEADLINE_PASSED' using errcode='P0001'; end if;

  if p_participation_preference not in ('solo','team','flexible') then raise exception 'INVALID_PARTICIPATION_PREFERENCE' using errcode='22023'; end if;
  if v_project.participation_mode='solo' and p_participation_preference<>'solo' then raise exception 'PARTICIPATION_NOT_SUPPORTED' using errcode='22023';
  elsif v_project.participation_mode='team' and p_participation_preference not in ('team','flexible') then raise exception 'PARTICIPATION_NOT_SUPPORTED' using errcode='22023';
  elsif v_project.participation_mode='flexible' and p_participation_preference not in ('solo','team','flexible') then raise exception 'PARTICIPATION_NOT_SUPPORTED' using errcode='22023'; end if;
  if p_commitment_response not in ('yes','yes_with_limitations','no') then raise exception 'COMMITMENT_REQUIRED' using errcode='22023'; end if;
  if length(trim(coalesce(p_contribution_statement,'')))<40 then raise exception 'CONTRIBUTION_REQUIRED' using errcode='22023'; end if;
  if length(trim(coalesce(p_motivation_statement,'')))<20 then raise exception 'MOTIVATION_REQUIRED' using errcode='22023'; end if;
  if p_participation_preference='flexible' and p_flexible_preference not in ('prefer_team','prefer_solo','no_preference') then raise exception 'FLEXIBLE_PREFERENCE_REQUIRED' using errcode='22023'; end if;

  if exists(select 1 from public.project_members pm where pm.project_id=p_project_id and pm.user_id=v_user_id and pm.membership_status in ('waiting','active')) then raise exception 'ALREADY_PARTICIPATING' using errcode='23505'; end if;
  select * into v_existing from public.project_applications where project_id=p_project_id and user_id=v_user_id and status not in ('declined','withdrawn') order by submitted_at desc limit 1;
  if found then raise exception 'DUPLICATE_APPLICATION' using errcode='23505'; end if;

  select count(*)::integer into v_confirmed from public.project_members pm where pm.project_id=p_project_id and pm.membership_status in ('waiting','active');
  select count(*)::integer into v_reserved from public.project_offers o where o.project_id=p_project_id and o.status in ('pending','accepted') and o.capacity_released_at is null and o.capacity_consumed_at is null;
  if v_project.max_team_size is not null and v_confirmed+v_reserved>=v_project.max_team_size then raise exception 'PROJECT_FULL' using errcode='P0001'; end if;

  insert into public.project_applications(
    project_id,project_role_id,secondary_project_role_id,user_id,portfolio_url,contribution_statement,availability,status,application_kind,requested_role,leadership_interest,terms_accepted_at,terms_version,submitted_at,participation_preference,flexible_preference,role_fit_statement,motivation_statement,relevant_skills,contribution_areas,commitment_response,availability_note,collaboration_availability,collaboration_need_id,admission_mode_snapshot,admission_decision,admission_decided_at
  ) values(
    p_project_id,null,null,v_user_id,p_portfolio_url,trim(p_contribution_statement),nullif(trim(coalesce(p_availability,'')),''),'submitted','interest',null,case when p_participation_preference='solo' then false else p_leadership_interest end,now(),p_terms_version,now(),p_participation_preference,case when p_participation_preference='flexible' then p_flexible_preference else null end,nullif(trim(coalesce(p_role_fit_statement,'')),''),trim(p_motivation_statement),coalesce(p_relevant_skills,'{}'),coalesce(p_contribution_areas,'{}'),p_commitment_response,nullif(trim(coalesce(p_availability_note,'')),''),case when p_participation_preference='solo' then null else nullif(trim(coalesce(p_collaboration_availability,'')),'') end,p_collaboration_need_id,'review_required','review_required',now()
  ) returning * into v_inserted;
  return v_inserted;
exception when unique_violation then raise exception 'DUPLICATE_APPLICATION' using errcode='23505';
end;
$$;

revoke all on function public.submit_project_interest(uuid,text,uuid,uuid,text,text,text,text[],text[],text,text,text,text,text,boolean,text,text,uuid) from public;
grant execute on function public.submit_project_interest(uuid,text,uuid,uuid,text,text,text,text[],text[],text,text,text,text,text,boolean,text,text,uuid) to authenticated;
