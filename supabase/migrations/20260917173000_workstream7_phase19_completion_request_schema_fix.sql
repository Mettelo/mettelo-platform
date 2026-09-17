-- Workstream 7 / Phase 19 completion request schema compatibility.
--
-- The canonical project_completion_requests table has no created_at column.
-- Existing production code treats a run as having at most one pending completion
-- request and resolves it by project/run/status. Keep that canonical contract and
-- avoid inventing a parallel request timestamp solely for Phase 19 ordering.

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
  limit 1
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
