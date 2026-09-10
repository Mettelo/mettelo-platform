-- Project Experience Phase 19: canonical run-scoped completion and final-review freeze.
--
-- Phase 19 deliberately extends project_runs and the existing Phase 18 collaboration
-- system. It does not create a second project/run/admission/completion system.
-- Project completion is NOT member Proof verification; contribution verification and
-- verified member Proof remain owned by Phase 20.

alter table public.project_runs
  add column if not exists completion_state text not null default 'delivery',
  add column if not exists completion_summary text,
  add column if not exists completion_outcomes text,
  add column if not exists completion_limitations text,
  add column if not exists completion_submitted_at timestamptz,
  add column if not exists completion_submitted_by uuid references public.profiles(id) on delete set null,
  add column if not exists completion_reviewed_at timestamptz,
  add column if not exists completion_reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists completion_review_notes text,
  add column if not exists completion_completed_at timestamptz;

do $$
begin
  alter table public.project_runs
    add constraint project_runs_completion_state_check
    check (completion_state in ('delivery','draft','final_review','changes_requested','completed'));
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.project_runs
    add constraint project_runs_completion_timestamps_check
    check (
      (completion_state not in ('final_review','completed') or completion_submitted_at is not null)
      and (completion_state <> 'completed' or completion_completed_at is not null)
    );
exception when duplicate_object then null;
end $$;

create index if not exists project_runs_completion_state_idx
  on public.project_runs(completion_state,project_id,updated_at desc);

comment on column public.project_runs.completion_state is
  'Phase 19 run-scoped delivery completion lifecycle. This is independent of Phase 20 member Proof verification.';

-- One authoritative readiness service. The legacy project-scoped readiness helper is
-- retained for backwards compatibility, but Phase 19 final submission uses this exact
-- run-scoped contract and deliberately does not inspect contributions/Proof status.
create or replace function public.phase19_run_completion_readiness(p_run_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  run_row public.project_runs%rowtype;
  project_row public.projects%rowtype;
  required_milestones integer:=0;
  completed_milestones integer:=0;
  required_tasks integer:=0;
  completed_tasks integer:=0;
  presentation_status text:='not_booked';
  ready boolean:=false;
begin
  select * into run_row from public.project_runs where id=p_run_id;
  if run_row.id is null then
    raise exception using errcode='P0002',message='PROJECT_RUN_NOT_FOUND';
  end if;

  select * into project_row from public.projects where id=run_row.project_id;
  if project_row.id is null then
    raise exception using errcode='P0002',message='PROJECT_NOT_FOUND';
  end if;

  select
    count(*) filter (where is_required)::integer,
    count(*) filter (where is_required and status='completed')::integer
  into required_milestones,completed_milestones
  from public.project_milestones
  where project_id=run_row.project_id;

  select
    count(*) filter (where is_required)::integer,
    count(*) filter (where is_required and status='done')::integer
  into required_tasks,completed_tasks
  from public.project_tasks
  where project_id=run_row.project_id;

  select coalesce(pp.status,'not_booked')
  into presentation_status
  from public.project_presentations pp
  where pp.project_id=run_row.project_id
  limit 1;
  presentation_status:=coalesce(presentation_status,'not_booked');

  ready:=
    run_row.status='active'
    and required_milestones>0
    and required_milestones=completed_milestones
    and required_tasks=completed_tasks
    and nullif(btrim(coalesce(run_row.completion_summary,'')),'') is not null
    and nullif(btrim(coalesce(run_row.completion_outcomes,'')),'') is not null
    and nullif(btrim(coalesce(run_row.completion_limitations,'')),'') is not null
    and (not project_row.presentation_required or presentation_status='verified');

  return jsonb_build_object(
    'ready',ready,
    'run_id',run_row.id,
    'project_id',run_row.project_id,
    'run_status',run_row.status,
    'completion_state',run_row.completion_state,
    'required_milestones',required_milestones,
    'completed_milestones',completed_milestones,
    'required_tasks',required_tasks,
    'completed_tasks',completed_tasks,
    'summary_present',nullif(btrim(coalesce(run_row.completion_summary,'')),'') is not null,
    'outcomes_present',nullif(btrim(coalesce(run_row.completion_outcomes,'')),'') is not null,
    'limitations_present',nullif(btrim(coalesce(run_row.completion_limitations,'')),'') is not null,
    'presentation_required',project_row.presentation_required,
    'presentation_status',presentation_status,
    'proof_verification_required',false
  );
end;
$$;
revoke all on function public.phase19_run_completion_readiness(uuid) from public,anon,authenticated;
grant execute on function public.phase19_run_completion_readiness(uuid) to service_role;

-- Recruitment can never become active while the exact run is in final review or has
-- completed. This protects against service/API mistakes as well as stale browser state.
create or replace function public.phase19_guard_run_recruitment_freeze()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  if new.completion_state in ('final_review','completed') and coalesce(new.recruitment_open,false) then
    raise exception using errcode='23514',message='PHASE19_RECRUITMENT_FROZEN';
  end if;
  return new;
end;
$$;
revoke all on function public.phase19_guard_run_recruitment_freeze() from public,anon,authenticated;
drop trigger if exists phase19_run_recruitment_freeze_guard on public.project_runs;
create trigger phase19_run_recruitment_freeze_guard
before insert or update of recruitment_open,completion_state
on public.project_runs
for each row execute function public.phase19_guard_run_recruitment_freeze();

-- New/re-opened collaboration needs are blocked at the database boundary after final
-- submission. Closing an existing need remains valid so the final-submit transaction
-- can invalidate Phase 18 recruitment atomically.
create or replace function public.phase19_guard_collaboration_need_freeze()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare frozen boolean:=false;
begin
  if new.status<>'active' then return new; end if;
  select r.completion_state in ('final_review','completed')
  into frozen
  from public.project_runs r
  where r.id=new.project_run_id and r.project_id=new.project_id;
  if coalesce(frozen,false) then
    raise exception using errcode='23514',message='PHASE19_COLLABORATION_FROZEN';
  end if;
  return new;
end;
$$;
revoke all on function public.phase19_guard_collaboration_need_freeze() from public,anon,authenticated;
drop trigger if exists phase19_collaboration_need_freeze_guard on public.project_collaboration_needs;
create trigger phase19_collaboration_need_freeze_guard
before insert or update of status,project_run_id,project_id
on public.project_collaboration_needs
for each row execute function public.phase19_guard_collaboration_need_freeze();

-- Pending invitations are admission continuations, so they fail closed when the run is
-- frozen. pending -> invalidated remains legal for the final-submit transaction.
create or replace function public.phase19_guard_member_invite_freeze()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare frozen boolean:=false;
begin
  if new.status<>'pending' then return new; end if;
  select r.completion_state in ('final_review','completed')
  into frozen
  from public.project_runs r
  where r.id=new.project_run_id and r.project_id=new.project_id;
  if coalesce(frozen,false) then
    raise exception using errcode='23514',message='PHASE19_MEMBER_INVITE_FROZEN';
  end if;
  return new;
end;
$$;
revoke all on function public.phase19_guard_member_invite_freeze() from public,anon,authenticated;
drop trigger if exists phase19_member_invite_freeze_guard on public.project_member_collaboration_invitations;
create trigger phase19_member_invite_freeze_guard
before insert or update of status,project_run_id,project_id
on public.project_member_collaboration_invitations
for each row execute function public.phase19_guard_member_invite_freeze();

create or replace function public.phase19_guard_external_invite_freeze()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare frozen boolean:=false;
begin
  if new.status<>'pending' then return new; end if;
  select r.completion_state in ('final_review','completed')
  into frozen
  from public.project_runs r
  where r.id=new.project_run_id and r.project_id=new.project_id;
  if coalesce(frozen,false) then
    raise exception using errcode='23514',message='PHASE19_EXTERNAL_INVITE_FROZEN';
  end if;
  return new;
end;
$$;
revoke all on function public.phase19_guard_external_invite_freeze() from public,anon,authenticated;
drop trigger if exists phase19_external_invite_freeze_guard on public.project_external_collaboration_invites;
create trigger phase19_external_invite_freeze_guard
before insert or update of status,project_run_id,project_id
on public.project_external_collaboration_invites
for each row execute function public.phase19_guard_external_invite_freeze();

-- Canonical collaboration interests must also fail closed before they can reach the
-- Phase 6/18 admission function. Non-collaboration applications retain their existing
-- behaviour and are not repurposed by Phase 19.
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
  select r.completion_state in ('final_review','completed')
  into frozen
  from public.project_runs r
  where r.id=need_row.project_run_id and r.project_id=need_row.project_id;
  if need_row.status<>'active' or coalesce(frozen,false) then
    raise exception using errcode='23514',message='PHASE19_COLLABORATION_INTEREST_FROZEN';
  end if;
  return new;
end;
$$;
revoke all on function public.phase19_guard_collaboration_interest_freeze() from public,anon,authenticated;
drop trigger if exists phase19_collaboration_interest_freeze_guard on public.project_applications;
create trigger phase19_collaboration_interest_freeze_guard
before insert or update of collaboration_need_id,project_id,project_run_id
on public.project_applications
for each row execute function public.phase19_guard_collaboration_interest_freeze();

-- Final submission is the Phase 18 -> 19 transactional boundary. It locks the exact
-- run, validates readiness, freezes recruitment, closes live needs and invalidates all
-- still-pending invitation transports in the same transaction. It never creates a run,
-- membership, contribution or Proof record.
create or replace function public.phase19_submit_run_for_final_review(p_run_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  actor uuid:=(select auth.uid());
  run_row public.project_runs%rowtype;
  readiness jsonb;
  now_at timestamptz:=now();
  closed_needs integer:=0;
  invalidated_member_invites integer:=0;
  invalidated_external_invites integer:=0;
begin
  if actor is null then
    raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED';
  end if;

  select * into run_row
  from public.project_runs
  where id=p_run_id
  for update;
  if run_row.id is null then
    raise exception using errcode='P0002',message='PROJECT_RUN_NOT_FOUND';
  end if;

  if not public.is_admin() and not exists (
    select 1
    from public.project_members pm
    where pm.project_id=run_row.project_id
      and pm.project_run_id=run_row.id
      and pm.user_id=actor
      and pm.team_role='project_lead'
      and pm.membership_status='active'
  ) then
    raise exception using errcode='42501',message='FINAL_REVIEW_REQUIRES_ACTIVE_RUN_LEAD';
  end if;

  if run_row.completion_state='completed' then
    raise exception using errcode='23514',message='RUN_ALREADY_COMPLETED';
  end if;
  if run_row.completion_state='final_review' then
    return jsonb_build_object('status','final_review','run_id',run_row.id,'already_submitted',true);
  end if;
  if run_row.completion_state not in ('delivery','draft','changes_requested') then
    raise exception using errcode='23514',message='INVALID_COMPLETION_TRANSITION';
  end if;

  readiness:=public.phase19_run_completion_readiness(run_row.id);
  if coalesce((readiness->>'ready')::boolean,false) is not true then
    raise exception using errcode='23514',message='RUN_NOT_READY_FOR_FINAL_REVIEW',detail=readiness::text;
  end if;

  update public.project_runs
  set completion_state='final_review',
      completion_submitted_at=now_at,
      completion_submitted_by=actor,
      completion_reviewed_at=null,
      completion_reviewed_by=null,
      completion_review_notes=null,
      recruitment_open=false,
      recruitment_closed_at=coalesce(recruitment_closed_at,now_at),
      updated_at=now_at
  where id=run_row.id;

  update public.project_collaboration_needs
  set status='closed',
      closed_reason='phase19_final_review',
      closed_at=now_at,
      updated_at=now_at
  where project_run_id=run_row.id and status='active';
  get diagnostics closed_needs=row_count;

  update public.project_member_collaboration_invitations
  set status='invalidated',invalidated_at=now_at,updated_at=now_at
  where project_run_id=run_row.id and status='pending';
  get diagnostics invalidated_member_invites=row_count;

  update public.project_external_collaboration_invites
  set status='invalidated',invalidated_at=now_at,updated_at=now_at
  where project_run_id=run_row.id and status='pending';
  get diagnostics invalidated_external_invites=row_count;

  insert into public.project_activity_log(
    project_id,project_run_id,event_type,actor_user_id,actor_type,from_status,to_status,metadata
  ) values (
    run_row.project_id,run_row.id,'completion_final_review_submitted',actor,'member',run_row.completion_state,'final_review',
    jsonb_build_object(
      'closed_collaboration_needs',closed_needs,
      'invalidated_member_invitations',invalidated_member_invites,
      'invalidated_external_invitations',invalidated_external_invites,
      'readiness',readiness
    )
  );

  return jsonb_build_object(
    'status','final_review',
    'run_id',run_row.id,
    'project_id',run_row.project_id,
    'closed_collaboration_needs',closed_needs,
    'invalidated_member_invitations',invalidated_member_invites,
    'invalidated_external_invitations',invalidated_external_invites
  );
end;
$$;
revoke all on function public.phase19_submit_run_for_final_review(uuid) from public,anon;
grant execute on function public.phase19_submit_run_for_final_review(uuid) to authenticated;
revoke execute on function public.phase19_submit_run_for_final_review(uuid) from service_role;

comment on function public.phase19_submit_run_for_final_review(uuid) is
  'Phase 19 final-submit transaction: exact-run readiness + recruitment freeze + Phase 18 invitation invalidation. Does not create or verify member Proof.';
