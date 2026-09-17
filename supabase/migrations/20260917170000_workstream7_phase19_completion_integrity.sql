-- Workstream 7 / Phase 19 completion integrity hardening.
--
-- This migration closes the remaining project-level completion gaps without
-- coupling completion to Phase 20 Verified Proof. Success-criterion evidence is
-- run-scoped, required deliverables are the existing canonical deliverables,
-- contribution submission presence is checked without inspecting verification,
-- recruitment continuations serialize on the project-run row, and completed
-- delivery workspaces become historical/read-only while Proof review remains live.

create table if not exists public.project_success_criterion_assessments (
  project_run_id uuid not null references public.project_runs(id) on delete cascade,
  criterion_id uuid not null references public.project_success_criteria(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  satisfied boolean not null default false,
  assessment_notes text,
  evidence_url text check (evidence_url is null or evidence_url ~* '^https://'),
  assessed_by_user_id uuid references auth.users(id) on delete set null,
  assessed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key(project_run_id,criterion_id),
  constraint phase19_success_criterion_satisfied_evidence check (
    not satisfied
    or evidence_url is not null
    or char_length(btrim(coalesce(assessment_notes,''))) >= 10
  )
);
create index if not exists phase19_success_criterion_assessments_project_idx
  on public.project_success_criterion_assessments(project_id,project_run_id,satisfied);

alter table public.project_success_criterion_assessments enable row level security;
revoke all on table public.project_success_criterion_assessments from public,anon,authenticated;
grant select on table public.project_success_criterion_assessments to authenticated;
grant select,insert,update,delete on table public.project_success_criterion_assessments to service_role;

drop policy if exists "run participants read success criterion assessments" on public.project_success_criterion_assessments;
create policy "run participants read success criterion assessments"
on public.project_success_criterion_assessments for select to authenticated
using (
  public.mettelo_is_run_member(project_run_id)
  or public.is_admin()
  or exists(
    select 1 from public.project_architect_assignments paa
    where paa.project_id=project_success_criterion_assessments.project_id
      and paa.user_id=(select auth.uid())
      and paa.assignment_status='active'
  )
);

create or replace function public.phase19_assess_success_criterion(
  p_run_id uuid,
  p_criterion_id uuid,
  p_satisfied boolean,
  p_notes text default null,
  p_evidence_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  actor uuid:=(select auth.uid());
  run_row public.project_runs%rowtype;
  criterion_row public.project_success_criteria%rowtype;
  authorized boolean:=false;
  now_at timestamptz:=now();
begin
  if actor is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;

  select * into run_row
  from public.project_runs
  where id=p_run_id
  for update;
  if run_row.id is null then raise exception using errcode='P0002',message='PROJECT_RUN_NOT_FOUND'; end if;

  if run_row.status<>'active' or run_row.completion_state not in ('delivery','draft','changes_requested') then
    raise exception using errcode='23514',message='SUCCESS_CRITERIA_ASSESSMENT_CLOSED';
  end if;

  select * into criterion_row
  from public.project_success_criteria
  where id=p_criterion_id and project_id=run_row.project_id;
  if criterion_row.id is null then raise exception using errcode='P0002',message='SUCCESS_CRITERION_NOT_FOUND'; end if;

  authorized:=public.is_admin() or exists(
    select 1 from public.project_architect_assignments paa
    where paa.project_id=run_row.project_id and paa.user_id=actor and paa.assignment_status='active'
  ) or exists(
    select 1 from public.project_members pm
    where pm.project_id=run_row.project_id and pm.project_run_id=run_row.id and pm.user_id=actor
      and pm.membership_status='active' and pm.team_role in ('project_lead','project_architect')
  );
  if not authorized then raise exception using errcode='42501',message='SUCCESS_CRITERIA_ASSESSMENT_NOT_AUTHORIZED'; end if;

  if p_satisfied and nullif(btrim(coalesce(p_notes,'')),'') is null and nullif(btrim(coalesce(p_evidence_url,'')),'') is null then
    raise exception using errcode='22023',message='SUCCESS_CRITERIA_EVIDENCE_REQUIRED';
  end if;

  insert into public.project_success_criterion_assessments(
    project_run_id,criterion_id,project_id,satisfied,assessment_notes,evidence_url,
    assessed_by_user_id,assessed_at,updated_at
  ) values (
    run_row.id,criterion_row.id,run_row.project_id,p_satisfied,
    nullif(btrim(coalesce(p_notes,'')),''),nullif(btrim(coalesce(p_evidence_url,'')),''),
    actor,case when p_satisfied then now_at else null end,now_at
  )
  on conflict(project_run_id,criterion_id) do update set
    satisfied=excluded.satisfied,
    assessment_notes=excluded.assessment_notes,
    evidence_url=excluded.evidence_url,
    assessed_by_user_id=excluded.assessed_by_user_id,
    assessed_at=excluded.assessed_at,
    updated_at=excluded.updated_at;

  insert into public.project_activity_log(
    project_id,project_run_id,event_type,actor_type,actor_user_id,from_status,to_status,metadata
  ) values (
    run_row.project_id,run_row.id,'completion_success_criterion_assessed','user',actor,
    run_row.completion_state,run_row.completion_state,
    jsonb_build_object('criterion_id',criterion_row.id,'satisfied',p_satisfied,'evidence_url_present',nullif(btrim(coalesce(p_evidence_url,'')),'') is not null)
  );

  return jsonb_build_object('ok',true,'criterion_id',criterion_row.id,'satisfied',p_satisfied,'assessed_at',case when p_satisfied then now_at else null end);
end;
$$;
revoke all on function public.phase19_assess_success_criterion(uuid,uuid,boolean,text,text) from public,anon;
grant execute on function public.phase19_assess_success_criterion(uuid,uuid,boolean,text,text) to authenticated;
revoke execute on function public.phase19_assess_success_criterion(uuid,uuid,boolean,text,text) from service_role;

-- Exact-run project completion readiness. Contribution submissions are required
-- where the run has contributor/lead members, but verification status is never
-- consulted here; Phase 20 retains sole ownership of Verified Proof.
create or replace function public.project_run_completion_readiness(target_run uuid)
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
  required_deliverables integer:=0;
  completed_deliverables integer:=0;
  required_criteria integer:=0;
  satisfied_criteria integer:=0;
  contribution_members integer:=0;
  contribution_submitters integer:=0;
  presentation_status text:='not_booked';
  ready boolean:=false;
begin
  select * into run_row from public.project_runs where id=target_run;
  if run_row.id is null then raise exception using errcode='P0002',message='PROJECT_RUN_NOT_FOUND'; end if;
  select * into project_row from public.projects where id=run_row.project_id;
  if project_row.id is null then raise exception using errcode='P0002',message='PROJECT_NOT_FOUND'; end if;

  select count(*) filter (where is_required)::integer,
         count(*) filter (where is_required and status='completed')::integer
  into required_milestones,completed_milestones
  from public.project_milestones
  where project_id=run_row.project_id and project_run_id=run_row.id;

  select count(*) filter (where is_required)::integer,
         count(*) filter (where is_required and status='done')::integer
  into required_tasks,completed_tasks
  from public.project_tasks
  where project_id=run_row.project_id and project_run_id=run_row.id;

  select count(*) filter (where is_required)::integer,
         count(*) filter (where is_required and status='approved')::integer
  into required_deliverables,completed_deliverables
  from public.project_deliverables
  where project_id=run_row.project_id and project_run_id=run_row.id;

  select count(*) filter (where sc.is_required)::integer,
         count(*) filter (where sc.is_required and coalesce(a.satisfied,false))::integer
  into required_criteria,satisfied_criteria
  from public.project_success_criteria sc
  left join public.project_success_criterion_assessments a
    on a.criterion_id=sc.id and a.project_run_id=run_row.id and a.project_id=run_row.project_id
  where sc.project_id=run_row.project_id;

  select count(*)::integer
  into contribution_members
  from public.project_members pm
  where pm.project_id=run_row.project_id and pm.project_run_id=run_row.id
    and pm.membership_status in ('active','completed')
    and pm.team_role in ('contributor','project_lead');

  select count(distinct c.user_id)::integer
  into contribution_submitters
  from public.contributions c
  join public.project_members pm
    on pm.project_id=run_row.project_id and pm.project_run_id=run_row.id and pm.user_id=c.user_id
  where c.project_id=run_row.project_id and c.project_run_id=run_row.id
    and pm.membership_status in ('active','completed')
    and pm.team_role in ('contributor','project_lead');

  if project_row.presentation_required then
    select coalesce(pp.status,'not_booked') into presentation_status
    from public.project_presentations pp
    where pp.project_id=run_row.project_id and pp.project_run_id=run_row.id
    order by pp.updated_at desc nulls last limit 1;
  end if;
  presentation_status:=coalesce(presentation_status,'not_booked');

  ready:=
    run_row.status in ('active','review')
    and required_milestones>0
    and required_milestones=completed_milestones
    and required_tasks=completed_tasks
    and required_deliverables>0
    and required_deliverables=completed_deliverables
    and required_criteria>0
    and required_criteria=satisfied_criteria
    and contribution_members=contribution_submitters
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
    'required_deliverables',required_deliverables,
    'completed_deliverables',completed_deliverables,
    'success_criteria_required',required_criteria,
    'success_criteria_satisfied',satisfied_criteria,
    'members_requiring_contribution_submission',contribution_members,
    'members_with_contribution_submission',contribution_submitters,
    'project_members_requiring_proof',0,
    'members_with_verified_proof',0,
    'pending_contributions',0,
    'presentation_required',project_row.presentation_required,
    'presentation_status',presentation_status,
    'proof_verification_required',false
  );
end;
$$;
revoke all on function public.project_run_completion_readiness(uuid) from public,anon;
grant execute on function public.project_run_completion_readiness(uuid) to authenticated,service_role;

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

-- The legacy project-scoped helper now resolves the most relevant existing run
-- and delegates to the exact-run contract. This keeps the historical project
-- status trigger compatible without weakening the run-scoped completion gate.
create or replace function public.project_completion_readiness(target_project uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare target_run uuid;
begin
  select r.id into target_run
  from public.project_runs r
  where r.project_id=target_project and r.status in ('active','review','completed')
  order by case r.status when 'review' then 1 when 'active' then 2 else 3 end,
           coalesce(r.completion_completed_at,r.completed_at,r.updated_at) desc
  limit 1;
  if target_run is null then
    return jsonb_build_object('ready',false,'project_id',target_project,'reason','PROJECT_RUN_NOT_FOUND');
  end if;
  return public.project_run_completion_readiness(target_run);
end;
$$;
revoke all on function public.project_completion_readiness(uuid) from public,anon;
grant execute on function public.project_completion_readiness(uuid) to authenticated,service_role;

-- Serialize every Phase 18 recruitment continuation on the same run row used by
-- Phase 19 submit/review. If completion wins the lock, the continuation fails
-- closed. If recruitment wins first, it completes before final review begins.
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
  where r.id=new.project_run_id and r.project_id=new.project_id
  for update;
  if coalesce(frozen,false) then raise exception using errcode='23514',message='PHASE19_COLLABORATION_FROZEN'; end if;
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
  select r.completion_state in ('final_review','changes_requested','completed')
  into frozen
  from public.project_runs r
  where r.id=new.project_run_id and r.project_id=new.project_id
  for update;
  if coalesce(frozen,false) and new.status not in ('declined','expired','revoked','invalidated') then
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
  select r.completion_state in ('final_review','changes_requested','completed')
  into frozen
  from public.project_runs r
  where r.id=new.project_run_id and r.project_id=new.project_id
  for update;
  if coalesce(frozen,false) and new.status not in ('declined','expired','revoked','invalidated') then
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
  if need_row.id is null then raise exception using errcode='P0002',message='COLLABORATION_NEED_NOT_FOUND'; end if;
  select r.completion_state in ('final_review','changes_requested','completed')
  into frozen
  from public.project_runs r
  where r.id=need_row.project_run_id and r.project_id=need_row.project_id
  for update;
  if need_row.status<>'active' or coalesce(frozen,false) then
    raise exception using errcode='23514',message='PHASE19_COLLABORATION_INTEREST_FROZEN';
  end if;
  return new;
end;
$$;

-- Completed Labs are historical/read-only. Phase 20 contributions are excluded
-- deliberately so members/reviewers can still complete contribution verification
-- after the project-level run has completed.
create or replace function public.phase19_guard_completed_delivery_mutation()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  target_run uuid;
  completed boolean:=false;
begin
  target_run:=case when tg_op='DELETE' then old.project_run_id else new.project_run_id end;
  if target_run is null then return case when tg_op='DELETE' then old else new end; end if;
  select r.status='completed' or r.completion_state='completed'
  into completed
  from public.project_runs r
  where r.id=target_run
  for update;
  if coalesce(completed,false) then
    raise exception using errcode='23514',message='PHASE19_COMPLETED_RUN_READ_ONLY';
  end if;
  return case when tg_op='DELETE' then old else new end;
end;
$$;
revoke all on function public.phase19_guard_completed_delivery_mutation() from public,anon,authenticated;

do $phase19_read_only$
declare table_name text;
begin
  foreach table_name in array array[
    'project_workstreams','project_data_sources','project_deliverables',
    'project_deliverable_data_sources','project_deliverable_tasks','project_milestones',
    'project_tasks','project_resources','project_meetings','project_presentations',
    'project_discussions','project_task_events','project_data_source_versions'
  ] loop
    execute format('drop trigger if exists phase19_completed_run_read_only on public.%I',table_name);
    execute format('create trigger phase19_completed_run_read_only before insert or update or delete on public.%I for each row execute function public.phase19_guard_completed_delivery_mutation()',table_name);
  end loop;
end
$phase19_read_only$;
