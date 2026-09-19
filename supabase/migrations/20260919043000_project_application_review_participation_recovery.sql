-- Project application review recovery: server-authoritative review transitions and explicit reviewer timestamps.
alter table public.project_applications
  add column if not exists review_started_at timestamptz,
  add column if not exists reviewer_user_id uuid references auth.users(id) on delete set null,
  add column if not exists declined_at timestamptz;

comment on column public.project_applications.review_started_at is
  'Canonical timestamp when human review first began for a REVIEW_REQUIRED project request.';
comment on column public.project_applications.reviewer_user_id is
  'Authorized Admin currently responsible for the latest human review transition.';
comment on column public.project_applications.declined_at is
  'Canonical timestamp when this request entered the declined terminal state.';

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
      new.id,null,new.status,coalesce(auth.uid(),new.reviewer_user_id),new.reviewer_notes,coalesce(new.submitted_at,now())
    );
  elsif old.status is distinct from new.status then
    insert into public.project_application_events(
      application_id,from_status,to_status,actor_user_id,reviewer_notes,created_at
    ) values(
      new.id,old.status,new.status,coalesce(new.reviewer_user_id,auth.uid()),new.reviewer_notes,coalesce(new.updated_at,now())
    );
  end if;
  return new;
end;
$$;

revoke all on function public.record_project_application_event() from public,anon,authenticated;

create or replace function public.phase7_transition_review_request_server(
  p_application_id uuid,
  p_to_status text,
  p_reviewer_notes text,
  p_actor_user_id uuid,
  p_expected_status text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  app public.project_applications%rowtype;
  project public.projects%rowtype;
  actor_role text;
  max_members integer;
  occupied integer:=0;
  reserved_offers integer:=0;
  now_at timestamptz:=now();
begin
  select coalesce(raw_app_meta_data->>'role','') into actor_role from auth.users where id=p_actor_user_id;
  if p_actor_user_id is null or actor_role<>'admin' then
    raise exception using errcode='42501',message='ADMIN_REQUIRED';
  end if;
  if p_to_status not in ('in_review','clarification_requested','shortlisted','offered','declined') then
    raise exception using errcode='23514',message='INVALID_REVIEW_STATUS';
  end if;

  select * into app from public.project_applications where id=p_application_id for update;
  if app.id is null then raise exception using errcode='P0002',message='APPLICATION_NOT_FOUND'; end if;

  select * into project from public.projects where id=app.project_id for update;
  if project.id is null then raise exception using errcode='P0002',message='PROJECT_NOT_FOUND'; end if;

  perform pg_advisory_xact_lock(hashtextextended(project.id::text,7));

  if public.effective_project_admission_mode(project.project_type,project.admission_mode)<>'review_required'
     or app.admission_decision='auto_qualified' then
    raise exception using errcode='23514',message='AUTO_REVIEW_FORBIDDEN';
  end if;

  if app.status=p_to_status then
    return jsonb_build_object('id',app.id,'status',app.status,'already_in_state',true,'creates_membership',false);
  end if;

  if p_expected_status is not null and app.status<>p_expected_status then
    return jsonb_build_object(
      'id',app.id,
      'status',app.status,
      'stale_state',true,
      'error_code','STALE_REVIEW_STATE',
      'expected_status',p_expected_status,
      'creates_membership',false
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
    max_members:=greatest(coalesce(project.max_team_size,project.target_team_size,project.team_size_threshold,project.min_team_size,1),1);
    select count(*)::integer into occupied from public.project_members where project_id=project.id and membership_status in ('waiting','active');
    select count(*)::integer into reserved_offers from public.project_applications where project_id=project.id and id<>app.id and status='offered';
    if occupied+reserved_offers>=max_members then
      raise exception using errcode='23514',message='OFFER_CAPACITY_FULL';
    end if;
  end if;

  update public.project_applications
  set status=p_to_status,
      reviewer_notes=nullif(left(trim(coalesce(p_reviewer_notes,'')),1500),''),
      reviewer_user_id=p_actor_user_id,
      review_started_at=case when p_to_status='in_review' then coalesce(review_started_at,now_at) else review_started_at end,
      declined_at=case when p_to_status='declined' then now_at else declined_at end,
      clarification_requested_at=case when p_to_status='clarification_requested' then now_at else clarification_requested_at end,
      clarification_response=case when p_to_status='clarification_requested' then null else clarification_response end,
      clarification_responded_at=case when p_to_status='clarification_requested' then null else clarification_responded_at end,
      decision_at=case when p_to_status in ('offered','declined') then now_at else decision_at end,
      decision_reason=case when p_to_status='declined' then nullif(left(trim(coalesce(p_reviewer_notes,'')),1500),'') when p_to_status='offered' then decision_reason else decision_reason end,
      updated_at=now_at
  where id=app.id;

  return jsonb_build_object(
    'id',app.id,'status',p_to_status,'previous_status',app.status,
    'review_started_at',case when p_to_status='in_review' then coalesce(app.review_started_at,now_at) else app.review_started_at end,
    'reviewer_user_id',p_actor_user_id,'declined_at',case when p_to_status='declined' then now_at else app.declined_at end,
    'creates_membership',false,'requires_member_acceptance',p_to_status='offered',
    'capacity',case when p_to_status='offered' then jsonb_build_object('confirmed',occupied,'reserved_offers',reserved_offers+1,'maximum',max_members) else null end
  );
end;
$$;

revoke all on function public.phase7_transition_review_request_server(uuid,text,text,uuid,text) from public,anon,authenticated;
grant execute on function public.phase7_transition_review_request_server(uuid,text,text,uuid,text) to service_role;

create or replace function public.project_application_effective_participation(
  p_project_mode text,
  p_member_preference text,
  p_flexible_preference text
)
returns text
language sql
immutable
as $$
  select case
    when p_project_mode='solo' then 'solo'
    when p_project_mode='team' then 'team'
    when p_member_preference='solo' then 'solo'
    when p_member_preference='team' then 'team'
    when p_member_preference='flexible' and p_flexible_preference='prefer_team' then 'team'
    when p_member_preference='flexible' and p_flexible_preference='prefer_solo' then 'solo'
    else 'flexible'
  end
$$;

revoke all on function public.project_application_effective_participation(text,text,text) from public,anon,authenticated;
grant execute on function public.project_application_effective_participation(text,text,text) to service_role;
