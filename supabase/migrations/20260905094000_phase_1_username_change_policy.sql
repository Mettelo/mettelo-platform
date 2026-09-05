alter table public.profiles
  add column if not exists username_changed_at timestamptz;

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
  on public.member_username_history(user_id, replaced_at desc);

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

create or replace function public.claim_member_username(p_username text)
returns table(success boolean, code text, claimed_username text, claimed_member_id text)
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

revoke all on function public.claim_member_username(text) from public;
grant execute on function public.claim_member_username(text) to authenticated;

create or replace function public.change_member_username(p_username text)
returns table(success boolean, code text, changed_username text, stable_member_id text)
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
    update public.profiles
      set username=v_username,username_changed_at=now(),updated_at=now()
      where id=auth.uid();
  exception when unique_violation then
    return query select false,'UNAVAILABLE',null::text,v_member_id; return;
  end;

  return query select true,'CHANGED',v_username,v_member_id;
end;
$$;

revoke all on function public.change_member_username(text) from public;
grant execute on function public.change_member_username(text) to authenticated;

comment on table public.member_username_history is
  'Phase 1 security history. Previous usernames remain reserved so a later account cannot impersonate the former owner. Direct member access is denied; changes occur only through canonical identity functions.';
comment on function public.change_member_username(text) is
  'Authenticated owner-only username change. Preserves auth user and member_id, applies canonical validation, reserves the previous handle, and rate-limits changes to once every 30 days.';
