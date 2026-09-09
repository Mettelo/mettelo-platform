-- Project Experience Phase 16: governed recovery state.
-- Replacement admission remains owned by existing AUTO / REVIEW_REQUIRED flows.
-- This migration only records/reconciles the operational vacancy on the same run.

create or replace function public.phase16_reconcile_run_recovery(p_run_id uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  run_row public.project_runs%rowtype;
  project_row public.projects%rowtype;
  active_members integer:=0;
  target_members integer:=1;
  active_leads integer:=0;
begin
  select * into run_row from public.project_runs where id=p_run_id for update;
  if run_row.id is null or run_row.status<>'active' or coalesce(run_row.has_started,false)=false then return; end if;
  select * into project_row from public.projects where id=run_row.project_id;
  if project_row.id is null then return; end if;

  select count(*)::integer into active_members from public.project_members
  where project_run_id=p_run_id and membership_status='active';
  select count(*)::integer into active_leads from public.project_members
  where project_run_id=p_run_id and membership_status='active' and team_role='project_lead';
  target_members:=greatest(coalesce(project_row.target_team_size,project_row.min_team_size,project_row.team_size_threshold,1),1);

  update public.project_runs
  set replacement_needed=active_members<target_members,
      replacement_needed_at=case when active_members<target_members then coalesce(replacement_needed_at,now()) else null end,
      replacement_source_membership_id=case when active_members<target_members then replacement_source_membership_id else null end,
      lead_replacement_needed=case when active_leads>0 then false else lead_replacement_needed end,
      updated_at=now()
  where id=p_run_id;
end;
$$;
revoke all on function public.phase16_reconcile_run_recovery(uuid) from public,anon,authenticated;
grant execute on function public.phase16_reconcile_run_recovery(uuid) to service_role;

create or replace function public.phase16_reconcile_membership_recovery()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if tg_op='DELETE' then
    if old.project_run_id is not null then perform public.phase16_reconcile_run_recovery(old.project_run_id); end if;
    return old;
  end if;
  if new.project_run_id is not null then perform public.phase16_reconcile_run_recovery(new.project_run_id); end if;
  if tg_op='UPDATE' and old.project_run_id is distinct from new.project_run_id and old.project_run_id is not null then
    perform public.phase16_reconcile_run_recovery(old.project_run_id);
  end if;
  return new;
end;
$$;
revoke all on function public.phase16_reconcile_membership_recovery() from public,anon,authenticated;

drop trigger if exists phase16_membership_recovery_reconcile on public.project_members;
create trigger phase16_membership_recovery_reconcile
after insert or update of project_run_id,membership_status,team_role or delete
on public.project_members
for each row execute function public.phase16_reconcile_membership_recovery();

create or replace function public.phase16_request_replacement(
  p_project_id uuid,
  p_run_id uuid,
  p_actor_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  project_row public.projects%rowtype;
  run_row public.project_runs%rowtype;
  capacity jsonb;
  maximum_members integer:=1;
  occupied integer:=0;
  reserved integer:=0;
  can_recruit boolean:=false;
begin
  select * into project_row from public.projects where id=p_project_id for update;
  if project_row.id is null then raise exception using errcode='P0002',message='PROJECT_NOT_FOUND'; end if;
  perform public.phase9_lock_project_capacity(p_project_id);
  select * into run_row from public.project_runs where id=p_run_id and project_id=p_project_id for update;
  if run_row.id is null then raise exception using errcode='P0002',message='PROJECT_RUN_NOT_FOUND'; end if;
  if run_row.status<>'active' or coalesce(run_row.has_started,false)=false then raise exception using errcode='23514',message='ACTIVE_STARTED_RUN_REQUIRED'; end if;
  if coalesce(run_row.replacement_needed,false)=false then
    return jsonb_build_object('requested',false,'already_recovered',true,'run_id',p_run_id,'recruitment_open',run_row.recruitment_open);
  end if;

  capacity:=public.phase9_project_run_capacity(p_project_id,p_run_id);
  maximum_members:=coalesce((capacity->>'maximum')::integer,1);
  occupied:=coalesce((capacity->>'occupied')::integer,0);
  reserved:=coalesce((capacity->>'reserved')::integer,0);
  can_recruit:=project_row.participation_mode<>'solo'
    and coalesce(project_row.late_joining_enabled,true)=true
    and (project_row.late_joining_cutoff_at is null or now()<project_row.late_joining_cutoff_at)
    and occupied+reserved<maximum_members;

  if not can_recruit then
    raise exception using errcode='23514',message='REPLACEMENT_JOINING_NOT_ALLOWED';
  end if;

  update public.project_runs
  set replacement_requested_at=coalesce(replacement_requested_at,now()),
      replacement_requested_by=coalesce(replacement_requested_by,p_actor_user_id),
      recruitment_open=true,
      updated_at=now()
  where id=p_run_id;

  insert into public.project_activity_log(project_id,project_run_id,event_type,actor_type,actor_user_id,from_status,to_status,metadata)
  values(p_project_id,p_run_id,'replacement_requested','user',p_actor_user_id,'active','active',jsonb_build_object(
    'run_id',p_run_id,'open_capacity',greatest(maximum_members-occupied-reserved,0),'joining_window_open',true
  ))
  on conflict do nothing;

  return jsonb_build_object('requested',true,'run_id',p_run_id,'recruitment_open',true,'open_capacity',greatest(maximum_members-occupied-reserved,0));
end;
$$;
revoke all on function public.phase16_request_replacement(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.phase16_request_replacement(uuid,uuid,uuid) to service_role;
