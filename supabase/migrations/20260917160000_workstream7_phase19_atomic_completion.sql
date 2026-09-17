-- Workstream 7 / Phase 19: project completion is a project-level lifecycle.
-- Phase 20 contribution verification / Verified Proof is deliberately not a completion gate.

create or replace function public.project_completion_readiness(target_project uuid)
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
  with p as (
    select id,presentation_required
    from public.projects
    where id=target_project
  ),
  m as (
    select count(*) filter (where is_required)::integer required_count,
           count(*) filter (where is_required and status='completed')::integer completed_count
    from public.project_milestones
    where project_id=target_project
  ),
  t as (
    select count(*) filter (where is_required)::integer required_count,
           count(*) filter (where is_required and status='done')::integer completed_count
    from public.project_tasks
    where project_id=target_project
  ),
  pres as (
    select status
    from public.project_presentations
    where project_id=target_project
    order by updated_at desc nulls last
    limit 1
  )
  select jsonb_build_object(
    'ready',(
      m.required_count>0
      and m.required_count=m.completed_count
      and t.required_count=t.completed_count
      and (not p.presentation_required or coalesce(pres.status,'not_booked')='verified')
    ),
    'required_milestones',m.required_count,
    'completed_milestones',m.completed_count,
    'required_tasks',t.required_count,
    'completed_tasks',t.completed_count,
    'project_members_requiring_proof',0,
    'members_with_verified_proof',0,
    'pending_contributions',0,
    'presentation_required',p.presentation_required,
    'presentation_status',coalesce(pres.status,'not_booked'),
    'proof_verification_required',false
  )
  from p,m,t left join pres on true;
$$;
revoke all on function public.project_completion_readiness(uuid) from public,anon;
grant execute on function public.project_completion_readiness(uuid) to authenticated,service_role;

create or replace function public.project_run_completion_readiness(target_run uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  run_row public.project_runs%rowtype;
  base jsonb;
begin
  select * into run_row from public.project_runs where id=target_run;
  if run_row.id is null then
    raise exception using errcode='P0002',message='PROJECT_RUN_NOT_FOUND';
  end if;
  base:=public.project_completion_readiness(run_row.project_id);
  return base || jsonb_build_object(
    'run_id',run_row.id,
    'project_id',run_row.project_id,
    'run_status',run_row.status,
    'completion_state',run_row.completion_state,
    'proof_verification_required',false
  );
end;
$$;
revoke all on function public.project_run_completion_readiness(uuid) from public,anon;
grant execute on function public.project_run_completion_readiness(uuid) to authenticated,service_role;

-- Keep the Phase 19 alias aligned with the canonical run-scoped readiness contract.
create or replace function public.phase19_run_completion_readiness(p_run_id uuid)
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
  select public.project_run_completion_readiness(p_run_id);
$$;
revoke all on function public.phase19_run_completion_readiness(uuid) from public,anon;
grant execute on function public.phase19_run_completion_readiness(uuid) to authenticated,service_role;

-- A changes-required run remains inside the completion cycle. Recruitment must not reopen.
create or replace function public.phase19_guard_run_recruitment_freeze()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  if new.completion_state in ('final_review','changes_requested','completed') and coalesce(new.recruitment_open,false) then
    raise exception using errcode='23514',message='PHASE19_RECRUITMENT_FROZEN';
  end if;
  return new;
end;
$$;

create or replace function public.phase19_guard_collaboration_need_freeze()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare frozen boolean:=false;
begin
  if new.status<>'active' then return new; end if;
  select r.completion_state in ('final_review','changes_requested','completed')
  into frozen
  from public.project_runs r
  where r.id=new.project_run_id and r.project_id=new.project_id;
  if coalesce(frozen,false) then
    raise exception using errcode='23514',message='PHASE19_COLLABORATION_FROZEN';
  end if;
  return new;
end;
$$;

create or replace function public.phase19_guard_member_invite_freeze()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare frozen boolean:=false;
begin
  if new.status<>'pending' then return new; end if;
  select r.completion_state in ('final_review','changes_requested','completed')
  into frozen
  from public.project_runs r
  where r.id=new.project_run_id and r.project_id=new.project_id;
  if coalesce(frozen,false) then
    raise exception using errcode='23514',message='PHASE19_MEMBER_INVITE_FROZEN';
  end if;
  return new;
end;
$$;

create or replace function public.phase19_guard_external_invite_freeze()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare frozen boolean:=false;
begin
  if new.status<>'pending' then return new; end if;
  select r.completion_state in ('final_review','changes_requested','completed')
  into frozen
  from public.project_runs r
  where r.id=new.project_run_id and r.project_id=new.project_id;
  if coalesce(frozen,false) then
    raise exception using errcode='23514',message='PHASE19_EXTERNAL_INVITE_FROZEN';
  end if;
  return new;
end;
$$;

create or replace function public.phase19_guard_collaboration_interest_freeze()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  need_row public.project_collaboration_needs%rowtype;
  frozen boolean:=false;
begin
  if new.collaboration_need_id is null then return new; end if;
  select * into need_row from public.project_collaboration_needs where id=new.collaboration_need_id;
  if need_row.id is null then
    raise exception using errcode='P0002',message='COLLABORATION_NEED_NOT_FOUND';
  end if;
  select r.completion_state in ('final_review','changes_requested','completed')
  into frozen
  from public.project_runs r
  where r.id=need_row.project_run_id and r.project_id=need_row.project_id;
  if need_row.status<>'active' or coalesce(frozen,false) then
    raise exception using errcode='23514',message='PHASE19_COLLABORATION_INTEREST_FROZEN';
  end if;
  return new;
end;
$$;

-- Final submission is one exact-run transaction. The run lock serializes resubmission,
-- review, invitation/admission continuations and completion state changes.
create or replace function public.phase19_submit_final_proof(
  p_project_id uuid,
  p_run_id uuid,
  p_summary text,
  p_evidence_url text default null,
  p_github_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  actor uuid:=(select auth.uid());
  run_row public.project_runs%rowtype;
  project_row public.projects%rowtype;
  readiness jsonb;
  submission_row public.project_final_proof_submissions%rowtype;
  completion_request_id uuid;
  now_at timestamptz:=now();
  can_submit boolean:=false;
  presentation_status text:='not_booked';
begin
  if actor is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;

  select * into run_row
  from public.project_runs
  where id=p_run_id and project_id=p_project_id
  for update;
  if run_row.id is null then raise exception using errcode='P0002',message='PROJECT_RUN_NOT_FOUND'; end if;

  select * into project_row from public.projects where id=p_project_id;
  if project_row.id is null then raise exception using errcode='P0002',message='PROJECT_NOT_FOUND'; end if;

  can_submit:=public.is_admin() or exists(
    select 1 from public.project_architect_assignments paa
    where paa.project_id=p_project_id and paa.user_id=actor and paa.assignment_status='active'
  ) or exists(
    select 1 from public.project_members pm
    where pm.project_id=p_project_id and pm.project_run_id=p_run_id and pm.user_id=actor
      and pm.membership_status in ('active','completed') and pm.team_role in ('project_lead','project_architect')
  ) or exists(
    select 1 from public.project_submission_permissions psp
    where psp.project_id=p_project_id and psp.project_run_id=p_run_id and psp.user_id=actor and psp.revoked_at is null
  );
  if not can_submit then raise exception using errcode='42501',message='FINAL_SUBMISSION_NOT_AUTHORIZED'; end if;

  if run_row.status='completed' or run_row.completion_state='completed' then
    return jsonb_build_object('ok',true,'idempotent',true,'completion','completed','completed_at',coalesce(run_row.completed_at,run_row.completion_completed_at));
  end if;
  if run_row.status not in ('active','review') then raise exception using errcode='23514',message='INVALID_COMPLETION_TRANSITION'; end if;
  if char_length(btrim(coalesce(p_summary,'')))<30 then raise exception using errcode='23514',message='FINAL_SUMMARY_REQUIRED'; end if;
  if project_row.final_proof_required and nullif(btrim(coalesce(p_evidence_url,'')),'') is null then raise exception using errcode='23514',message='FINAL_PROOF_URL_REQUIRED'; end if;
  if project_row.github_repo_required and nullif(btrim(coalesce(p_github_url,'')),'') is null then raise exception using errcode='23514',message='GITHUB_URL_REQUIRED'; end if;

  if project_row.presentation_required then
    select coalesce(pp.status,'not_booked') into presentation_status
    from public.project_presentations pp
    where pp.project_id=p_project_id and pp.project_run_id=p_run_id
    order by pp.updated_at desc nulls last limit 1;
    if coalesce(presentation_status,'not_booked')<>'verified' then raise exception using errcode='23514',message='PRESENTATION_NOT_VERIFIED'; end if;
  end if;

  readiness:=public.project_run_completion_readiness(p_run_id);
  if coalesce((readiness->>'ready')::boolean,false) is not true then
    raise exception using errcode='23514',message='RUN_NOT_READY_FOR_FINAL_REVIEW',detail=readiness::text;
  end if;

  update public.project_final_proof_submissions
  set superseded_at=now_at
  where project_run_id=p_run_id and superseded_at is null;

  insert into public.project_final_proof_submissions(project_id,project_run_id,submitted_by_user_id,summary,evidence_url,github_url)
  values(p_project_id,p_run_id,actor,btrim(p_summary),nullif(btrim(coalesce(p_evidence_url,'')),''),nullif(btrim(coalesce(p_github_url,'')),''))
  returning * into submission_row;

  update public.project_collaboration_needs
  set status='closed',closed_reason='phase19_final_review',closed_at=now_at,updated_at=now_at
  where project_id=p_project_id and project_run_id=p_run_id and status='active';
  update public.project_member_collaboration_invitations
  set status='revoked',revoked_at=now_at,updated_at=now_at
  where project_id=p_project_id and project_run_id=p_run_id and status='pending';
  update public.project_external_collaboration_invites
  set status='invalidated',invalidated_at=now_at,updated_at=now_at
  where project_id=p_project_id and project_run_id=p_run_id and status='pending';

  if project_row.project_type='open' then
    update public.project_runs
    set status='completed',completion_state='completed',recruitment_open=false,
        completed_at=coalesce(completed_at,now_at),completion_completed_at=coalesce(completion_completed_at,now_at),
        completion_submitted_at=coalesce(completion_submitted_at,now_at),completion_submitted_by=coalesce(completion_submitted_by,actor),updated_at=now_at
    where id=p_run_id;
    update public.project_members
    set membership_status='completed',completed_at=coalesce(completed_at,now_at)
    where project_run_id=p_run_id and membership_status='active';
    update public.projects set status='completed',updated_at=now_at where id=p_project_id;
    insert into public.project_activity_log(project_id,project_run_id,event_type,actor_type,actor_user_id,from_status,to_status,metadata)
    values(p_project_id,p_run_id,'open_cohort_auto_completed','user',actor,run_row.status,'completed',jsonb_build_object('submission_id',submission_row.id,'recruitment_frozen',true));
    return jsonb_build_object('ok',true,'submission',to_jsonb(submission_row),'completion','completed','review_required',false,'completed_at',now_at,'recruitment_frozen',true);
  end if;

  select pcr.id into completion_request_id
  from public.project_completion_requests pcr
  where pcr.project_id=p_project_id and pcr.project_run_id=p_run_id and pcr.status='pending'
  order by pcr.created_at desc limit 1
  for update;

  if completion_request_id is null then
    insert into public.project_completion_requests(project_id,project_run_id,requested_by_user_id,status,readiness_snapshot,review_notes)
    values(p_project_id,p_run_id,actor,'pending',readiness || jsonb_build_object('phase19_ready',true,'final_proof_submission_id',submission_row.id,'proof_verification_required',false),null)
    returning id into completion_request_id;
  else
    update public.project_completion_requests
    set readiness_snapshot=readiness || jsonb_build_object('phase19_ready',true,'final_proof_submission_id',submission_row.id,'proof_verification_required',false)
    where id=completion_request_id;
  end if;

  update public.project_runs
  set status='review',completion_state='final_review',recruitment_open=false,
      completion_requested_at=now_at,completion_submitted_at=now_at,completion_submitted_by=actor,
      completion_reviewed_at=null,completion_reviewed_by=null,completion_review_notes=null,updated_at=now_at
  where id=p_run_id;

  insert into public.project_activity_log(project_id,project_run_id,event_type,actor_type,actor_user_id,from_status,to_status,metadata)
  values(p_project_id,p_run_id,'partner_completion_ready_for_review','user',actor,run_row.status,'review',jsonb_build_object('submission_id',submission_row.id,'request_id',completion_request_id,'recruitment_frozen',true));

  return jsonb_build_object('ok',true,'submission',to_jsonb(submission_row),'completion','ready_for_review','review_required',true,'request_id',completion_request_id,'recruitment_frozen',true);
end;
$$;
revoke all on function public.phase19_submit_final_proof(uuid,uuid,text,text,text) from public,anon;
grant execute on function public.phase19_submit_final_proof(uuid,uuid,text,text,text) to authenticated;
revoke execute on function public.phase19_submit_final_proof(uuid,uuid,text,text,text) from service_role;

-- Partner review is one transaction. A competing reviewer blocks on the same run row and
-- sees the committed result; no request can be approved while the run remains uncompleted.
create or replace function public.phase19_review_partner_completion(
  p_project_id uuid,
  p_run_id uuid,
  p_request_id uuid,
  p_decision text,
  p_review_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  actor uuid:=(select auth.uid());
  run_row public.project_runs%rowtype;
  project_row public.projects%rowtype;
  request_row public.project_completion_requests%rowtype;
  readiness jsonb;
  now_at timestamptz:=now();
  authorized boolean:=false;
begin
  if actor is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  if p_decision not in ('approved','changes_requested') then raise exception using errcode='22023',message='INVALID_REVIEW_DECISION'; end if;
  if p_decision='changes_requested' and nullif(btrim(coalesce(p_review_notes,'')),'') is null then raise exception using errcode='22023',message='REVIEW_NOTES_REQUIRED'; end if;

  select * into run_row
  from public.project_runs
  where id=p_run_id and project_id=p_project_id
  for update;
  if run_row.id is null then raise exception using errcode='P0002',message='PROJECT_RUN_NOT_FOUND'; end if;

  select * into project_row from public.projects where id=p_project_id;
  if project_row.id is null or project_row.project_type<>'partner' then raise exception using errcode='23514',message='PARTNER_PROJECT_REQUIRED'; end if;

  authorized:=public.is_admin() or exists(
    select 1 from public.project_architect_assignments paa
    where paa.project_id=p_project_id and paa.user_id=actor and paa.assignment_status='active'
  );
  if not authorized then raise exception using errcode='42501',message='COMPLETION_REVIEW_NOT_AUTHORIZED'; end if;

  if run_row.status='completed' or run_row.completion_state='completed' then
    return jsonb_build_object('ok',true,'idempotent',true,'decision','approved','completed_at',coalesce(run_row.completed_at,run_row.completion_completed_at),'recruitment_frozen',true);
  end if;
  if run_row.status<>'review' or run_row.completion_state<>'final_review' then raise exception using errcode='23514',message='RUN_NOT_IN_FINAL_REVIEW'; end if;

  select * into request_row
  from public.project_completion_requests
  where id=p_request_id and project_id=p_project_id and project_run_id=p_run_id
  for update;
  if request_row.id is null then raise exception using errcode='P0002',message='COMPLETION_REQUEST_NOT_FOUND'; end if;
  if request_row.status<>'pending' then raise exception using errcode='23514',message='COMPLETION_REQUEST_ALREADY_DECIDED'; end if;

  if p_decision='approved' then
    readiness:=public.project_run_completion_readiness(p_run_id);
    if coalesce((readiness->>'ready')::boolean,false) is not true then
      raise exception using errcode='23514',message='RUN_NO_LONGER_READY',detail=readiness::text;
    end if;
  end if;

  update public.project_completion_requests
  set status=p_decision,review_notes=nullif(btrim(coalesce(p_review_notes,'')),''),reviewed_by_user_id=actor,reviewed_at=now_at
  where id=p_request_id;

  if p_decision='changes_requested' then
    update public.project_runs
    set status='active',completion_state='changes_requested',recruitment_open=false,completion_requested_at=null,
        completion_reviewed_at=now_at,completion_reviewed_by=actor,completion_review_notes=btrim(p_review_notes),updated_at=now_at
    where id=p_run_id;
    update public.project_collaboration_needs
    set status='closed',closed_reason='phase19_changes_required',closed_at=now_at,updated_at=now_at
    where project_id=p_project_id and project_run_id=p_run_id and status='active';
    update public.project_member_collaboration_invitations
    set status='revoked',revoked_at=now_at,updated_at=now_at
    where project_id=p_project_id and project_run_id=p_run_id and status='pending';
    update public.project_external_collaboration_invites
    set status='invalidated',invalidated_at=now_at,updated_at=now_at
    where project_id=p_project_id and project_run_id=p_run_id and status='pending';
    insert into public.project_activity_log(project_id,project_run_id,event_type,actor_type,actor_user_id,from_status,to_status,metadata)
    values(p_project_id,p_run_id,'partner_completion_changes_requested','user',actor,'review','active',jsonb_build_object('request_id',p_request_id,'recruitment_frozen',true));
    return jsonb_build_object('ok',true,'decision','changes_requested','request_id',p_request_id,'recruitment_frozen',true);
  end if;

  update public.project_runs
  set status='completed',completion_state='completed',recruitment_open=false,
      completed_at=coalesce(completed_at,now_at),completion_completed_at=coalesce(completion_completed_at,now_at),
      completion_reviewed_at=now_at,completion_reviewed_by=actor,completion_review_notes=nullif(btrim(coalesce(p_review_notes,'')),''),updated_at=now_at
  where id=p_run_id;
  update public.project_members
  set membership_status='completed',completed_at=coalesce(completed_at,now_at)
  where project_run_id=p_run_id and membership_status='active';
  update public.projects set status='completed',updated_at=now_at where id=p_project_id;
  update public.project_collaboration_needs
  set status='closed',closed_reason='phase19_completed',closed_at=now_at,updated_at=now_at
  where project_id=p_project_id and project_run_id=p_run_id and status='active';
  update public.project_member_collaboration_invitations
  set status='revoked',revoked_at=now_at,updated_at=now_at
  where project_id=p_project_id and project_run_id=p_run_id and status='pending';
  update public.project_external_collaboration_invites
  set status='invalidated',invalidated_at=now_at,updated_at=now_at
  where project_id=p_project_id and project_run_id=p_run_id and status='pending';
  insert into public.project_activity_log(project_id,project_run_id,event_type,actor_type,actor_user_id,from_status,to_status,metadata)
  values(p_project_id,p_run_id,'partner_completion_approved','user',actor,'review','completed',jsonb_build_object('request_id',p_request_id,'recruitment_frozen',true,'proof_verification_required',false));

  return jsonb_build_object('ok',true,'decision','approved','request_id',p_request_id,'completed_at',now_at,'recruitment_frozen',true);
end;
$$;
revoke all on function public.phase19_review_partner_completion(uuid,uuid,uuid,text,text) from public,anon;
grant execute on function public.phase19_review_partner_completion(uuid,uuid,uuid,text,text) to authenticated;
revoke execute on function public.phase19_review_partner_completion(uuid,uuid,uuid,text,text) from service_role;
