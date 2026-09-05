create sequence if not exists public.mettelo_member_number_seq as bigint start with 100001;

alter table public.profiles
  add column if not exists username text,
  add column if not exists member_id text,
  add column if not exists username_claimed_at timestamptz,
  add column if not exists username_claim_attempted_at timestamptz;

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

create or replace function public.protect_member_identity_fields()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  if new.member_id is distinct from old.member_id then
    raise exception 'member_id is immutable' using errcode='42501';
  end if;
  if current_setting('app.member_identity_claim',true) is distinct from '1' and (
    new.username is distinct from old.username or
    new.username_claimed_at is distinct from old.username_claimed_at or
    new.username_claim_attempted_at is distinct from old.username_claim_attempted_at
  ) then
    raise exception 'member identity fields must be changed through the canonical identity operation' using errcode='42501';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_member_identity on public.profiles;
create trigger profiles_protect_member_identity
before update on public.profiles
for each row execute function public.protect_member_identity_fields();

create or replace function public.claim_member_username(p_username text)
returns table(success boolean, code text, claimed_username text, claimed_member_id text)
language plpgsql
security invoker
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

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path=public
as $$
declare
  requested_username text:=lower(trim(coalesce(new.raw_user_meta_data->>'username','')));
begin
  if requested_username='' then requested_username:=null; end if;
  insert into public.profiles (id,full_name,username,username_claimed_at)
  values (new.id,coalesce(new.raw_user_meta_data->>'full_name',''),requested_username,case when requested_username is null then null else now() end)
  on conflict (id) do nothing;
  return new;
end;
$$;
