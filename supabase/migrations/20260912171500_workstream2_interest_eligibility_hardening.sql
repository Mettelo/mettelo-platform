-- Workstream 2 — make profile readiness and current-run capacity final database authorities.

create or replace function public.workstream2_member_application_readiness(p_user_id uuid)
returns table(ready boolean, missing text[])
language sql
security definer
stable
set search_path=public
as $$
  with profile_state as (
    select p.*,
      exists(select 1 from public.profile_domain_preferences d where d.user_id=p.id) as has_domain,
      exists(select 1 from public.profile_tool_preferences t where t.user_id=p.id) as has_tool
    from public.profiles p where p.id=p_user_id
  ), checks as (
    select array_remove(array[
      case when nullif(btrim(coalesce(full_name,'')),'') is null then 'full_name' end,
      case when nullif(btrim(coalesce(headline,'')),'') is null and nullif(btrim(coalesce(current_job_title,'')),'') is null then 'professional_identity' end,
      case when nullif(btrim(coalesce(professional_area,'')),'') is null then 'professional_area' end,
      case when nullif(btrim(coalesce(location,'')),'') is null then 'location' end,
      case when nullif(btrim(coalesce(experience_level,'')),'') is null then 'experience_level' end,
      case when coalesce(array_length(skills,1),0)<3 then 'skills' end,
      case when coalesce(array_length(preferred_roles,1),0)<1 then 'preferred_roles' end,
      case when not (has_domain or has_tool) then 'project_preferences' end,
      case when nullif(btrim(coalesce(project_availability,'')),'') is null then 'availability' end,
      case when nullif(btrim(coalesce(weekly_capacity,'')),'') is null then 'weekly_capacity' end
    ],null)::text[] as missing
    from profile_state
  )
  select cardinality(coalesce(missing,array['profile']::text[]))=0,
         coalesce(missing,array['profile']::text[])
  from checks
  union all
  select false,array['profile']::text[] where not exists(select 1 from checks)
  limit 1;
$$;
revoke all on function public.workstream2_member_application_readiness(uuid) from public;
grant execute on function public.workstream2_member_application_readiness(uuid) to authenticated,service_role;

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
  v_ready boolean:=false;
  v_missing text[]:='{}'::text[];
  v_run_id uuid;
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

  select r.ready,r.missing into v_ready,v_missing from public.workstream2_member_application_readiness(v_user_id) r;
  if not coalesce(v_ready,false) then
    raise exception 'PROFILE_INCOMPLETE:%',array_to_string(coalesce(v_missing,'{}'::text[]),',') using errcode='P0001';
  end if;

  if p_participation_preference not in ('solo','team','flexible') then raise exception 'INVALID_PARTICIPATION_PREFERENCE' using errcode='22023'; end if;
  if v_project.participation_mode='solo' and p_participation_preference<>'solo' then raise exception 'PARTICIPATION_NOT_SUPPORTED' using errcode='22023';
  elsif v_project.participation_mode='team' and p_participation_preference not in ('team','flexible') then raise exception 'PARTICIPATION_NOT_SUPPORTED' using errcode='22023';
  elsif v_project.participation_mode='flexible' and p_participation_preference not in ('solo','team','flexible') then raise exception 'PARTICIPATION_NOT_SUPPORTED' using errcode='22023'; end if;
  if p_commitment_response not in ('yes','yes_with_limitations','no') then raise exception 'COMMITMENT_REQUIRED' using errcode='22023'; end if;
  if length(trim(coalesce(p_contribution_statement,'')))<40 then raise exception 'CONTRIBUTION_REQUIRED' using errcode='22023'; end if;
  if length(trim(coalesce(p_motivation_statement,'')))<20 then raise exception 'MOTIVATION_REQUIRED' using errcode='22023'; end if;
  if p_participation_preference='flexible' and p_flexible_preference not in ('prefer_team','prefer_solo','no_preference') then raise exception 'FLEXIBLE_PREFERENCE_REQUIRED' using errcode='22023'; end if;

  if exists(select 1 from public.project_members pm where pm.project_id=p_project_id and pm.user_id=v_user_id and pm.membership_status in ('waiting','active','completed')) then raise exception 'ALREADY_PARTICIPATING' using errcode='23505'; end if;
  select * into v_existing from public.project_applications where project_id=p_project_id and user_id=v_user_id and status not in ('declined','withdrawn') order by submitted_at desc limit 1;
  if found then raise exception 'DUPLICATE_APPLICATION' using errcode='23505'; end if;

  if v_project.project_type='open' then
    select r.id into v_run_id from public.project_runs r
      where r.project_id=p_project_id and r.status in ('forming','active','review','paused')
      order by r.run_number desc limit 1;
  end if;
  if v_run_id is not null then
    select count(*)::integer into v_confirmed from public.project_members pm
      where pm.project_run_id=v_run_id and pm.membership_status in ('waiting','active');
  else
    select count(*)::integer into v_confirmed from public.project_members pm
      where pm.project_id=p_project_id and pm.membership_status in ('waiting','active');
  end if;
  select count(*)::integer into v_reserved from public.project_offers o
    where o.project_id=p_project_id and o.status in ('pending','accepted')
      and o.capacity_released_at is null and o.capacity_consumed_at is null
      and (v_run_id is null or o.project_run_id is null or o.project_run_id=v_run_id);
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
