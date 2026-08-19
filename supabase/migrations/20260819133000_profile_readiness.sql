-- Establish the profile fields consumed by the profile API/readiness model before
-- calculating readiness. These are additive/idempotent so canonical environments
-- that already have one or more hosted-era columns remain compatible.
alter table public.profiles
  add column if not exists portfolio_url text,
  add column if not exists current_job_title text,
  add column if not exists organisation text,
  add column if not exists experience_level text,
  add column if not exists employment_status text,
  add column if not exists project_availability text,
  add column if not exists weekly_capacity text,
  add column if not exists preferred_roles text[] not null default '{}',
  add column if not exists languages text[] not null default '{}',
  add column if not exists profile_readiness smallint not null default 0;

alter table public.profiles
  drop constraint if exists profiles_profile_readiness_range;

alter table public.profiles
  add constraint profiles_profile_readiness_range
  check (profile_readiness between 0 and 100);

update public.profiles p
set profile_readiness =
  (case when nullif(trim(coalesce(p.full_name,'')),'') is not null
          and (nullif(trim(coalesce(p.headline,'')),'') is not null or nullif(trim(coalesce(p.current_job_title,'')),'') is not null)
          and nullif(trim(coalesce(p.professional_area,'')),'') is not null
          and nullif(trim(coalesce(p.location,'')),'') is not null then 20 else 0 end)
  +(case when nullif(trim(coalesce(p.experience_level,'')),'') is not null
          and coalesce(array_length(p.skills,1),0)>=3
          and coalesce(array_length(p.preferred_roles,1),0)>0
          and (exists(select 1 from public.profile_domain_preferences d where d.user_id=p.id)
               or exists(select 1 from public.profile_tool_preferences t where t.user_id=p.id)) then 30 else 0 end)
  +(case when nullif(trim(coalesce(p.project_availability,'')),'') is not null
          and nullif(trim(coalesce(p.weekly_capacity,'')),'') is not null then 20 else 0 end)
  +(case when nullif(trim(coalesce(p.bio,'')),'') is not null
          and (nullif(trim(coalesce(p.linkedin_url,'')),'') is not null
               or nullif(trim(coalesce(p.github_url,'')),'') is not null
               or nullif(trim(coalesce(p.portfolio_url,'')),'') is not null) then 15 else 0 end)
  +(case when exists(select 1 from public.contributions c where c.user_id=p.id and c.verification_status='verified') then 5 else 0 end)
  +(case when nullif(trim(coalesce(p.primary_goal,'')),'') is not null
          or nullif(trim(coalesce(p.employment_status,'')),'') is not null then 10 else 0 end);

create index if not exists profiles_public_readiness_idx
  on public.profiles(profile_readiness desc, updated_at desc)
  where is_public=true;
