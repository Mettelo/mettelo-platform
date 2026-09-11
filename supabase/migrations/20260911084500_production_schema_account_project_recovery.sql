-- Production incident recovery: restore the minimum canonical schema contract
-- required by the currently deployed member identity, account/profile, and
-- public project-detail surfaces.
--
-- This migration is intentionally additive and idempotent. It does not replace
-- the existing auth/account identity trigger, delete member data, or weaken RLS.

-- ---------------------------------------------------------------------------
-- Member identity: Phase 1 contract
-- ---------------------------------------------------------------------------
create sequence if not exists public.mettelo_member_number_seq as bigint start with 100001;

alter table public.profiles
  add column if not exists username text,
  add column if not exists member_id text,
  add column if not exists username_claimed_at timestamptz,
  add column if not exists username_claim_attempted_at timestamptz,
  add column if not exists username_changed_at timestamptz;

update public.profiles
set member_id='MTL-' || lpad(nextval('public.mettelo_member_number_seq')::text,6,'0')
where member_id is null;

create or replace function public.assign_member_id()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if new.member_id is null then
    new.member_id:='MTL-' || lpad(nextval('public.mettelo_member_number_seq')::text,6,'0');
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_assign_member_id on public.profiles;
create trigger profiles_assign_member_id
before insert on public.profiles
for each row execute function public.assign_member_id();

alter table public.profiles alter column member_id drop default;
alter table public.profiles alter column member_id set not null;

create unique index if not exists profiles_member_id_unique on public.profiles(member_id);
create unique index if not exists profiles_username_ci_unique on public.profiles(lower(username)) where username is not null;

alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles add constraint profiles_username_format
check (username is null or (username = lower(username) and username ~ '^[a-z][a-z0-9_]{2,29}$'));

alter table public.profiles drop constraint if exists profiles_username_reserved;
alter table public.profiles add constraint profiles_username_reserved
check (username is null or username not in ('admin','administrator','api','auth','billing','community','contact','help','info','mettelo','moderator','root','security','staff','support','system','team'));

create table if not exists public.member_username_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  username text not null,
  replaced_at timestamptz not null default now(),
  constraint member_username_history_format check (username = lower(username) and username ~ '^[a-z][a-z0-9_]{2,29}$')
);

create unique index if not exists member_username_history_ci_unique
  on public.member_username_history(lower(username));
create index if not exists member_username_history_user_idx
  on public.member_username_history(user_id,replaced_at desc);

alter table public.member_username_history enable row level security;
revoke all on table public.member_username_history from anon, authenticated;

create or replace function public.protect_member_identity_fields()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  if tg_op='INSERT' then
    if current_setting('app.member_identity_signup',true) is distinct from '1' and (
      new.username is not null or
      new.username_claimed_at is not null or
      new.username_claim_attempted_at is not null or
      new.username_changed_at is not null
    ) then
      raise exception 'member identity fields must be created through the canonical identity operation' using errcode='42501';
    end if;
    return new;
  end if;

  if new.member_id is distinct from old.member_id then
    raise exception 'member_id is immutable' using errcode='42501';
  end if;

  if current_setting('app.member_identity_claim',true) is distinct from '1'
     and current_setting('app.member_identity_change',true) is distinct from '1'
     and (
       new.username is distinct from old.username or
       new.username_claimed_at is distinct from old.username_claimed_at or
       new.username_claim_attempted_at is distinct from old.username_claim_attempted_at or
       new.username_changed_at is distinct from old.username_changed_at
     ) then
    raise exception 'member identity fields must be changed through the canonical identity operation' using errcode='42501';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_member_identity on public.profiles;
create trigger profiles_protect_member_identity
before insert or update on public.profiles
for each row execute function public.protect_member_identity_fields();

create or replace function public.claim_member_username(p_username text)
returns table(success boolean,code text,claimed_username text,claimed_member_id text)
language plpgsql
security definer
set search_path=public
as $$
declare
  v_username text:=lower(trim(coalesce(p_username,'')));
  v_current text;
  v_last_attempt timestamptz;
  v_member_id text;
begin
  if auth.uid() is null then return query select false,'AUTH_REQUIRED',null::text,null::text; return; end if;

  select username,username_claim_attempted_at,member_id
    into v_current,v_last_attempt,v_member_id
  from public.profiles where id=auth.uid() for update;

  if not found then return query select false,'PROFILE_MISSING',null::text,null::text; return; end if;
  if v_current is not null then return query select true,'ALREADY_CLAIMED',v_current,v_member_id; return; end if;
  if v_last_attempt is not null and v_last_attempt > now()-interval '2 seconds' then
    return query select false,'RATE_LIMITED',null::text,v_member_id; return;
  end if;

  perform set_config('app.member_identity_claim','1',true);
  update public.profiles set username_claim_attempted_at=now() where id=auth.uid();

  if v_username !~ '^[a-z][a-z0-9_]{2,29}$' then return query select false,'INVALID',null::text,v_member_id; return; end if;
  if v_username in ('admin','administrator','api','auth','billing','community','contact','help','info','mettelo','moderator','root','security','staff','support','system','team') then
    return query select false,'RESERVED',null::text,v_member_id; return;
  end if;
  if exists(select 1 from public.member_username_history where lower(username)=v_username) then
    return query select false,'UNAVAILABLE',null::text,v_member_id; return;
  end if;

  begin
    update public.profiles set username=v_username,username_claimed_at=now(),updated_at=now() where id=auth.uid();
  exception when unique_violation then
    return query select false,'UNAVAILABLE',null::text,v_member_id; return;
  end;

  return query select true,'CLAIMED',v_username,v_member_id;
end;
$$;

create or replace function public.change_member_username(p_username text)
returns table(success boolean,code text,changed_username text,stable_member_id text)
language plpgsql
security definer
set search_path=public
as $$
declare
  v_username text:=lower(trim(coalesce(p_username,'')));
  v_current text;
  v_changed_at timestamptz;
  v_member_id text;
begin
  if auth.uid() is null then return query select false,'AUTH_REQUIRED',null::text,null::text; return; end if;

  select username,username_changed_at,member_id
    into v_current,v_changed_at,v_member_id
  from public.profiles where id=auth.uid() for update;

  if not found then return query select false,'PROFILE_MISSING',null::text,null::text; return; end if;
  if v_current is null then return query select false,'USERNAME_REQUIRED',null::text,v_member_id; return; end if;
  if v_username=v_current then return query select true,'UNCHANGED',v_current,v_member_id; return; end if;
  if v_changed_at is not null and v_changed_at > now()-interval '30 days' then
    return query select false,'RATE_LIMITED',null::text,v_member_id; return;
  end if;
  if v_username !~ '^[a-z][a-z0-9_]{2,29}$' then return query select false,'INVALID',null::text,v_member_id; return; end if;
  if v_username in ('admin','administrator','api','auth','billing','community','contact','help','info','mettelo','moderator','root','security','staff','support','system','team') then
    return query select false,'RESERVED',null::text,v_member_id; return;
  end if;
  if exists(select 1 from public.member_username_history where lower(username)=v_username) then
    return query select false,'UNAVAILABLE',null::text,v_member_id; return;
  end if;

  begin
    insert into public.member_username_history(user_id,username) values(auth.uid(),v_current);
    perform set_config('app.member_identity_change','1',true);
    update public.profiles set username=v_username,username_changed_at=now(),updated_at=now() where id=auth.uid();
  exception when unique_violation then
    return query select false,'UNAVAILABLE',null::text,v_member_id; return;
  end;

  return query select true,'CHANGED',v_username,v_member_id;
end;
$$;

revoke all on function public.claim_member_username(text) from public,anon;
grant execute on function public.claim_member_username(text) to authenticated;
revoke all on function public.change_member_username(text) from public,anon;
grant execute on function public.change_member_username(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Professional profile atomic save: Phase 2 contract
-- ---------------------------------------------------------------------------
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

revoke all on function public.save_member_profile(jsonb,uuid[],uuid[],timestamptz) from public,anon;
grant execute on function public.save_member_profile(jsonb,uuid[],uuid[],timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- Account privacy preferences: Phase 2 + Phase 18 compatibility contract
-- ---------------------------------------------------------------------------
create table if not exists public.member_privacy_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  allow_project_invitations boolean not null default true,
  allow_member_messages boolean not null default true,
  allow_collaboration_recommendations boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.member_privacy_preferences
  add column if not exists allow_collaboration_recommendations boolean not null default true;

alter table public.member_privacy_preferences enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='member_privacy_preferences'
      and policyname='members manage own privacy preferences'
  ) then
    create policy "members manage own privacy preferences"
      on public.member_privacy_preferences
      for all to authenticated
      using ((select auth.uid())=user_id)
      with check ((select auth.uid())=user_id);
  end if;
end $$;

create index if not exists idx_member_privacy_preferences_invitations
  on public.member_privacy_preferences(allow_project_invitations)
  where allow_project_invitations=true;
create index if not exists idx_member_privacy_preferences_messages
  on public.member_privacy_preferences(allow_member_messages)
  where allow_member_messages=true;

revoke all on table public.member_privacy_preferences from anon;
grant select,insert,update,delete on table public.member_privacy_preferences to authenticated;
grant select,insert,update,delete on table public.member_privacy_preferences to service_role;

create or replace function public.save_member_privacy_preferences(
  p_profile_discoverable boolean,
  p_allow_project_invitations boolean,
  p_allow_member_messages boolean
)
returns public.member_privacy_preferences
language plpgsql
security invoker
set search_path=public
as $$
declare
  v_user_id uuid:=auth.uid();
  v_result public.member_privacy_preferences;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;

  update public.profiles
     set is_public=coalesce(p_profile_discoverable,false),updated_at=now()
   where id=v_user_id;
  if not found then raise exception 'PROFILE_REQUIRED' using errcode='23503'; end if;

  insert into public.member_privacy_preferences(user_id,allow_project_invitations,allow_member_messages,updated_at)
  values(v_user_id,coalesce(p_allow_project_invitations,false),coalesce(p_allow_member_messages,false),now())
  on conflict(user_id) do update set
    allow_project_invitations=excluded.allow_project_invitations,
    allow_member_messages=excluded.allow_member_messages,
    updated_at=excluded.updated_at
  returning * into v_result;

  return v_result;
end;
$$;

revoke all on function public.save_member_privacy_preferences(boolean,boolean,boolean) from public,anon;
grant execute on function public.save_member_privacy_preferences(boolean,boolean,boolean) to authenticated;

create or replace function public.phase18_save_member_privacy_preferences(
  p_profile_discoverable boolean,
  p_allow_project_invitations boolean,
  p_allow_member_messages boolean,
  p_allow_collaboration_recommendations boolean
)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  perform public.save_member_privacy_preferences(
    p_profile_discoverable,
    p_allow_project_invitations,
    p_allow_member_messages
  );
  update public.member_privacy_preferences
  set allow_collaboration_recommendations=coalesce(p_allow_collaboration_recommendations,true),updated_at=now()
  where user_id=auth.uid();
  if not found then
    insert into public.member_privacy_preferences(user_id,allow_project_invitations,allow_member_messages,allow_collaboration_recommendations,updated_at)
    values(auth.uid(),coalesce(p_allow_project_invitations,true),coalesce(p_allow_member_messages,true),coalesce(p_allow_collaboration_recommendations,true),now())
    on conflict(user_id) do update set allow_collaboration_recommendations=excluded.allow_collaboration_recommendations,updated_at=excluded.updated_at;
  end if;
end;
$$;

revoke all on function public.phase18_save_member_privacy_preferences(boolean,boolean,boolean,boolean) from public,anon;
grant execute on function public.phase18_save_member_privacy_preferences(boolean,boolean,boolean,boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Public project detail participation contract: Phase 3 compatibility
-- ---------------------------------------------------------------------------
alter table public.projects
  add column if not exists participation_mode text,
  add column if not exists min_team_size integer,
  add column if not exists target_team_size integer,
  add column if not exists max_team_size integer;

update public.projects
set
  participation_mode=case when greatest(1,least(50,coalesce(team_size_threshold,5)))=1 then 'solo' else 'team' end,
  min_team_size=greatest(1,least(50,coalesce(team_size_threshold,5))),
  target_team_size=greatest(1,least(50,coalesce(team_size_threshold,5))),
  max_team_size=greatest(1,least(50,coalesce(team_size_threshold,5)))
where participation_mode is null
   or min_team_size is null
   or target_team_size is null
   or max_team_size is null;

alter table public.projects
  alter column participation_mode set default 'team',
  alter column min_team_size set default 5,
  alter column target_team_size set default 5,
  alter column max_team_size set default 5,
  alter column participation_mode set not null,
  alter column min_team_size set not null,
  alter column target_team_size set not null,
  alter column max_team_size set not null;

alter table public.projects drop constraint if exists projects_participation_mode_check;
alter table public.projects add constraint projects_participation_mode_check
  check (participation_mode in ('solo','team','flexible'));

alter table public.projects drop constraint if exists projects_participation_capacity_check;
alter table public.projects add constraint projects_participation_capacity_check
  check (
    min_team_size between 1 and 50
    and target_team_size between 1 and 50
    and max_team_size between 1 and 50
    and min_team_size <= target_team_size
    and target_team_size <= max_team_size
    and (
      (participation_mode='solo' and min_team_size=1 and target_team_size=1 and max_team_size=1)
      or (participation_mode='team' and min_team_size>=2)
      or (participation_mode='flexible' and min_team_size=1)
    )
  );

create or replace function public.sync_project_participation_contract()
returns trigger
language plpgsql
set search_path=public
as $$
declare
  legacy_min integer;
  canonical_changed boolean;
begin
  legacy_min:=greatest(1,least(50,coalesce(new.team_size_threshold,5)));

  if tg_op='INSERT' then
    if new.participation_mode='team'
       and new.min_team_size=5
       and new.target_team_size=5
       and new.max_team_size=5
       and legacy_min<>5 then
      new.participation_mode:=case when legacy_min=1 then 'solo' else 'team' end;
      new.min_team_size:=legacy_min;
      new.target_team_size:=legacy_min;
      new.max_team_size:=legacy_min;
    elsif new.participation_mode='solo' then
      new.min_team_size:=1;
      new.target_team_size:=1;
      new.max_team_size:=1;
    end if;
    new.team_size_threshold:=new.min_team_size;
    return new;
  end if;

  canonical_changed:=old.participation_mode is distinct from new.participation_mode
    or old.min_team_size is distinct from new.min_team_size
    or old.target_team_size is distinct from new.target_team_size
    or old.max_team_size is distinct from new.max_team_size;

  if old.team_size_threshold is distinct from new.team_size_threshold and not canonical_changed then
    new.min_team_size:=legacy_min;
    new.target_team_size:=greatest(new.target_team_size,legacy_min);
    new.max_team_size:=greatest(new.max_team_size,new.target_team_size);
    if legacy_min=1 and new.participation_mode='team' then
      new.participation_mode:='flexible';
    elsif legacy_min>=2 and new.participation_mode='solo' then
      new.participation_mode:='team';
    end if;
  else
    if new.participation_mode='solo' then
      new.min_team_size:=1;
      new.target_team_size:=1;
      new.max_team_size:=1;
    end if;
    new.team_size_threshold:=new.min_team_size;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_project_participation_contract on public.projects;
create trigger sync_project_participation_contract
before insert or update of team_size_threshold,participation_mode,min_team_size,target_team_size,max_team_size
on public.projects
for each row execute function public.sync_project_participation_contract();

revoke all on function public.sync_project_participation_contract() from public,anon,authenticated;
