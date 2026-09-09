-- Project Experience Phase 16: Member Exit, Handover & Replacement.
-- Extends canonical project_members/project_runs. No duplicate membership, run,
-- recruitment, Offer, invitation, responsibility or Proof system is introduced.

alter table public.project_members
  add column if not exists departure_state text not null default 'none',
  add column if not exists leaving_at timestamptz,
  add column if not exists handover_note text;

alter table public.project_members drop constraint if exists project_members_departure_state_check;
alter table public.project_members add constraint project_members_departure_state_check
  check (departure_state in ('none','leaving','left'));

alter table public.project_members drop constraint if exists project_members_handover_note_check;
alter table public.project_members add constraint project_members_handover_note_check
  check (handover_note is null or char_length(btrim(handover_note)) between 20 and 2000);

-- Preserve historical terminal memberships already present before Phase 16.
update public.project_members
set departure_state='left',
    leaving_at=coalesce(leaving_at,left_at,joined_at)
where membership_status='left' and departure_state='none';

comment on column public.project_members.departure_state is
  'Phase 16 active-member departure lifecycle. leaving remains a live membership; left is historical and no longer consumes capacity.';
comment on column public.project_members.handover_note is
  'Non-sensitive delivery handover supplied by a departing member. Do not store credentials, private personal data or secrets.';

create index if not exists project_members_departure_run_idx
  on public.project_members(project_run_id,departure_state,membership_status)
  where departure_state<>'none';

create or replace function public.phase16_transition_member_departure(
  p_project_id uuid,
  p_run_id uuid,
  p_user_id uuid,
  p_action text,
  p_handover_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  member_row public.project_members%rowtype;
  project_row public.projects%rowtype;
  run_row public.project_runs%rowtype;
  clean_handover text:=nullif(btrim(coalesce(p_handover_note,'')),'');
  active_members integer:=0;
  maximum_members integer:=1;
  should_reopen boolean:=false;
begin
  if p_project_id is null or p_run_id is null or p_user_id is null then
    raise exception using errcode='23514',message='DEPARTURE_CONTEXT_REQUIRED';
  end if;
  if p_action not in ('request','complete') then
    raise exception using errcode='23514',message='INVALID_DEPARTURE_ACTION';
  end if;

  select * into project_row from public.projects where id=p_project_id for update;
  if project_row.id is null then raise exception using errcode='P0002',message='PROJECT_NOT_FOUND'; end if;
  perform public.phase9_lock_project_capacity(project_row.id);

  select * into run_row from public.project_runs
  where id=p_run_id and project_id=p_project_id for update;
  if run_row.id is null then raise exception using errcode='P0002',message='PROJECT_RUN_NOT_FOUND'; end if;
  if run_row.status<>'active' or coalesce(run_row.has_started,false)=false then
    raise exception using errcode='23514',message='ACTIVE_STARTED_RUN_REQUIRED';
  end if;

  select * into member_row from public.project_members
  where project_id=p_project_id and project_run_id=p_run_id and user_id=p_user_id
  for update;
  if member_row.id is null then raise exception using errcode='P0002',message='MEMBERSHIP_NOT_FOUND'; end if;

  if p_action='request' then
    if member_row.membership_status<>'active' then
      raise exception using errcode='23514',message='ACTIVE_MEMBERSHIP_REQUIRED';
    end if;
    if clean_handover is null or char_length(clean_handover)<20 or char_length(clean_handover)>2000 then
      raise exception using errcode='23514',message='HANDOVER_LENGTH_INVALID';
    end if;
    if member_row.departure_state='left' then
      raise exception using errcode='23514',message='MEMBER_ALREADY_LEFT';
    end if;

    update public.project_members
    set departure_state='leaving',
        leaving_at=coalesce(leaving_at,now()),
        handover_note=clean_handover
    where id=member_row.id;

    insert into public.project_activity_log(
      project_id,project_run_id,event_type,actor_type,actor_user_id,from_status,to_status,metadata
    ) values (
      p_project_id,p_run_id,'member_departure_requested','user',p_user_id,
      'active','leaving',jsonb_build_object('membership_id',member_row.id,'handover_recorded',true)
    );

    return jsonb_build_object('state','leaving','membership_id',member_row.id,'run_id',p_run_id,'capacity_released',false);
  end if;

  if member_row.membership_status='left' and member_row.departure_state='left' then
    return jsonb_build_object('state','left','membership_id',member_row.id,'run_id',p_run_id,'already_left',true,'recruitment_open',run_row.recruitment_open);
  end if;
  if member_row.membership_status<>'active' or member_row.departure_state<>'leaving' then
    raise exception using errcode='23514',message='DEPARTURE_REQUEST_REQUIRED';
  end if;

  -- Release current delivery ownership while retaining assignment history.
  update public.project_member_responsibilities
  set assignment_status='released',released_at=coalesce(released_at,now()),updated_at=now()
  where project_member_id=member_row.id and assignment_status='active';

  -- Revoke delegated final-submission authority without deleting its audit row.
  update public.project_submission_permissions
  set revoked_at=coalesce(revoked_at,now())
  where project_run_id=p_run_id and user_id=p_user_id and revoked_at is null;

  -- Canonical terminal status removes private active-member authority and releases
  -- Phase 9 occupied capacity while preserving the membership/history row.
  update public.project_members
  set membership_status='left',departure_state='left',left_at=coalesce(left_at,now())
  where id=member_row.id;

  select count(*)::integer into active_members
  from public.project_members
  where project_run_id=p_run_id and membership_status='active';

  maximum_members:=case when project_row.participation_mode='solo' then 1
    else greatest(coalesce(project_row.max_team_size,project_row.target_team_size,project_row.min_team_size,1),1) end;

  -- Phase 9 treats NULL late_joining_enabled as the established enabled default.
  -- Keep Phase 16 reopening semantically identical: only explicit false disables.
  should_reopen:=project_row.participation_mode<>'solo'
    and coalesce(project_row.late_joining_enabled,true)=true
    and (project_row.late_joining_cutoff_at is null or now()<project_row.late_joining_cutoff_at)
    and active_members<maximum_members;

  if should_reopen then
    update public.project_runs set recruitment_open=true,updated_at=now()
    where id=p_run_id and project_id=p_project_id and status='active' and has_started=true;
  end if;

  insert into public.project_activity_log(
    project_id,project_run_id,event_type,actor_type,actor_user_id,from_status,to_status,metadata
  ) values (
    p_project_id,p_run_id,'member_departure_completed','user',p_user_id,
    'leaving','left',jsonb_build_object(
      'membership_id',member_row.id,
      'capacity_released',true,
      'recruitment_reopened',should_reopen,
      'same_run_replacement_required',should_reopen
    )
  );

  return jsonb_build_object(
    'state','left','membership_id',member_row.id,'run_id',p_run_id,
    'capacity_released',true,'recruitment_open',should_reopen
  );
end;
$$;

revoke all on function public.phase16_transition_member_departure(uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.phase16_transition_member_departure(uuid,uuid,uuid,text,text) to service_role;
