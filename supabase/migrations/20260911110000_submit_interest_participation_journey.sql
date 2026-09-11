-- Canonical applicant preference and evidence captured during Submit Interest.
-- Project participation_mode remains authoritative; these fields describe the applicant.
alter table public.project_applications
  add column if not exists participation_preference text,
  add column if not exists secondary_project_role_id uuid,
  add column if not exists flexible_preference text,
  add column if not exists role_fit_statement text,
  add column if not exists motivation_statement text,
  add column if not exists relevant_skills text[] not null default '{}',
  add column if not exists contribution_areas text[] not null default '{}',
  add column if not exists commitment_response text,
  add column if not exists availability_note text,
  add column if not exists collaboration_availability text,
  add column if not exists collaboration_need_id uuid,
  add column if not exists admission_mode_snapshot text,
  add column if not exists admission_decision text,
  add column if not exists admission_decided_at timestamptz;

-- Do not add a second direct project_roles FK here. project_applications already has
-- project_role_id -> project_roles and a second relationship makes existing PostgREST
-- embeds ambiguous. The atomic function below validates and locks the secondary role.
do $$ begin alter table public.project_applications add constraint project_applications_participation_preference_check check (participation_preference is null or participation_preference in ('solo','team','flexible')); exception when duplicate_object then null; end $$;
do $$ begin alter table public.project_applications add constraint project_applications_flexible_preference_check check (flexible_preference is null or flexible_preference in ('prefer_team','prefer_solo','no_preference')); exception when duplicate_object then null; end $$;
do $$ begin alter table public.project_applications add constraint project_applications_commitment_response_check check (commitment_response is null or commitment_response in ('yes','yes_with_limitations','no')); exception when duplicate_object then null; end $$;

create index if not exists project_applications_secondary_role_idx on public.project_applications(secondary_project_role_id) where secondary_project_role_id is not null;
drop index if exists public.project_applications_one_interest_per_project_user;
create unique index project_applications_one_interest_per_project_user on public.project_applications(project_id,user_id) where application_kind='interest' and status not in ('declined','withdrawn');

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
  v_primary public.project_roles%rowtype;
  v_secondary public.project_roles%rowtype;
  v_primary_filled integer:=0;
  v_secondary_filled integer:=0;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_project_id::text||':'||v_user_id::text,0));
  select * into v_project from public.projects where id=p_project_id for share;
  if not found then raise exception 'PROJECT_NOT_FOUND' using errcode='P0002'; end if;
  if coalesce(v_project.applications_open,false) is not true or v_project.visibility<>'public' then raise exception 'PROJECT_CLOSED' using errcode='P0001'; end if;
  if v_project.project_type='open' and v_project.status not in ('pilot','recruiting','open','forming','active','review') then raise exception 'PROJECT_CLOSED' using errcode='P0001';
  elsif v_project.project_type='partner' and v_project.status not in ('pilot','recruiting','open','forming') then raise exception 'PROJECT_CLOSED' using errcode='P0001';
  elsif v_project.project_type not in ('open','partner') then raise exception 'PROJECT_CLOSED' using errcode='P0001'; end if;
  if v_project.project_type='partner' and v_project.application_deadline is not null and v_project.application_deadline<now() then raise exception 'DEADLINE_PASSED' using errcode='P0001'; end if;

  if p_participation_preference not in ('solo','team','flexible') then raise exception 'INVALID_PARTICIPATION_PREFERENCE' using errcode='22023'; end if;
  if v_project.participation_mode='solo' and p_participation_preference<>'solo' then raise exception 'PARTICIPATION_NOT_SUPPORTED' using errcode='22023';
  elsif v_project.participation_mode='team' and p_participation_preference not in ('team','flexible') then raise exception 'PARTICIPATION_NOT_SUPPORTED' using errcode='22023';
  elsif v_project.participation_mode='flexible' and p_participation_preference not in ('solo','team','flexible') then raise exception 'PARTICIPATION_NOT_SUPPORTED' using errcode='22023'; end if;
  if p_commitment_response not in ('yes','yes_with_limitations','no') then raise exception 'COMMITMENT_REQUIRED' using errcode='22023'; end if;
  if length(trim(coalesce(p_contribution_statement,'')))<40 then raise exception 'CONTRIBUTION_REQUIRED' using errcode='22023'; end if;
  if length(trim(coalesce(p_motivation_statement,'')))<20 then raise exception 'MOTIVATION_REQUIRED' using errcode='22023'; end if;

  select * into v_existing from public.project_applications where project_id=p_project_id and user_id=v_user_id and status not in ('declined','withdrawn') order by submitted_at desc limit 1;
  if found then raise exception 'DUPLICATE_APPLICATION' using errcode='23505'; end if;

  if p_participation_preference='solo' then
    if p_primary_project_role_id is not null or p_secondary_project_role_id is not null then raise exception 'SOLO_ROLE_NOT_ALLOWED' using errcode='22023'; end if;
  else
    if p_primary_project_role_id is not null then
      select * into v_primary from public.project_roles where id=p_primary_project_role_id and project_id=p_project_id and role_status='open' for update;
      if not found then raise exception 'INVALID_PRIMARY_ROLE' using errcode='23503'; end if;
      select count(*) into v_primary_filled from public.project_members where project_id=p_project_id and project_role_id=p_primary_project_role_id and membership_status in ('waiting','active');
      if v_primary_filled>=greatest(1,v_primary.openings) then raise exception 'PRIMARY_ROLE_FULL' using errcode='23503'; end if;
    end if;
    if p_secondary_project_role_id is not null then
      select * into v_secondary from public.project_roles where id=p_secondary_project_role_id and project_id=p_project_id and role_status='open' for update;
      if not found or p_secondary_project_role_id=p_primary_project_role_id then raise exception 'INVALID_SECONDARY_ROLE' using errcode='23503'; end if;
      select count(*) into v_secondary_filled from public.project_members where project_id=p_project_id and project_role_id=p_secondary_project_role_id and membership_status in ('waiting','active');
      if v_secondary_filled>=greatest(1,v_secondary.openings) then raise exception 'SECONDARY_ROLE_FULL' using errcode='23503'; end if;
    end if;
  end if;
  if p_participation_preference='team' and p_primary_project_role_id is null then raise exception 'PRIMARY_ROLE_REQUIRED' using errcode='22023'; end if;
  if p_participation_preference='flexible' and p_flexible_preference not in ('prefer_team','prefer_solo','no_preference') then raise exception 'FLEXIBLE_PREFERENCE_REQUIRED' using errcode='22023'; end if;

  insert into public.project_applications(project_id,project_role_id,secondary_project_role_id,user_id,portfolio_url,contribution_statement,availability,status,application_kind,requested_role,leadership_interest,terms_accepted_at,terms_version,submitted_at,participation_preference,flexible_preference,role_fit_statement,motivation_statement,relevant_skills,contribution_areas,commitment_response,availability_note,collaboration_availability,collaboration_need_id,admission_mode_snapshot,admission_decision,admission_decided_at)
  values(p_project_id,case when p_participation_preference='solo' then null else p_primary_project_role_id end,case when p_participation_preference='solo' then null else p_secondary_project_role_id end,v_user_id,p_portfolio_url,trim(p_contribution_statement),nullif(trim(coalesce(p_availability,'')),''),'submitted','interest',null,case when p_participation_preference='solo' then false else p_leadership_interest end,now(),p_terms_version,now(),p_participation_preference,case when p_participation_preference='flexible' then p_flexible_preference else null end,nullif(trim(coalesce(p_role_fit_statement,'')),''),trim(p_motivation_statement),coalesce(p_relevant_skills,'{}'),coalesce(p_contribution_areas,'{}'),p_commitment_response,nullif(trim(coalesce(p_availability_note,'')),''),case when p_participation_preference='solo' then null else nullif(trim(coalesce(p_collaboration_availability,'')),'') end,p_collaboration_need_id,'review_required','review_required',now()) returning * into v_inserted;
  return v_inserted;
exception when unique_violation then raise exception 'DUPLICATE_APPLICATION' using errcode='23505';
end;
$$;

revoke all on function public.submit_project_interest(uuid,text,uuid,uuid,text,text,text,text[],text[],text,text,text,text,text,boolean,text,text,uuid) from public;
grant execute on function public.submit_project_interest(uuid,text,uuid,uuid,text,text,text,text[],text[],text,text,text,text,text,boolean,text,text,uuid) to authenticated;
