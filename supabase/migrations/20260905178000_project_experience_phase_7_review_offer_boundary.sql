-- Project Experience Phase 7: canonical admission, AUTO oversight and governed review.
--
-- Non-negotiable boundaries:
--   * Partner Project => REVIEW_REQUIRED. Partner + AUTO must not persist.
--   * Mettelo Open Project may be AUTO or REVIEW_REQUIRED.
--   * AUTO uses durable six-hour start scheduling with optional Admin intervention.
--   * REVIEW_REQUIRED selection stops at OFFERED; membership belongs to acceptance.

-- ---------------------------------------------------------------------------
-- Canonical Partner admission policy
-- ---------------------------------------------------------------------------

update public.projects
set admission_mode='review_required', updated_at=now()
where project_type='partner'
  and coalesce(admission_mode,'review_required')<>'review_required';

alter table public.projects
  drop constraint if exists projects_partner_requires_review_check;

alter table public.projects
  add constraint projects_partner_requires_review_check
  check (project_type is distinct from 'partner' or admission_mode='review_required');

comment on constraint projects_partner_requires_review_check on public.projects is
  'Partner Projects are always REVIEW_REQUIRED and can never persist AUTO admission.';

create or replace function public.effective_project_admission_mode(
  p_project_type text,
  p_admission_mode text
)
returns text
language sql
immutable
as $$
  select case
    when lower(coalesce(p_project_type,''))='partner' then 'review_required'
    when p_admission_mode='auto' then 'auto'
    else 'review_required'
  end
$$;

-- ---------------------------------------------------------------------------
-- AUTO six-hour durable oversight state
-- ---------------------------------------------------------------------------

alter table public.projects
  alter column auto_start_delay_minutes set default 360;

comment on column public.projects.auto_start_delay_minutes is
  'Delay after AUTO start conditions are first satisfied before scheduled auto-start. Programme default is 360 minutes (6 hours). Explicit per-project Open Project configuration remains authoritative.';

alter table public.project_runs
  add column if not exists start_ready_at timestamptz,
  add column if not exists auto_start_pause_reason text,
  add column if not exists auto_start_paused_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists auto_start_blocked_at timestamptz,
  add column if not exists auto_start_block_reason text,
  add column if not exists auto_start_blocked_by_user_id uuid references auth.users(id) on delete set null;

comment on column public.project_runs.start_ready_at is
  'Authoritative time at which the current AUTO start conditions became satisfied. Cleared when the schedule is invalidated and reset when readiness is restored.';
comment on column public.project_runs.auto_start_pause_reason is
  'Non-sensitive Admin reason for pausing automatic start. Member-facing surfaces must not expose confidential detail.';
comment on column public.project_runs.auto_start_blocked_at is
  'Authoritative timestamp for an explicit Admin block that prevents automatic or manual start until unblocked.';
comment on column public.project_runs.auto_start_block_reason is
  'Server-side operational reason for a blocked start. Do not expose confidential details to ordinary members.';

create or replace function public.phase7_capture_start_ready_at()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  if new.scheduled_start_at is null then
    new.start_ready_at:=null;
  elsif old.scheduled_start_at is null
     or new.scheduled_start_at is distinct from old.scheduled_start_at then
    new.start_ready_at:=coalesce(new.start_scheduled_at,now());
  end if;
  return new;
end;
$$;

drop trigger if exists project_run_start_ready_capture on public.project_runs;
create trigger project_run_start_ready_capture
before update of scheduled_start_at on public.project_runs
for each row execute function public.phase7_capture_start_ready_at();

-- Backfill a truthful ready timestamp for any unreleased Phase 6 scheduled run.
update public.project_runs
set start_ready_at=coalesce(start_scheduled_at,updated_at,now())
where scheduled_start_at is not null
  and start_ready_at is null;

-- ---------------------------------------------------------------------------
-- REVIEW_REQUIRED state machine and canonical audit note
-- ---------------------------------------------------------------------------

alter table public.project_applications
  add column if not exists clarification_requested_at timestamptz,
  add column if not exists clarification_response text,
  add column if not exists clarification_responded_at timestamptz;

comment on column public.project_applications.clarification_requested_at is
  'Time at which an authorized reviewer requested additional information from the applicant.';
comment on column public.project_applications.clarification_response is
  'Member-supplied response to the most recent clarification request. This does not create membership or change admission authority.';
comment on column public.project_applications.clarification_responded_at is
  'Time at which the member responded to the most recent clarification request.';

alter table public.project_applications
  drop constraint if exists project_applications_status_check;

alter table public.project_applications
  add constraint project_applications_status_check
  check (
    status in (
      'submitted',
      'in_review',
      'clarification_requested',
      'shortlisted',
      'offered',
      'approved',
      'accepted',
      'waiting_for_team',
      'team_complete',
      'declined',
      'withdrawn'
    )
  );

comment on constraint project_applications_status_check on public.project_applications is
  'Canonical project request lifecycle. REVIEW_REQUIRED uses submitted -> in_review -> clarification_requested/in_review, shortlisted, offered or declined. OFFERED is selection only and never membership.';

alter table public.project_application_events
  add column if not exists reviewer_notes text;

comment on column public.project_application_events.reviewer_notes is
  'Immutable snapshot of the review note/reason recorded with this request transition.';

create or replace function public.record_project_application_event()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if tg_op='INSERT' then
    insert into public.project_application_events(
      application_id,from_status,to_status,actor_user_id,reviewer_notes,created_at
    ) values(
      new.id,null,new.status,auth.uid(),new.reviewer_notes,coalesce(new.submitted_at,now())
    );
  elsif old.status is distinct from new.status then
    insert into public.project_application_events(
      application_id,from_status,to_status,actor_user_id,reviewer_notes,created_at
    ) values(
      new.id,old.status,new.status,auth.uid(),new.reviewer_notes,coalesce(new.updated_at,now())
    );
  end if;
  return new;
end;
$$;

revoke all on function public.record_project_application_event() from public,anon,authenticated;

-- One server-authoritative transition function protects legal review moves, Partner
-- policy, stale decisions and Offer capacity under a per-project advisory lock.
create or replace function public.phase7_transition_review_request(
  p_application_id uuid,
  p_to_status text,
  p_reviewer_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  app public.project_applications%rowtype;
  project public.projects%rowtype;
  actor uuid:=auth.uid();
  role_name text:=coalesce(auth.jwt()->'app_metadata'->>'role','');
  max_members integer;
  occupied integer:=0;
  reserved_offers integer:=0;
  now_at timestamptz:=now();
begin
  if actor is null or role_name<>'admin' then
    raise exception using errcode='42501',message='ADMIN_REQUIRED';
  end if;

  if p_to_status not in ('in_review','clarification_requested','shortlisted','offered','declined') then
    raise exception using errcode='23514',message='INVALID_REVIEW_STATUS';
  end if;

  select * into app
  from public.project_applications
  where id=p_application_id
  for update;
  if app.id is null then
    raise exception using errcode='P0002',message='APPLICATION_NOT_FOUND';
  end if;

  select * into project
  from public.projects
  where id=app.project_id
  for update;
  if project.id is null then
    raise exception using errcode='P0002',message='PROJECT_NOT_FOUND';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(project.id::text,7));

  if public.effective_project_admission_mode(project.project_type,project.admission_mode)<>'review_required'
     or app.admission_decision='auto_qualified' then
    raise exception using errcode='23514',message='AUTO_REVIEW_FORBIDDEN';
  end if;

  if app.status=p_to_status then
    return jsonb_build_object(
      'id',app.id,'status',app.status,'already_in_state',true,'creates_membership',false
    );
  end if;

  if not (
    (app.status='submitted' and p_to_status in ('in_review','declined')) or
    (app.status='in_review' and p_to_status in ('clarification_requested','shortlisted','offered','declined')) or
    (app.status='clarification_requested' and p_to_status in ('in_review','declined')) or
    (app.status='shortlisted' and p_to_status in ('offered','declined'))
  ) then
    raise exception using errcode='23514',message='INVALID_REVIEW_TRANSITION';
  end if;

  if p_to_status='offered' then
    max_members:=greatest(
      coalesce(project.max_team_size,project.target_team_size,project.team_size_threshold,project.min_team_size,1),
      1
    );

    select count(*)::integer into occupied
    from public.project_members
    where project_id=project.id
      and membership_status in ('waiting','active');

    select count(*)::integer into reserved_offers
    from public.project_applications
    where project_id=project.id
      and id<>app.id
      and status='offered';

    if occupied+reserved_offers>=max_members then
      raise exception using errcode='23514',message='OFFER_CAPACITY_FULL';
    end if;
  end if;

  update public.project_applications
  set status=p_to_status,
      reviewer_notes=nullif(left(trim(coalesce(p_reviewer_notes,'')),1500),''),
      clarification_requested_at=case when p_to_status='clarification_requested' then now_at else clarification_requested_at end,
      clarification_response=case when p_to_status='clarification_requested' then null else clarification_response end,
      clarification_responded_at=case when p_to_status='clarification_requested' then null else clarification_responded_at end,
      decision_at=case when p_to_status in ('offered','declined') then now_at else null end,
      decision_reason=case when p_to_status in ('offered','declined') then nullif(left(trim(coalesce(p_reviewer_notes,'')),1500),'') else null end,
      updated_at=now_at
  where id=app.id;

  return jsonb_build_object(
    'id',app.id,
    'status',p_to_status,
    'previous_status',app.status,
    'creates_membership',false,
    'requires_member_acceptance',p_to_status='offered',
    'capacity',case when p_to_status='offered' then jsonb_build_object(
      'confirmed',occupied,
      'reserved_offers',reserved_offers+1,
      'maximum',max_members
    ) else null end
  );
end;
$$;

revoke all on function public.phase7_transition_review_request(uuid,text,text) from public,anon;
grant execute on function public.phase7_transition_review_request(uuid,text,text) to authenticated;

-- Members may answer only their own active clarification request. The response returns
-- the same canonical row to IN_REVIEW and the existing status trigger records the
-- member actor via auth.uid().
create or replace function public.phase7_respond_to_clarification(
  p_application_id uuid,
  p_response text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  app public.project_applications%rowtype;
  actor uuid:=auth.uid();
  response_text text:=trim(coalesce(p_response,''));
  now_at timestamptz:=now();
begin
  if actor is null then
    raise exception using errcode='42501',message='AUTH_REQUIRED';
  end if;
  if length(response_text)<10 or length(response_text)>2000 then
    raise exception using errcode='23514',message='CLARIFICATION_RESPONSE_INVALID';
  end if;

  select * into app
  from public.project_applications
  where id=p_application_id
  for update;
  if app.id is null or app.user_id<>actor then
    raise exception using errcode='P0002',message='APPLICATION_NOT_FOUND';
  end if;
  if app.status<>'clarification_requested' then
    raise exception using errcode='23514',message='CLARIFICATION_NOT_ACTIVE';
  end if;

  update public.project_applications
  set status='in_review',
      clarification_response=response_text,
      clarification_responded_at=now_at,
      updated_at=now_at
  where id=app.id;

  return jsonb_build_object(
    'id',app.id,
    'status','in_review',
    'previous_status','clarification_requested',
    'clarification_responded_at',now_at
  );
end;
$$;

revoke all on function public.phase7_respond_to_clarification(uuid,text) from public,anon;
grant execute on function public.phase7_respond_to_clarification(uuid,text) to authenticated;

-- ---------------------------------------------------------------------------
-- Safe explicit conversion of an unstarted Open AUTO project to REVIEW_REQUIRED
-- ---------------------------------------------------------------------------

create or replace function public.phase7_convert_open_auto_to_review_required(
  p_project_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  project public.projects%rowtype;
  actor uuid:=auth.uid();
  role_name text:=coalesce(auth.jwt()->'app_metadata'->>'role','');
  now_at timestamptz:=now();
  active_count integer:=0;
begin
  if actor is null or role_name<>'admin' then
    raise exception using errcode='42501',message='ADMIN_REQUIRED';
  end if;

  select * into project from public.projects where id=p_project_id for update;
  if project.id is null then raise exception using errcode='P0002',message='PROJECT_NOT_FOUND'; end if;
  if project.project_type='partner' then
    raise exception using errcode='23514',message='PARTNER_ALWAYS_REVIEW_REQUIRED';
  end if;
  if public.effective_project_admission_mode(project.project_type,project.admission_mode)<>'auto' then
    return jsonb_build_object('project_id',project.id,'admission_mode','review_required','already_review_required',true);
  end if;

  perform pg_advisory_xact_lock(hashtextextended(project.id::text,8));

  select count(*)::integer into active_count
  from public.project_runs
  where project_id=project.id and (has_started=true or status='active');
  if active_count>0 then
    raise exception using errcode='23514',message='PROJECT_ALREADY_STARTED';
  end if;

  update public.project_members
  set membership_status='left',left_at=coalesce(left_at,now_at)
  where project_id=project.id and membership_status='waiting';

  update public.project_runs
  set status='cancelled',
      scheduled_start_at=null,
      start_scheduled_at=null,
      start_ready_at=null,
      auto_start_paused_at=null,
      auto_start_pause_reason=null,
      auto_start_paused_by_user_id=null,
      auto_start_blocked_at=null,
      auto_start_block_reason=null,
      auto_start_blocked_by_user_id=null,
      recruitment_open=false,
      recruitment_closed_at=coalesce(recruitment_closed_at,now_at),
      updated_at=now_at
  where project_id=project.id and has_started=false and status='forming';

  update public.project_applications
  set status='submitted',
      project_run_id=null,
      admission_mode_snapshot='review_required',
      admission_decision='review_required',
      admission_decided_at=now_at,
      approved_at=null,
      decision_at=null,
      decision_reason=null,
      updated_at=now_at
  where project_id=project.id
    and admission_decision='auto_qualified'
    and status in ('submitted','approved','accepted','waiting_for_team');

  update public.projects
  set admission_mode='review_required',
      auto_start_paused_at=null,
      updated_at=now_at,
      updated_by_user_id=actor
  where id=project.id;

  insert into public.project_activity_log(
    project_id,event_type,actor_type,actor_user_id,from_status,to_status,metadata
  ) values(
    project.id,'project_auto_converted_to_review_required','user',actor,'auto','review_required',
    jsonb_build_object('reason',nullif(left(trim(coalesce(p_reason,'')),500),''))
  );

  return jsonb_build_object('project_id',project.id,'admission_mode','review_required','converted',true);
end;
$$;

revoke all on function public.phase7_convert_open_auto_to_review_required(uuid,text) from public,anon;
grant execute on function public.phase7_convert_open_auto_to_review_required(uuid,text) to authenticated;

-- ---------------------------------------------------------------------------
-- Safe normalization of any unreleased Partner AUTO state that has not started.
-- Historical already-started rows are preserved for investigation rather than silently
-- rewriting active membership/history.
-- ---------------------------------------------------------------------------

update public.project_members pm
set membership_status='left',left_at=coalesce(pm.left_at,now())
from public.project_runs pr, public.projects p
where pm.project_run_id=pr.id
  and pr.project_id=p.id
  and p.project_type='partner'
  and pr.has_started=false
  and pm.membership_status='waiting';

update public.project_runs pr
set status='cancelled',scheduled_start_at=null,start_scheduled_at=null,start_ready_at=null,
    recruitment_open=false,recruitment_closed_at=coalesce(pr.recruitment_closed_at,now()),updated_at=now()
from public.projects p
where pr.project_id=p.id
  and p.project_type='partner'
  and pr.has_started=false
  and pr.status='forming';

update public.project_applications pa
set status='submitted',project_run_id=null,admission_mode_snapshot='review_required',
    admission_decision='review_required',admission_decided_at=now(),approved_at=null,
    decision_at=null,decision_reason=null,updated_at=now()
from public.projects p
where pa.project_id=p.id
  and p.project_type='partner'
  and pa.admission_decision='auto_qualified'
  and pa.status in ('submitted','approved','accepted','waiting_for_team')
  and not exists(
    select 1 from public.project_runs pr
    where pr.id=pa.project_run_id and (pr.has_started=true or pr.status='active')
  );
