-- Project Experience Phase 12: run-scoped task relation integrity.
--
-- The Lab reuses the canonical delivery tables. A task must never reference a
-- milestone or workstream belonging to another project/run, even when a write is
-- performed by a privileged server path. API validation is duplicated here as a
-- database invariant so ID knowledge cannot create cross-run relationships.

create or replace function public.phase12_validate_task_relations()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  milestone_project_id uuid;
  milestone_run_id uuid;
  workstream_project_id uuid;
  workstream_run_id uuid;
begin
  if new.project_run_id is null then
    raise exception using errcode='23514',message='TASK_REQUIRES_PROJECT_RUN';
  end if;

  if new.milestone_id is not null then
    select m.project_id,m.project_run_id
      into milestone_project_id,milestone_run_id
    from public.project_milestones m
    where m.id=new.milestone_id;

    if milestone_project_id is null
       or milestone_project_id<>new.project_id
       or milestone_run_id is distinct from new.project_run_id then
      raise exception using errcode='23514',message='TASK_MILESTONE_RUN_MISMATCH';
    end if;
  end if;

  if new.workstream_id is not null then
    select w.project_id,w.project_run_id
      into workstream_project_id,workstream_run_id
    from public.project_workstreams w
    where w.id=new.workstream_id;

    if workstream_project_id is null
       or workstream_project_id<>new.project_id
       or workstream_run_id is distinct from new.project_run_id then
      raise exception using errcode='23514',message='TASK_WORKSTREAM_RUN_MISMATCH';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.phase12_validate_task_relations() from public,anon,authenticated;

drop trigger if exists project_task_phase12_relation_guard on public.project_tasks;
create trigger project_task_phase12_relation_guard
before insert or update of project_id,project_run_id,milestone_id,workstream_id
on public.project_tasks
for each row execute function public.phase12_validate_task_relations();

create index if not exists project_tasks_run_milestone_idx
  on public.project_tasks(project_run_id,milestone_id)
  where project_run_id is not null and milestone_id is not null;

comment on function public.phase12_validate_task_relations() is
  'Phase 12 invariant: canonical Lab tasks must stay within their project/run when linked to milestones or workstreams.';
