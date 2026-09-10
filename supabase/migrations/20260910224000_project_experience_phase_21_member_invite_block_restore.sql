-- Release-gate repair: preserve Phase 18 member-block safety when Phase 21
-- strengthens the canonical collaboration invitation guard.
--
-- Phase 21 replaced phase18_guard_member_collaboration_invite() with additional
-- project/run policy checks but accidentally dropped the existing bilateral block
-- check from Phase 18A. Recompose both contracts here so service-role inserts
-- cannot bypass a member interaction block.

create or replace function public.phase18_guard_member_collaboration_invite()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  need_row public.project_collaboration_needs%rowtype;
  run_row public.project_runs%rowtype;
  project_row public.projects%rowtype;
  blocked_pair boolean:=false;
begin
  select * into need_row
  from public.project_collaboration_needs
  where id=new.collaboration_need_id;

  if need_row.id is null then
    raise exception using errcode='P0002',message='COLLABORATION_NEED_NOT_FOUND';
  end if;
  if need_row.project_id<>new.project_id or need_row.project_run_id<>new.project_run_id then
    raise exception using errcode='23514',message='MEMBER_INVITE_NEED_CONTEXT_MISMATCH';
  end if;

  select * into run_row
  from public.project_runs
  where id=new.project_run_id and project_id=new.project_id;

  if run_row.id is null then
    raise exception using errcode='23514',message='MEMBER_INVITE_RUN_PROJECT_MISMATCH';
  end if;

  select * into project_row
  from public.projects
  where id=new.project_id;

  if project_row.id is null then
    raise exception using errcode='P0002',message='MEMBER_INVITE_PROJECT_NOT_FOUND';
  end if;

  -- Phase 18A safety boundary: a block in either direction is authoritative for
  -- every new invitation, including service-role writes. Existing pending invites
  -- may still be transitioned to invalidated by the block invalidation trigger.
  select exists (
    select 1
    from public.member_interaction_blocks b
    where (b.blocker_user_id=new.invited_by and b.blocked_user_id=new.invitee_user_id)
       or (b.blocker_user_id=new.invitee_user_id and b.blocked_user_id=new.invited_by)
  ) into blocked_pair;

  if blocked_pair and (tg_op='INSERT' or new.status='pending') then
    raise exception using errcode='23514',message='MEMBER_INVITE_BLOCKED';
  end if;

  if new.status='pending' then
    if need_row.status<>'active' then
      raise exception using errcode='23514',message='MEMBER_INVITE_NEED_CLOSED';
    end if;
    if project_row.status in ('completed','cancelled','archived') then
      raise exception using errcode='23514',message='MEMBER_INVITE_PROJECT_CLOSED';
    end if;
    if coalesce(project_row.collaboration_marketplace_enabled,false) is not true then
      raise exception using errcode='42501',message='MEMBER_INVITE_MARKETPLACE_DISABLED';
    end if;
    if coalesce(project_row.member_invites_enabled,false) is not true then
      raise exception using errcode='42501',message='MEMBER_INVITES_DISABLED';
    end if;
    if coalesce(project_row.late_joining_enabled,false) is not true then
      raise exception using errcode='23514',message='MEMBER_INVITE_LATE_JOINING_DISABLED';
    end if;
    if project_row.late_joining_cutoff_at is not null
       and project_row.late_joining_cutoff_at<=now() then
      raise exception using errcode='23514',message='MEMBER_INVITE_JOINING_WINDOW_CLOSED';
    end if;
    if run_row.status not in ('forming','active')
       or coalesce(run_row.recruitment_open,false) is not true then
      raise exception using errcode='23514',message='MEMBER_INVITE_RUN_RECRUITMENT_CLOSED';
    end if;
  end if;

  new.updated_at:=now();
  return new;
end;
$$;

revoke all on function public.phase18_guard_member_collaboration_invite()
from public,anon,authenticated;
