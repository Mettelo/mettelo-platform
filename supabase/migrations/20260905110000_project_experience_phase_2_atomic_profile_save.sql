create or replace function public.save_member_profile(
  p_profile jsonb,
  p_domain_ids uuid[] default '{}'::uuid[],
  p_tool_ids uuid[] default '{}'::uuid[],
  p_expected_updated_at timestamptz default null
)
returns setof public.profiles
language plpgsql
security invoker
set search_path=public
as $$
declare
  v_user_id uuid:=auth.uid();
  v_current_updated_at timestamptz;
  v_now timestamptz:=now();
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;

  select updated_at into v_current_updated_at from public.profiles where id=v_user_id for update;
  if found and p_expected_updated_at is not null and v_current_updated_at is distinct from p_expected_updated_at then
    raise exception 'PROFILE_STALE' using errcode='40001';
  end if;

  insert into public.profiles(
    id,full_name,headline,bio,location,professional_area,primary_goal,linkedin_url,github_url,portfolio_url,avatar_url,
    current_job_title,organisation,experience_level,employment_status,project_availability,weekly_capacity,skills,preferred_roles,languages,
    is_public,profile_readiness,onboarding_step,onboarding_completed_at,updated_at
  ) values (
    v_user_id,
    coalesce(p_profile->>'full_name',''),nullif(p_profile->>'headline',''),nullif(p_profile->>'bio',''),nullif(p_profile->>'location',''),
    nullif(p_profile->>'professional_area',''),nullif(p_profile->>'primary_goal',''),nullif(p_profile->>'linkedin_url',''),nullif(p_profile->>'github_url',''),nullif(p_profile->>'portfolio_url',''),nullif(p_profile->>'avatar_url',''),
    nullif(p_profile->>'current_job_title',''),nullif(p_profile->>'organisation',''),nullif(p_profile->>'experience_level',''),nullif(p_profile->>'employment_status',''),nullif(p_profile->>'project_availability',''),nullif(p_profile->>'weekly_capacity',''),
    coalesce(array(select jsonb_array_elements_text(coalesce(p_profile->'skills','[]'::jsonb))),'{}'::text[]),
    coalesce(array(select jsonb_array_elements_text(coalesce(p_profile->'preferred_roles','[]'::jsonb))),'{}'::text[]),
    coalesce(array(select jsonb_array_elements_text(coalesce(p_profile->'languages','[]'::jsonb))),'{}'::text[]),
    coalesce((p_profile->>'is_public')::boolean,false),
    coalesce((p_profile->>'profile_readiness')::integer,0),
    coalesce((p_profile->>'onboarding_step')::integer,0),
    case when nullif(p_profile->>'onboarding_completed_at','') is null then null else (p_profile->>'onboarding_completed_at')::timestamptz end,
    v_now
  )
  on conflict(id) do update set
    full_name=excluded.full_name,headline=excluded.headline,bio=excluded.bio,location=excluded.location,professional_area=excluded.professional_area,
    primary_goal=excluded.primary_goal,linkedin_url=excluded.linkedin_url,github_url=excluded.github_url,portfolio_url=excluded.portfolio_url,avatar_url=excluded.avatar_url,
    current_job_title=excluded.current_job_title,organisation=excluded.organisation,experience_level=excluded.experience_level,employment_status=excluded.employment_status,
    project_availability=excluded.project_availability,weekly_capacity=excluded.weekly_capacity,skills=excluded.skills,preferred_roles=excluded.preferred_roles,languages=excluded.languages,
    is_public=excluded.is_public,profile_readiness=excluded.profile_readiness,onboarding_step=excluded.onboarding_step,
    onboarding_completed_at=coalesce(public.profiles.onboarding_completed_at,excluded.onboarding_completed_at),updated_at=v_now;

  delete from public.profile_domain_preferences where user_id=v_user_id;
  if cardinality(p_domain_ids)>0 then
    insert into public.profile_domain_preferences(user_id,domain_id)
    select v_user_id,unnest(p_domain_ids) on conflict do nothing;
  end if;

  delete from public.profile_tool_preferences where user_id=v_user_id;
  if cardinality(p_tool_ids)>0 then
    insert into public.profile_tool_preferences(user_id,tool_id)
    select v_user_id,unnest(p_tool_ids) on conflict do nothing;
  end if;

  return query select * from public.profiles where id=v_user_id;
end;
$$;

revoke all on function public.save_member_profile(jsonb,uuid[],uuid[],timestamptz) from public;
grant execute on function public.save_member_profile(jsonb,uuid[],uuid[],timestamptz) to authenticated;
