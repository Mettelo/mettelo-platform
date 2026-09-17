-- Workstream 7 / Phase 19 compatibility: the legacy project status trigger
-- re-checks readiness after an Open run has already transitioned to completed.
-- Preserve the same project-level evidence result for that historical run.

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
    run_row.status in ('active','review','completed')
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
