-- Project Experience Phase 18B: secure external collaboration invitation transport.
--
-- External invitations are scoped to one canonical collaboration need / project / run.
-- The raw token is never persisted. Server routes store only a SHA-256 token hash.
-- Invitation acceptance is an expression of interest only; membership remains governed
-- by the canonical project application/admission path and same-run capacity controls.

create table if not exists public.project_external_collaboration_invites (
  id uuid primary key default gen_random_uuid(),
  collaboration_need_id uuid not null references public.project_collaboration_needs(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  project_run_id uuid not null references public.project_runs(id) on delete cascade,
  invited_by uuid not null references public.profiles(id) on delete restrict,
  invitee_email text not null,
  invitee_email_hash text not null,
  token_hash text not null unique,
  status text not null default 'pending' check (status in ('pending','accepted','declined','expired','revoked','invalidated')),
  expires_at timestamptz not null,
  responded_at timestamptz,
  accepted_by uuid references public.profiles(id) on delete set null,
  revoked_at timestamptz,
  invalidated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint phase18_external_invite_email_normalized check (invitee_email=lower(btrim(invitee_email))),
  constraint phase18_external_invite_expiry_after_create check (expires_at>created_at),
  constraint phase18_external_invite_response_state check (
    (status='pending' and responded_at is null and revoked_at is null and invalidated_at is null)
    or (status='accepted' and responded_at is not null and accepted_by is not null)
    or (status='declined' and responded_at is not null)
    or (status='expired')
    or (status='revoked' and revoked_at is not null)
    or (status='invalidated' and invalidated_at is not null)
  )
);

create unique index if not exists phase18_external_invite_one_pending_recipient
  on public.project_external_collaboration_invites(collaboration_need_id,invitee_email_hash)
  where status='pending';
create index if not exists phase18_external_invite_lookup_idx
  on public.project_external_collaboration_invites(token_hash,status,expires_at);
create index if not exists phase18_external_invite_need_idx
  on public.project_external_collaboration_invites(collaboration_need_id,status,created_at desc);
create index if not exists phase18_external_invite_run_idx
  on public.project_external_collaboration_invites(project_run_id,status,created_at desc);

create table if not exists public.project_external_invite_rate_limits (
  actor_user_id uuid primary key references auth.users(id) on delete cascade,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count>=0),
  updated_at timestamptz not null default now()
);

alter table public.project_external_collaboration_invites enable row level security;
alter table public.project_external_invite_rate_limits enable row level security;

revoke all on table public.project_external_collaboration_invites from public,anon,authenticated;
revoke all on table public.project_external_invite_rate_limits from public,anon,authenticated;
grant all on table public.project_external_collaboration_invites to service_role;
grant all on table public.project_external_invite_rate_limits to service_role;

create or replace function public.phase18_guard_external_collaboration_invite()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  need_row public.project_collaboration_needs%rowtype;
  run_row public.project_runs%rowtype;
begin
  select * into need_row from public.project_collaboration_needs where id=new.collaboration_need_id;
  if need_row.id is null then raise exception using errcode='P0002',message='COLLABORATION_NEED_NOT_FOUND'; end if;
  if need_row.project_id<>new.project_id or need_row.project_run_id<>new.project_run_id then
    raise exception using errcode='23514',message='EXTERNAL_INVITE_NEED_CONTEXT_MISMATCH';
  end if;
  select * into run_row from public.project_runs where id=new.project_run_id and project_id=new.project_id;
  if run_row.id is null then raise exception using errcode='23514',message='EXTERNAL_INVITE_RUN_PROJECT_MISMATCH'; end if;
  new.invitee_email:=lower(btrim(new.invitee_email));
  new.updated_at:=now();
  return new;
end;
$$;

revoke all on function public.phase18_guard_external_collaboration_invite() from public,anon,authenticated;
drop trigger if exists phase18_external_collaboration_invite_guard on public.project_external_collaboration_invites;
create trigger phase18_external_collaboration_invite_guard
before insert or update on public.project_external_collaboration_invites
for each row execute function public.phase18_guard_external_collaboration_invite();

create or replace function public.phase18_consume_external_invite_rate_limit(p_actor uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  limiter public.project_external_invite_rate_limits%rowtype;
  now_at timestamptz:=now();
begin
  if p_actor is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  insert into public.project_external_invite_rate_limits(actor_user_id,window_started_at,request_count,updated_at)
  values(p_actor,now_at,1,now_at)
  on conflict(actor_user_id) do nothing;
  select * into limiter from public.project_external_invite_rate_limits where actor_user_id=p_actor for update;
  if limiter.window_started_at<=now_at-interval '1 hour' then
    update public.project_external_invite_rate_limits set window_started_at=now_at,request_count=1,updated_at=now_at where actor_user_id=p_actor;
  elsif limiter.request_count>=20 then
    raise exception using errcode='P0001',message='EXTERNAL_INVITE_RATE_LIMITED';
  else
    update public.project_external_invite_rate_limits set request_count=request_count+1,updated_at=now_at where actor_user_id=p_actor;
  end if;
end;
$$;

revoke all on function public.phase18_consume_external_invite_rate_limit(uuid) from public,anon,authenticated;
grant execute on function public.phase18_consume_external_invite_rate_limit(uuid) to service_role;

comment on table public.project_external_collaboration_invites is
  'Phase 18B external invite transport. Raw tokens are never stored; accepting an invite only restores canonical collaboration-interest context and never grants project membership.';