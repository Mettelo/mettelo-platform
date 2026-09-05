-- Phase 6 canonical, non-sensitive admission funnel audit events.
-- These events are lifecycle evidence first and can feed product analytics without
-- creating a second analytics-specific application or membership model.

create or replace function public.log_phase6_interest_submission()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if new.application_kind='interest' then
    insert into public.project_activity_log(project_id,project_run_id,event_type,actor_type,actor_user_id,from_status,to_status,metadata)
    values(new.project_id,new.project_run_id,'interest_submitted','user',new.user_id,null,'submitted',jsonb_build_object('application_id',new.id));
  end if;
  return new;
end;
$$;

revoke all on function public.log_phase6_interest_submission() from public,anon,authenticated;

drop trigger if exists trg_log_phase6_interest_submission on public.project_applications;
create trigger trg_log_phase6_interest_submission
after insert on public.project_applications
for each row execute function public.log_phase6_interest_submission();

create or replace function public.log_phase6_review_required()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if new.application_kind='interest'
    and new.admission_decision='review_required'
    and old.admission_decision is distinct from new.admission_decision then
    insert into public.project_activity_log(project_id,project_run_id,event_type,actor_type,actor_user_id,from_status,to_status,metadata)
    values(new.project_id,new.project_run_id,'review_required','system',null,old.status,new.status,jsonb_build_object('application_id',new.id,'user_id',new.user_id));
  end if;
  return new;
end;
$$;

revoke all on function public.log_phase6_review_required() from public,anon,authenticated;

drop trigger if exists trg_log_phase6_review_required on public.project_applications;
create trigger trg_log_phase6_review_required
after update of admission_decision on public.project_applications
for each row execute function public.log_phase6_review_required();
