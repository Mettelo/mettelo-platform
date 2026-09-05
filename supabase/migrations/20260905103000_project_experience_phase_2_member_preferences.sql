create table if not exists public.member_privacy_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  allow_project_invitations boolean not null default true,
  allow_member_messages boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode='42501';
  end if;

  update public.profiles
     set is_public=coalesce(p_profile_discoverable,false),
         updated_at=now()
   where id=v_user_id;

  if not found then
    raise exception 'PROFILE_REQUIRED' using errcode='23503';
  end if;

  insert into public.member_privacy_preferences(
    user_id,allow_project_invitations,allow_member_messages,updated_at
  ) values (
    v_user_id,
    coalesce(p_allow_project_invitations,false),
    coalesce(p_allow_member_messages,false),
    now()
  )
  on conflict(user_id) do update set
    allow_project_invitations=excluded.allow_project_invitations,
    allow_member_messages=excluded.allow_member_messages,
    updated_at=excluded.updated_at
  returning * into v_result;

  return v_result;
end;
$$;

revoke all on function public.save_member_privacy_preferences(boolean,boolean,boolean) from public;
grant execute on function public.save_member_privacy_preferences(boolean,boolean,boolean) to authenticated;
