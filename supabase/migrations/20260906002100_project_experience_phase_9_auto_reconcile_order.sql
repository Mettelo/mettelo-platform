-- Phase 9 AUTO reconciliation ordering.
--
-- Phase 6 remains the authoritative AUTO admission writer. Its RPC inserts the
-- membership and then persists the application/run decision and schedule in the
-- same transaction. Therefore an INSERT membership trigger must not pre-empt the
-- Phase 6 scheduler with a competing schedule update. Phase 9 reconciles AUTO
-- readiness immediately after the canonical AUTO application transition instead.

create or replace function public.phase9_reconcile_membership_change()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  target_run uuid;
  project_id_value uuid;
  effective_admission text;
begin
  target_run:=case when tg_op='DELETE' then old.project_run_id else new.project_run_id end;
  project_id_value:=case when tg_op='DELETE' then old.project_id else new.project_id end;

  -- On AUTO INSERT, Phase 6 is still inside phase6_auto_admit_interest and owns
  -- the initial schedule write. Reconcile after its application transition below.
  if tg_op='INSERT' then
    select public.effective_project_admission_mode(p.project_type,p.admission_mode)
      into effective_admission
    from public.projects p where p.id=project_id_value;
    if effective_admission='auto' then return new; end if;
  end if;

  if target_run is not null then perform public.phase9_reconcile_run_participation(target_run); end if;
  return case when tg_op='DELETE' then old else new end;
end;
$$;
revoke all on function public.phase9_reconcile_membership_change() from public,anon,authenticated;

create or replace function public.phase9_reconcile_auto_application_transition()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if new.project_run_id is not null
     and new.admission_decision='auto_qualified'
     and (
       old.project_run_id is distinct from new.project_run_id
       or old.admission_decision is distinct from new.admission_decision
       or old.status is distinct from new.status
     ) then
    perform public.phase9_reconcile_run_participation(new.project_run_id);
  end if;
  return new;
end;
$$;
revoke all on function public.phase9_reconcile_auto_application_transition() from public,anon,authenticated;

drop trigger if exists project_application_phase9_auto_readiness_reconcile on public.project_applications;
create trigger project_application_phase9_auto_readiness_reconcile
after update of project_run_id,admission_decision,status
on public.project_applications
for each row execute function public.phase9_reconcile_auto_application_transition();
