-- Phase 21 database hardening for the updated Phase 18 recruitment contract.
--
-- Application routes remain responsible for UX/actor-specific policy, but the
-- database must fail closed even for privileged writes. Phase 19 completion
-- freeze remains authoritative; this migration composes with it rather than
-- reopening or replacing that lifecycle.

create or replace function public.phase18_validate_collaboration_need_context()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  run_row public.project_runs%rowtype;
  project_row public.projects%rowtype;
  role_project uuid;
  responsibility_known boolean:=false;
begin
  select * into run_row from public.project_runs where id=new.project_run_id;
  if run_row.id is null or run_row.project_id<>new.project_id then
    raise exception using errcode='23514',message='COLLABORATION_NEED_RUN_PROJECT_MISMATCH';
  end if;

  select * into project_row from public.projects where id=new.project_id;
  if project_row.id is null then
    raise exception using errcode='P0002',message='COLLABORATION_NEED_PROJECT_NOT_FOUND';
  end if;

  if new.status='active' then
    if coalesce(project_row.collaboration_marketplace_enabled,false) is not true then
      raise exception using errcode='42501',message='COLLABORATION_MARKETPLACE_DISABLED';
    end if;
    if project_row.status in ('completed','cancelled','archived') then
      raise exception using errcode='23514',message='COLLABORATION_NEED_PROJECT_CLOSED';
    end if;
    if coalesce(project_row.late_joining_enabled,false) is not true then
      raise exception using errcode='23514',message='COLLABORATION_NEED_LATE_JOINING_DISABLED';
    end if;
    if project_row.late_joining_cutoff_at is not null and project_row.late_joining_cutoff_at<=now() then
      raise exception using errcode='23514',message='COLLABORATION_NEED_JOINING_WINDOW_CLOSED';
    end if;
    if run_row.status not in ('forming','active') or coalesce(run_row.recruitment_open,false) is not true then
      raise exception using errcode='23514',message='COLLABORATION_NEED_RUN_RECRUITMENT_CLOSED';
    end if;
  end if;

  if new.source_project_role_id is not null then
    select project_id into role_project from public.project_roles where id=new.source_project_role_id;
    if role_project is null or role_project<>new.project_id then
      raise exception using errcode='23514',message='COLLABORATION_NEED_ROLE_PROJECT_MISMATCH';
    end if;
  end if;

  if new.responsibility is not null then
    select exists(
      select 1
      from public.project_roles pr,
           unnest(coalesce(pr.responsibilities,array[]::text[])) item(value)
      where pr.project_id=new.project_id
        and (new.source_project_role_id is null or pr.id=new.source_project_role_id)
        and lower(btrim(item.value))=lower(btrim(new.responsibility))
    ) into responsibility_known;
    if not responsibility_known then
      raise exception using errcode='23514',message='COLLABORATION_NEED_RESPONSIBILITY_NOT_CANONICAL';
    end if;
    new.responsibility=btrim(new.responsibility);
  end if;

  if new.member_message is not null then new.member_message=btrim(new.member_message); end if;
  if new.weekly_commitment is not null then new.weekly_commitment=nullif(btrim(new.weekly_commitment),''); end if;
  new.updated_at=now();
  return new;
end;
$$;

revoke all on function public.phase18_validate_collaboration_need_context() from public,anon,authenticated;

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
begin
  select * into need_row from public.project_collaboration_needs where id=new.collaboration_need_id;
  if need_row.id is null then raise exception using errcode='P0002',message='COLLABORATION_NEED_NOT_FOUND'; end if;
  if need_row.project_id<>new.project_id or need_row.project_run_id<>new.project_run_id then
    raise exception using errcode='23514',message='MEMBER_INVITE_NEED_CONTEXT_MISMATCH';
  end if;
  select * into run_row from public.project_runs where id=new.project_run_id and project_id=new.project_id;
  if run_row.id is null then raise exception using errcode='23514',message='MEMBER_INVITE_RUN_PROJECT_MISMATCH'; end if;
  select * into project_row from public.projects where id=new.project_id;
  if project_row.id is null then raise exception using errcode='P0002',message='MEMBER_INVITE_PROJECT_NOT_FOUND'; end if;

  if new.status='pending' then
    if need_row.status<>'active' then raise exception using errcode='23514',message='MEMBER_INVITE_NEED_CLOSED'; end if;
    if project_row.status in ('completed','cancelled','archived') then raise exception using errcode='23514',message='MEMBER_INVITE_PROJECT_CLOSED'; end if;
    if coalesce(project_row.collaboration_marketplace_enabled,false) is not true then raise exception using errcode='42501',message='MEMBER_INVITE_MARKETPLACE_DISABLED'; end if;
    if coalesce(project_row.member_invites_enabled,false) is not true then raise exception using errcode='42501',message='MEMBER_INVITES_DISABLED'; end if;
    if coalesce(project_row.late_joining_enabled,false) is not true then raise exception using errcode='23514',message='MEMBER_INVITE_LATE_JOINING_DISABLED'; end if;
    if project_row.late_joining_cutoff_at is not null and project_row.late_joining_cutoff_at<=now() then raise exception using errcode='23514',message='MEMBER_INVITE_JOINING_WINDOW_CLOSED'; end if;
    if run_row.status not in ('forming','active') or coalesce(run_row.recruitment_open,false) is not true then raise exception using errcode='23514',message='MEMBER_INVITE_RUN_RECRUITMENT_CLOSED'; end if;
  end if;

  new.updated_at:=now();
  return new;
end;
$$;

revoke all on function public.phase18_guard_member_collaboration_invite() from public,anon,authenticated;

create or replace function public.phase18_guard_external_collaboration_invite()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  need_row public.project_collaboration_needs%rowtype;
  run_row public.project_runs%rowtype;
  project_row public.projects%rowtype;
begin
  select * into need_row from public.project_collaboration_needs where id=new.collaboration_need_id;
  if need_row.id is null then raise exception using errcode='P0002',message='COLLABORATION_NEED_NOT_FOUND'; end if;
  if need_row.project_id<>new.project_id or need_row.project_run_id<>new.project_run_id then
    raise exception using errcode='23514',message='EXTERNAL_INVITE_NEED_CONTEXT_MISMATCH';
  end if;
  select * into run_row from public.project_runs where id=new.project_run_id and project_id=new.project_id;
  if run_row.id is null then raise exception using errcode='23514',message='EXTERNAL_INVITE_RUN_PROJECT_MISMATCH'; end if;
  select * into project_row from public.projects where id=new.project_id;
  if project_row.id is null then raise exception using errcode='P0002',message='EXTERNAL_INVITE_PROJECT_NOT_FOUND'; end if;

  if new.status='pending' then
    if need_row.status<>'active' then raise exception using errcode='23514',message='EXTERNAL_INVITE_NEED_CLOSED'; end if;
    if project_row.status in ('completed','cancelled','archived') then raise exception using errcode='23514',message='EXTERNAL_INVITE_PROJECT_CLOSED'; end if;
    if coalesce(project_row.collaboration_marketplace_enabled,false) is not true then raise exception using errcode='42501',message='EXTERNAL_INVITE_MARKETPLACE_DISABLED'; end if;
    if coalesce(project_row.external_collaboration_invites_enabled,false) is not true then raise exception using errcode='42501',message='EXTERNAL_INVITES_DISABLED'; end if;
    if coalesce(project_row.late_joining_enabled,false) is not true then raise exception using errcode='23514',message='EXTERNAL_INVITE_LATE_JOINING_DISABLED'; end if;
    if project_row.late_joining_cutoff_at is not null and project_row.late_joining_cutoff_at<=now() then raise exception using errcode='23514',message='EXTERNAL_INVITE_JOINING_WINDOW_CLOSED'; end if;
    if run_row.status not in ('forming','active') or coalesce(run_row.recruitment_open,false) is not true then raise exception using errcode='23514',message='EXTERNAL_INVITE_RUN_RECRUITMENT_CLOSED'; end if;
  end if;

  new.invitee_email:=lower(btrim(new.invitee_email));
  new.updated_at:=now();
  return new;
end;
$$;

revoke all on function public.phase18_guard_external_collaboration_invite() from public,anon,authenticated;

-- Any terminal project lifecycle transition, including archive and Phase 19
-- completion, closes the live marketplace state and invalidates outstanding
-- recruitment invitations. This is idempotent and historical rows remain intact.
create or replace function public.phase21_close_recruitment_on_terminal_project()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  close_reason text;
begin
  if new.status not in ('completed','cancelled','archived') then return new; end if;
  if old.status is not distinct from new.status then return new; end if;

  close_reason:=case new.status
    when 'completed' then 'project_completed'
    when 'archived' then 'project_archived'
    else 'project_cancelled'
  end;

  update public.project_collaboration_needs
  set status='closed',closed_reason=close_reason,closed_at=coalesce(closed_at,now()),updated_at=now()
  where project_id=new.id and status='active';

  update public.project_member_collaboration_invitations
  set status='invalidated',invalidated_at=coalesce(invalidated_at,now()),updated_at=now()
  where project_id=new.id and status='pending';

  update public.project_external_collaboration_invites
  set status='invalidated',invalidated_at=coalesce(invalidated_at,now()),updated_at=now()
  where project_id=new.id and status='pending';

  return new;
end;
$$;

revoke all on function public.phase21_close_recruitment_on_terminal_project() from public,anon,authenticated;

drop trigger if exists phase21_terminal_project_recruitment_close on public.projects;
create trigger phase21_terminal_project_recruitment_close
after update of status on public.projects
for each row execute function public.phase21_close_recruitment_on_terminal_project();

-- Switching the marketplace policy off also closes active opportunities and
-- invalidates pending invites. It does not touch membership, applications,
-- historical accepted/declined invitations, runs, Chat, completion or Proof.
create or replace function public.phase21_close_recruitment_when_marketplace_disabled()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if old.collaboration_marketplace_enabled is distinct from true
     or new.collaboration_marketplace_enabled is distinct from false then
    return new;
  end if;

  update public.project_collaboration_needs
  set status='closed',closed_reason='marketplace_disabled',closed_at=coalesce(closed_at,now()),updated_at=now()
  where project_id=new.id and status='active';

  update public.project_member_collaboration_invitations
  set status='invalidated',invalidated_at=coalesce(invalidated_at,now()),updated_at=now()
  where project_id=new.id and status='pending';

  update public.project_external_collaboration_invites
  set status='invalidated',invalidated_at=coalesce(invalidated_at,now()),updated_at=now()
  where project_id=new.id and status='pending';

  return new;
end;
$$;

revoke all on function public.phase21_close_recruitment_when_marketplace_disabled() from public,anon,authenticated;

drop trigger if exists phase21_marketplace_policy_close on public.projects;
create trigger phase21_marketplace_policy_close
after update of collaboration_marketplace_enabled on public.projects
for each row execute function public.phase21_close_recruitment_when_marketplace_disabled();
