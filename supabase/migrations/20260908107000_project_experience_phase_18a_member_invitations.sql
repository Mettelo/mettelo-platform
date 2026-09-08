-- Project Experience Phase 18A: governed invitations between existing Mettelo members.
--
-- Internal invitations are scoped to one canonical collaboration need / project / run.
-- Accepting an invitation never creates project membership. It only restores the
-- canonical same-run interest journey, where eligibility, capacity and joining rules
-- are revalidated before admission.

create table if not exists public.project_member_collaboration_invitations (
  id uuid primary key default gen_random_uuid(),
  collaboration_need_id uuid not null references public.project_collaboration_needs(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  project_run_id uuid not null references public.project_runs(id) on delete cascade,
  invited_by uuid not null references public.profiles(id) on delete restrict,
  invitee_user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined','expired','revoked','invalidated')),
  expires_at timestamptz not null,
  responded_at timestamptz,
  revoked_at timestamptz,
  invalidated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint phase18_member_invite_not_self check (invited_by<>invitee_user_id),
  constraint phase18_member_invite_expiry_after_create check (expires_at>created_at),
  constraint phase18_member_invite_response_state check (
    (status='pending' and responded_at is null and revoked_at is null and invalidated_at is null)
    or (status in ('accepted','declined') and responded_at is not null)
    or status='expired'
    or (status='revoked' and revoked_at is not null)
    or (status='invalidated' and invalidated_at is not null)
  )
);

create unique index if not exists phase18_member_invite_one_pending_invitee
  on public.project_member_collaboration_invitations(collaboration_need_id,invitee_user_id)
  where status='pending';
create index if not exists phase18_member_invite_recipient_idx
  on public.project_member_collaboration_invitations(invitee_user_id,status,created_at desc);
create index if not exists phase18_member_invite_sender_idx
  on public.project_member_collaboration_invitations(invited_by,status,created_at desc);
create index if not exists phase18_member_invite_run_idx
  on public.project_member_collaboration_invitations(project_run_id,status,created_at desc);

create table if not exists public.project_member_invite_rate_limits (
  actor_user_id uuid primary key references auth.users(id) on delete cascade,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count>=0),
  updated_at timestamptz not null default now()
);

alter table public.project_member_collaboration_invitations enable row level security;
alter table public.project_member_invite_rate_limits enable row level security;
revoke all on table public.project_member_collaboration_invitations from public,anon,authenticated;
revoke all on table public.project_member_invite_rate_limits from public,anon,authenticated;
grant all on table public.project_member_collaboration_invitations to service_role;
grant all on table public.project_member_invite_rate_limits to service_role;

create or replace function public.phase18_guard_member_collaboration_invite()
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
    raise exception using errcode='23514',message='MEMBER_INVITE_NEED_CONTEXT_MISMATCH';
  end if;
  select * into run_row from public.project_runs where id=new.project_run_id and project_id=new.project_id;
  if run_row.id is null then raise exception using errcode='23514',message='MEMBER_INVITE_RUN_PROJECT_MISMATCH'; end if;
  new.updated_at:=now();
  return new;
end;
$$;

revoke all on function public.phase18_guard_member_collaboration_invite() from public,anon,authenticated;
drop trigger if exists phase18_member_collaboration_invite_guard on public.project_member_collaboration_invitations;
create trigger phase18_member_collaboration_invite_guard
before insert or update on public.project_member_collaboration_invitations
for each row execute function public.phase18_guard_member_collaboration_invite();

create or replace function public.phase18_consume_member_invite_rate_limit(p_actor uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  limiter public.project_member_invite_rate_limits%rowtype;
  now_at timestamptz:=now();
begin
  if p_actor is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  insert into public.project_member_invite_rate_limits(actor_user_id,window_started_at,request_count,updated_at)
  values(p_actor,now_at,1,now_at)
  on conflict(actor_user_id) do nothing;
  select * into limiter from public.project_member_invite_rate_limits where actor_user_id=p_actor for update;
  if limiter.window_started_at<=now_at-interval '1 hour' then
    update public.project_member_invite_rate_limits set window_started_at=now_at,request_count=1,updated_at=now_at where actor_user_id=p_actor;
  elsif limiter.request_count>=20 then
    raise exception using errcode='P0001',message='MEMBER_INVITE_RATE_LIMITED';
  else
    update public.project_member_invite_rate_limits set request_count=request_count+1,updated_at=now_at where actor_user_id=p_actor;
  end if;
end;
$$;

revoke all on function public.phase18_consume_member_invite_rate_limit(uuid) from public,anon,authenticated;
grant execute on function public.phase18_consume_member_invite_rate_limit(uuid) to service_role;

comment on table public.project_member_collaboration_invitations is
  'Phase 18A existing-member invitations. Acceptance restores canonical same-run interest context and never grants membership directly.';