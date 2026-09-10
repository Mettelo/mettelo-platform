-- Project Experience Phase 18: privacy-preserving member discovery foundation.
--
-- Member discovery must not rely on broad authenticated SELECT access to profiles.
-- This service-only projection exposes only fields approved for collaboration
-- discovery, honours the canonical Phase 2 privacy controls, and rate-limits
-- enumeration attempts. It does not create project membership or invitations.

create table if not exists public.member_discovery_rate_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now()
);

alter table public.member_discovery_rate_limits enable row level security;

revoke all on table public.member_discovery_rate_limits from public, anon, authenticated;
grant all on table public.member_discovery_rate_limits to service_role;

create index if not exists member_discovery_rate_limits_window_idx
  on public.member_discovery_rate_limits(window_started_at);

create or replace function public.phase18_search_discoverable_members(
  p_query text,
  p_limit integer default 12
)
returns table (
  username text,
  full_name text,
  headline text,
  current_job_title text,
  professional_area text,
  experience_level text,
  project_availability text,
  weekly_capacity text,
  skills text[],
  preferred_roles text[],
  avatar_url text
)
language plpgsql
security definer
set search_path=public
as $$
declare
  actor uuid:=auth.uid();
  query_text text:=left(trim(coalesce(p_query,'')),80);
  result_limit integer:=least(greatest(coalesce(p_limit,12),1),20);
  limiter public.member_discovery_rate_limits%rowtype;
  now_at timestamptz:=now();
begin
  if actor is null then
    raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED';
  end if;

  -- Require enough intent to avoid bulk enumeration of the member directory.
  if length(query_text)<2 then
    raise exception using errcode='22023',message='DISCOVERY_QUERY_TOO_SHORT';
  end if;

  insert into public.member_discovery_rate_limits(user_id,window_started_at,request_count,updated_at)
  values(actor,now_at,1,now_at)
  on conflict(user_id) do nothing;

  select * into limiter
  from public.member_discovery_rate_limits
  where user_id=actor
  for update;

  if limiter.window_started_at <= now_at-interval '1 minute' then
    update public.member_discovery_rate_limits
    set window_started_at=now_at,request_count=1,updated_at=now_at
    where user_id=actor;
  else
    if limiter.request_count>=30 then
      raise exception using errcode='P0001',message='DISCOVERY_RATE_LIMITED';
    end if;
    update public.member_discovery_rate_limits
    set request_count=request_count+1,updated_at=now_at
    where user_id=actor;
  end if;

  return query
  select
    p.username,
    p.full_name,
    p.headline,
    p.current_job_title,
    p.professional_area,
    p.experience_level,
    p.project_availability,
    p.weekly_capacity,
    coalesce(p.skills,array[]::text[]),
    coalesce(p.preferred_roles,array[]::text[]),
    p.avatar_url
  from public.profiles p
  left join public.member_privacy_preferences privacy on privacy.user_id=p.id
  where p.id<>actor
    and p.is_public is true
    and p.username is not null
    and coalesce(privacy.allow_project_invitations,true) is true
    and (
      lower(p.username) like '%'||lower(query_text)||'%'
      or lower(coalesce(p.full_name,'')) like '%'||lower(query_text)||'%'
      or lower(coalesce(p.professional_area,'')) like '%'||lower(query_text)||'%'
      or exists (
        select 1 from unnest(coalesce(p.skills,array[]::text[])) skill
        where lower(skill) like '%'||lower(query_text)||'%'
      )
      or exists (
        select 1 from unnest(coalesce(p.preferred_roles,array[]::text[])) role_name
        where lower(role_name) like '%'||lower(query_text)||'%'
      )
    )
  order by
    case when lower(p.username)=lower(query_text) then 0
         when lower(p.username) like lower(query_text)||'%' then 1
         when lower(coalesce(p.full_name,'')) like lower(query_text)||'%' then 2
         else 3 end,
    lower(p.username)
  limit result_limit;
end;
$$;

revoke all on function public.phase18_search_discoverable_members(text,integer) from public,anon;
grant execute on function public.phase18_search_discoverable_members(text,integer) to authenticated,service_role;

comment on function public.phase18_search_discoverable_members(text,integer) is
  'Phase 18 privacy-preserving member discovery projection. Requires authentication, honours profiles.is_public and member_privacy_preferences.allow_project_invitations, exposes no Auth UUID/email/private history, and applies a per-user search rate limit.';
