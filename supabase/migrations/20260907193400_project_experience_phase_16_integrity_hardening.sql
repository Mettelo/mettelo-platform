-- Project Experience Phase 16: integrity and idempotency hardening.
--
-- Keep one canonical structured departure RPC, enforce that handovers cannot be
-- cross-wired between projects/runs/members/users, and make the operational
-- replacement request command idempotent without creating duplicate activity.

-- The structured Phase 16 RPC introduced in 20260907193200 supersedes the
-- original compatibility signature. Leaving the old overload callable would
-- preserve a second, weaker write contract for the same lifecycle.
drop function if exists public.phase16_transition_member_departure(uuid,uuid,uuid,text,text);

create or replace function public.phase16_validate_handover_context()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if not exists (
    select 1
    from public.project_members member
    join public.project_runs run
      on run.id=new.project_run_id
     and run.project_id=new.project_id
    where member.id=new.project_member_id
      and member.project_id=new.project_id
      and member.project_run_id=new.project_run_id
      and member.user_id=new.departing_user_id
  ) then
    raise exception using
      errcode='23514',
      message='HANDOVER_CONTEXT_MISMATCH';
  end if;

  return new;
end;
$$;

revoke all on function public.phase16_validate_handover_context() from public,anon,authenticated;

drop trigger if exists phase16_handover_context_guard on public.project_member_handovers;
create trigger phase16_handover_context_guard
before insert or update of project_id,project_run_id,project_member_id,departing_user_id
on public.project_member_handovers
for each row execute function public.phase16_validate_handover_context();

create or replace function public.phase16_request_replacement(
  p_project_id uuid,
  p_run_id uuid,
  p_actor_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  project_row public.projects%rowtype;
  run_row public.project_runs%rowtype;
  capacity jsonb;
  maximum_members integer:=1;
  occupied integer:=0;
  reserved integer:=0;
  can_recruit boolean:=false;
begin
  if p_project_id is null or p_run_id is null or p_actor_user_id is null then
    raise exception using errcode='23514',message='REPLACEMENT_REQUEST_CONTEXT_REQUIRED';
  end if;

  select * into project_row
  from public.projects
  where id=p_project_id
  for update;
  if project_row.id is null then
    raise exception using errcode='P0002',message='PROJECT_NOT_FOUND';
  end if;

  perform public.phase9_lock_project_capacity(p_project_id);

  select * into run_row
  from public.project_runs
  where id=p_run_id and project_id=p_project_id
  for update;
  if run_row.id is null then
    raise exception using errcode='P0002',message='PROJECT_RUN_NOT_FOUND';
  end if;
  if run_row.status<>'active' or coalesce(run_row.has_started,false)=false then
    raise exception using errcode='23514',message='ACTIVE_STARTED_RUN_REQUIRED';
  end if;

  if coalesce(run_row.replacement_needed,false)=false then
    return jsonb_build_object(
      'requested',false,
      'already_recovered',true,
      'run_id',p_run_id,
      'recruitment_open',run_row.recruitment_open
    );
  end if;

  -- A replacement request is an operational command, not a new vacancy record.
  -- Once recorded for this still-open recovery state, repeated clicks/retries are
  -- successful no-ops and must not create another project_activity_log event.
  if run_row.replacement_requested_at is not null then
    return jsonb_build_object(
      'requested',true,
      'already_requested',true,
      'run_id',p_run_id,
      'recruitment_open',run_row.recruitment_open,
      'requested_at',run_row.replacement_requested_at,
      'requested_by',run_row.replacement_requested_by
    );
  end if;

  capacity:=public.phase9_project_run_capacity(p_project_id,p_run_id);
  maximum_members:=coalesce((capacity->>'maximum')::integer,1);
  occupied:=coalesce((capacity->>'occupied')::integer,0);
  reserved:=coalesce((capacity->>'reserved')::integer,0);

  can_recruit:=project_row.participation_mode<>'solo'
    and coalesce(project_row.late_joining_enabled,true)=true
    and (project_row.late_joining_cutoff_at is null or now()<project_row.late_joining_cutoff_at)
    and occupied+reserved<maximum_members;

  if not can_recruit then
    raise exception using errcode='23514',message='REPLACEMENT_JOINING_NOT_ALLOWED';
  end if;

  update public.project_runs
  set replacement_requested_at=now(),
      replacement_requested_by=p_actor_user_id,
      recruitment_open=true,
      updated_at=now()
  where id=p_run_id;

  insert into public.project_activity_log(
    project_id,project_run_id,event_type,actor_type,actor_user_id,from_status,to_status,metadata
  ) values (
    p_project_id,p_run_id,'replacement_requested','user',p_actor_user_id,'active','active',
    jsonb_build_object(
      'run_id',p_run_id,
      'open_capacity',greatest(maximum_members-occupied-reserved,0),
      'joining_window_open',true
    )
  );

  return jsonb_build_object(
    'requested',true,
    'already_requested',false,
    'run_id',p_run_id,
    'recruitment_open',true,
    'open_capacity',greatest(maximum_members-occupied-reserved,0)
  );
end;
$$;

revoke all on function public.phase16_request_replacement(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.phase16_request_replacement(uuid,uuid,uuid) to service_role;
