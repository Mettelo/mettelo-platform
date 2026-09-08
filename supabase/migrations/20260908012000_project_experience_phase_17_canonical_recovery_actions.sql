-- Phase 17 consequential support recovery.
-- This function coordinates existing Phase 10/16 authorities in one transaction.
-- It does not create another responsibility, Lead, membership or replacement model.

create or replace function public.phase17_execute_support_recovery(
  p_case_id uuid,
  p_action text,
  p_actor_user_id uuid,
  p_target_membership_id uuid default null,
  p_replacement_membership_id uuid default null,
  p_assignment_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  case_row public.project_support_cases%rowtype;
  target_member public.project_members%rowtype;
  replacement_member public.project_members%rowtype;
  assignment_row public.project_member_responsibilities%rowtype;
  action_result jsonb;
  release_result jsonb;
  removal_request jsonb;
  removal_result jsonb;
  replacement_result jsonb;
  safe_reason text;
begin
  if p_case_id is null or p_actor_user_id is null then
    raise exception using errcode='23514',message='SUPPORT_RECOVERY_CONTEXT_REQUIRED';
  end if;
  if p_action not in ('reassign_responsibility','change_lead','request_replacement','remove_member') then
    raise exception using errcode='23514',message='INVALID_SUPPORT_RECOVERY_ACTION';
  end if;

  select * into case_row
  from public.project_support_cases
  where id=p_case_id
  for update;
  if case_row.id is null then
    raise exception using errcode='P0002',message='SUPPORT_CASE_NOT_FOUND';
  end if;
  if case_row.status in ('resolved','closed') then
    raise exception using errcode='23514',message='SUPPORT_CASE_NOT_ACTIONABLE';
  end if;

  safe_reason:='Governed Phase 17 support recovery for case '||case_row.id::text;

  if p_action='reassign_responsibility' then
    if p_assignment_id is null or p_replacement_membership_id is null then
      raise exception using errcode='23514',message='RESPONSIBILITY_REASSIGNMENT_CONTEXT_REQUIRED';
    end if;
    select * into assignment_row
    from public.project_member_responsibilities
    where id=p_assignment_id
      and project_id=case_row.project_id
      and project_run_id=case_row.project_run_id
    for update;
    if assignment_row.id is null or assignment_row.assignment_status<>'active' then
      raise exception using errcode='23514',message='ACTIVE_RESPONSIBILITY_ASSIGNMENT_REQUIRED';
    end if;

    select * into replacement_member
    from public.project_members
    where id=p_replacement_membership_id
      and project_id=case_row.project_id
      and project_run_id=case_row.project_run_id
      and membership_status='active'
    for update;
    if replacement_member.id is null then
      raise exception using errcode='23514',message='ACTIVE_REPLACEMENT_MEMBERSHIP_REQUIRED';
    end if;

    release_result:=public.phase10_release_delivery_responsibility(
      assignment_row.id,p_actor_user_id,safe_reason
    );
    action_result:=public.phase10_assign_delivery_responsibility(
      replacement_member.id,assignment_row.responsibility,assignment_row.source_project_role_id,
      p_actor_user_id,safe_reason
    );

    insert into public.project_support_case_updates(case_id,actor_user_id,action,body,member_visible,metadata)
    values(case_row.id,p_actor_user_id,'responsibility_reassigned',null,false,jsonb_build_object(
      'from_membership_id',assignment_row.project_member_id,
      'to_membership_id',replacement_member.id,
      'assignment_id',assignment_row.id,
      'responsibility',assignment_row.responsibility
    ));

    return jsonb_build_object('action',p_action,'released',release_result,'assigned',action_result);
  end if;

  if p_action='change_lead' then
    if p_replacement_membership_id is null then
      raise exception using errcode='23514',message='LEAD_REPLACEMENT_MEMBERSHIP_REQUIRED';
    end if;
    select * into replacement_member
    from public.project_members
    where id=p_replacement_membership_id
      and project_id=case_row.project_id
      and project_run_id=case_row.project_run_id
      and membership_status='active'
    for update;
    if replacement_member.id is null then
      raise exception using errcode='23514',message='ACTIVE_REPLACEMENT_MEMBERSHIP_REQUIRED';
    end if;

    action_result:=public.phase10_confirm_project_lead(replacement_member.id,p_actor_user_id,safe_reason);
    insert into public.project_support_case_updates(case_id,actor_user_id,action,body,member_visible,metadata)
    values(case_row.id,p_actor_user_id,'lead_changed',null,false,jsonb_build_object(
      'new_lead_membership_id',replacement_member.id,'canonical_result',action_result
    ));
    return jsonb_build_object('action',p_action,'lead',action_result);
  end if;

  if p_action='request_replacement' then
    action_result:=public.phase16_request_replacement(case_row.project_id,case_row.project_run_id,p_actor_user_id);
    insert into public.project_support_case_updates(case_id,actor_user_id,action,body,member_visible,metadata)
    values(case_row.id,p_actor_user_id,'replacement_approved',null,false,jsonb_build_object('canonical_result',action_result));
    return jsonb_build_object('action',p_action,'replacement',action_result);
  end if;

  if p_target_membership_id is null then
    raise exception using errcode='23514',message='REMOVAL_TARGET_REQUIRED';
  end if;
  select * into target_member
  from public.project_members
  where id=p_target_membership_id
    and project_id=case_row.project_id
    and project_run_id=case_row.project_run_id
    and membership_status='active'
  for update;
  if target_member.id is null then
    raise exception using errcode='23514',message='ACTIVE_REMOVAL_TARGET_REQUIRED';
  end if;

  -- Never copy the private support description or Admin notes into Phase 16's
  -- team-readable handover. The operational handover is deliberately generic.
  removal_request:=public.phase16_transition_member_departure(
    case_row.project_id,case_row.project_run_id,target_member.user_id,'request',null,
    'other',null,
    'Governed support resolution. Preserve existing project history and reassign released delivery responsibilities.',
    null,null,null,null,null,null,null,'support_resolution'
  );
  removal_result:=public.phase16_transition_member_departure(
    case_row.project_id,case_row.project_run_id,target_member.user_id,'complete',null,
    null,null,null,null,null,null,null,null,null,null,'support_resolution'
  );

  -- If Phase 16 reports a recoverable vacancy, reuse its canonical replacement
  -- request. Joining cutoff/capacity policy remains authoritative inside Phase 16.
  if coalesce((removal_result->>'replacement_needed')::boolean,false) then
    begin
      replacement_result:=public.phase16_request_replacement(case_row.project_id,case_row.project_run_id,p_actor_user_id);
    exception when others then
      if sqlerrm='REPLACEMENT_JOINING_NOT_ALLOWED' then
        replacement_result:=jsonb_build_object('requested',false,'joining_not_allowed',true);
      else
        raise;
      end if;
    end;
  end if;

  insert into public.project_support_case_updates(case_id,actor_user_id,action,body,member_visible,metadata)
  values(case_row.id,p_actor_user_id,'member_removed',null,false,jsonb_build_object(
    'target_membership_id',target_member.id,
    'departure_source','support_resolution',
    'canonical_departure',removal_result,
    'canonical_replacement',replacement_result
  ));
  insert into public.project_activity_log(
    project_id,project_run_id,event_type,actor_type,actor_user_id,from_status,to_status,metadata
  ) values (
    case_row.project_id,case_row.project_run_id,'support_case_member_removed','admin',p_actor_user_id,
    case_row.status,'recovery_in_progress',jsonb_build_object(
      'support_case_id',case_row.id,'target_membership_id',target_member.id,'departure_source','support_resolution'
    )
  );

  return jsonb_build_object(
    'action',p_action,'departure_request',removal_request,'departure',removal_result,'replacement',replacement_result
  );
end;
$$;

revoke all on function public.phase17_execute_support_recovery(uuid,text,uuid,uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.phase17_execute_support_recovery(uuid,text,uuid,uuid,uuid,uuid) to service_role;

comment on function public.phase17_execute_support_recovery(uuid,text,uuid,uuid,uuid,uuid) is
  'Phase 17 transactional coordinator over canonical Phase 10 responsibility/Lead and Phase 16 departure/replacement authorities. Service role only.';
