-- Phase 9 compatibility for the established AUTO schedule-cancellation audit.
--
-- Participation reconciliation now owns the authoritative schedule invalidation
-- when membership falls below the run minimum. Preserve the existing
-- project_start_schedule_cancelled event at that same database boundary so API
-- callers do not race the reconciliation trigger and silently lose the audit.

create or replace function public.phase9_log_start_schedule_cancellation()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  filled integer:=0;
  required_members integer:=1;
begin
  if old.scheduled_start_at is null
     or new.scheduled_start_at is not null
     or coalesce(new.has_started,false)=true
     or new.status<>'forming' then
    return new;
  end if;

  required_members:=greatest(coalesce(new.required_team_size,new.team_size_threshold,1),1);
  select count(*)::integer into filled
  from public.project_members
  where project_run_id=new.id
    and membership_status in ('waiting','active');

  if filled<required_members then
    insert into public.project_activity_log(
      project_id,project_run_id,event_type,actor_type,from_status,to_status,metadata
    ) values (
      new.project_id,new.id,'project_start_schedule_cancelled','system','forming','forming',
      jsonb_build_object(
        'reason','membership_withdrawal_below_minimum',
        'filled',filled,
        'required_team_size',required_members,
        'scheduled_start_at',old.scheduled_start_at,
        'source','phase9_participation_reconciliation'
      )
    );
  end if;

  return new;
end;
$$;

revoke all on function public.phase9_log_start_schedule_cancellation() from public,anon,authenticated;

drop trigger if exists project_run_phase9_schedule_cancellation_audit on public.project_runs;
create trigger project_run_phase9_schedule_cancellation_audit
after update of scheduled_start_at on public.project_runs
for each row execute function public.phase9_log_start_schedule_cancellation();
