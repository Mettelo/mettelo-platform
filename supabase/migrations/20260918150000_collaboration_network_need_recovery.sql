-- Collaboration Network final contract: need lifecycle, stale recovery and automatic invalidation.
-- Extends the canonical project_collaboration_needs model only.

alter table public.project_collaboration_needs
  drop constraint if exists project_collaboration_needs_status_check;

alter table public.project_collaboration_needs
  add constraint project_collaboration_needs_status_check
  check (status in ('active','needs_review','closed','cancelled'));

alter table public.project_collaboration_needs
  drop constraint if exists project_collaboration_need_status_check;

alter table public.project_collaboration_needs
  add constraint project_collaboration_need_status_check
  check (
    (status in ('active','needs_review') and closed_at is null)
    or (status in ('closed','cancelled') and closed_at is not null)
  );

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
    if run_row.status not in ('forming','active') or coalesce(run_row.recruitment_open,false) is not true then
      raise exception using errcode='23514',message='COLLABORATION_NEED_RUN_RECRUITMENT_CLOSED';
    end if;
    if run_row.status='active' and coalesce(project_row.late_joining_enabled,false) is not true then
      raise exception using errcode='23514',message='COLLABORATION_NEED_LATE_JOINING_DISABLED';
    end if;
    if project_row.late_joining_cutoff_at is not null and project_row.late_joining_cutoff_at<=now() then
      raise exception using errcode='23514',message='COLLABORATION_NEED_JOINING_WINDOW_CLOSED';
    end if;
  end if;

  if new.source_project_role_id is not null then
    select project_id into role_project from public.project_roles where id=new.source_project_role_id;
    if role_project is null or role_project<>new.project_id then
      if tg_op='UPDATE' then
        new.status='needs_review';
        new.source_project_role_id=null;
      else
        raise exception using errcode='23514',message='COLLABORATION_NEED_ROLE_PROJECT_MISMATCH';
      end if;
    end if;
  end if;

  -- responsibility is the member-facing "What help do you need?" text. It may be
  -- suggested from a canonical project responsibility but is intentionally editable.
  if new.responsibility is not null then
    new.responsibility=nullif(btrim(new.responsibility),'');
    if new.responsibility is not null and char_length(new.responsibility)>160 then
      raise exception using errcode='22001',message='COLLABORATION_NEED_HELP_TOO_LONG';
    end if;
  end if;
  if new.member_message is not null then new.member_message=nullif(btrim(new.member_message),''); end if;
  if new.weekly_commitment is not null then new.weekly_commitment=nullif(btrim(new.weekly_commitment),''); end if;
  new.updated_at=now();
  return new;
end;
$$;

revoke all on function public.phase18_validate_collaboration_need_context() from public,anon,authenticated;

create or replace function public.phase18_refresh_collaboration_needs_for_run(p_run_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  run_row public.project_runs%rowtype;
  project_row public.projects%rowtype;
  active_count integer:=0;
  maximum integer:=0;
  reason text:=null;
  closed_count integer:=0;
  review_count integer:=0;
  now_at timestamptz:=now();
begin
  select * into run_row from public.project_runs where id=p_run_id;
  if run_row.id is null then
    return jsonb_build_object('status','missing_run','run_id',p_run_id);
  end if;
  select * into project_row from public.projects where id=run_row.project_id;
  if project_row.id is null then
    return jsonb_build_object('status','missing_project','run_id',p_run_id);
  end if;

  select count(*)::integer into active_count
  from public.project_members
  where project_id=run_row.project_id
    and project_run_id=run_row.id
    and membership_status='active';

  maximum:=greatest(1,coalesce(project_row.max_team_size,project_row.target_team_size,project_row.min_team_size,1));

  if project_row.status='completed' then reason:='project_completed';
  elsif project_row.status='archived' then reason:='project_archived';
  elsif project_row.status='cancelled' then reason:='project_cancelled';
  elsif run_row.status not in ('forming','active') then reason:='run_no_longer_joinable';
  elsif coalesce(run_row.recruitment_open,false) is not true then reason:='recruitment_closed';
  elsif run_row.completion_state in ('final_review','completed') then reason:='completion_freeze';
  elsif run_row.status='active' and coalesce(project_row.late_joining_enabled,false) is not true then reason:='joining_closed';
  elsif project_row.late_joining_cutoff_at is not null and project_row.late_joining_cutoff_at<=now_at then reason:='joining_deadline_passed';
  elsif active_count>=maximum then reason:='team_full';
  end if;

  if reason is not null then
    update public.project_collaboration_needs
    set status='closed',
        closed_reason=reason,
        closed_at=coalesce(closed_at,now_at),
        updated_at=now_at
    where project_run_id=run_row.id
      and status in ('active','needs_review')
      and source<>'direct_invite';
    get diagnostics closed_count=row_count;
    return jsonb_build_object('status','closed','reason',reason,'closed_count',closed_count,'run_id',run_row.id);
  end if;

  update public.project_collaboration_needs n
  set status='needs_review',updated_at=now_at
  where n.project_run_id=run_row.id
    and n.status='active'
    and n.source_project_role_id is not null
    and not exists (
      select 1 from public.project_roles pr
      where pr.id=n.source_project_role_id and pr.project_id=n.project_id
    );
  get diagnostics review_count=row_count;

  return jsonb_build_object('status','open','review_count',review_count,'run_id',run_row.id);
end;
$$;

revoke all on function public.phase18_refresh_collaboration_needs_for_run(uuid) from public,anon,authenticated;
grant execute on function public.phase18_refresh_collaboration_needs_for_run(uuid) to service_role;

create or replace function public.phase18_refresh_needs_for_run_trigger()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  perform public.phase18_refresh_collaboration_needs_for_run(coalesce(new.id,old.id));
  return coalesce(new,old);
end;
$$;

revoke all on function public.phase18_refresh_needs_for_run_trigger() from public,anon,authenticated;

drop trigger if exists phase18_refresh_needs_on_run on public.project_runs;
create trigger phase18_refresh_needs_on_run
after update of status,recruitment_open,completion_state
on public.project_runs
for each row execute function public.phase18_refresh_needs_for_run_trigger();

create or replace function public.phase18_refresh_needs_for_membership_trigger()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if tg_op='UPDATE' and old.project_run_id is distinct from new.project_run_id then
    perform public.phase18_refresh_collaboration_needs_for_run(old.project_run_id);
  end if;
  perform public.phase18_refresh_collaboration_needs_for_run(coalesce(new.project_run_id,old.project_run_id));
  return coalesce(new,old);
end;
$$;

revoke all on function public.phase18_refresh_needs_for_membership_trigger() from public,anon,authenticated;

create or replace function public.phase18_refresh_needs_for_project_trigger()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  item record;
begin
  for item in select id from public.project_runs where project_id=coalesce(new.id,old.id) loop
    perform public.phase18_refresh_collaboration_needs_for_run(item.id);
  end loop;
  return coalesce(new,old);
end;
$$;

revoke all on function public.phase18_refresh_needs_for_project_trigger() from public,anon,authenticated;

drop trigger if exists phase18_refresh_needs_on_project on public.projects;
create trigger phase18_refresh_needs_on_project
after update of status,late_joining_enabled,late_joining_cutoff_at,max_team_size,target_team_size,min_team_size
on public.projects
for each row execute function public.phase18_refresh_needs_for_project_trigger();

drop trigger if exists phase18_refresh_needs_on_membership on public.project_members;
create trigger phase18_refresh_needs_on_membership
after insert or update of membership_status,project_run_id or delete
on public.project_members
for each row execute function public.phase18_refresh_needs_for_membership_trigger();

comment on function public.phase18_refresh_collaboration_needs_for_run(uuid) is
  'Reconciles canonical collaboration needs against live run/project lifecycle and capacity. Closes invalid listings without deleting history and marks structurally stale records for review.';
