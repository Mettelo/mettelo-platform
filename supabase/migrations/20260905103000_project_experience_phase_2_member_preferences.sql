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
