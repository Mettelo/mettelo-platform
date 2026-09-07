-- Project Experience Phase 16: structured handover and recovery state.
--
-- This remains additive to the canonical project_members + project_runs model.
-- Recruitment/admission continues through the existing Phase 6-10 machinery;
-- no replacement queue, duplicate membership system, invitation system or run is
-- created here.

alter table public.project_members
  add column if not exists departure_source text,
  add column if not exists exit_reason_category text,
  add column if not exists exit_optional_context text;

alter table public.project_members drop constraint if exists project_members_departure_source_check;
alter table public.project_members add constraint project_members_departure_source_check
  check (departure_source is null or departure_source in ('member_initiated','admin_removal','support_resolution','other_governed'));

alter table public.project_members drop constraint if exists project_members_exit_reason_category_check;
alter table public.project_members add constraint project_members_exit_reason_category_check
  check (exit_reason_category is null or exit_reason_category in ('availability_changed','workload','personal_circumstances','role_fit','technical_access','other'));

alter table public.project_members drop constraint if exists project_members_exit_optional_context_check;
alter table public.project_members add constraint project_members_exit_optional_context_check
  check (exit_optional_context is null or char_length(btrim(exit_optional_context)) between 1 and 1000);

create table if not exists public.project_member_handovers (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  project_run_id uuid not null references public.project_runs(id) on delete cascade,
  project_member_id uuid not null references public.project_members(id) on delete restrict,
  departing_user_id uuid not null references public.profiles(id) on delete restrict,
  reason_category text not null check (reason_category in ('availability_changed','workload','personal_circumstances','role_fit','technical_access','other')),
  optional_context text check (optional_context is null or char_length(btrim(optional_context)) between 1 and 1000),
  completed_work text check (completed_work is null or char_length(btrim(completed_work)) between 1 and 4000),
  open_work text check (open_work is null or char_length(btrim(open_work)) between 1 and 4000),
  file_references text check (file_references is null or char_length(btrim(file_references)) between 1 and 4000),
  decisions text check (decisions is null or char_length(btrim(decisions)) between 1 and 4000),
  risks text check (risks is null or char_length(btrim(risks)) between 1 and 4000),
  recommendations text check (recommendations is null or char_length(btrim(recommendations)) between 1 and 4000),
  open_responsibilities text check (open_responsibilities is null or char_length(btrim(open_responsibilities)) between 1 and 4000),
  handover_availability text check (handover_availability is null or char_length(btrim(handover_availability)) between 1 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_member_id)
);

create index if not exists project_member_handovers_run_idx
  on public.project_member_handovers(project_run_id,created_at desc);
create index if not exists project_member_handovers_project_idx
  on public.project_member_handovers(project_id,created_at desc);

alter table public.project_member_handovers enable row level security;

drop policy if exists project_member_handovers_governed_read on public.project_member_handovers;
create policy project_member_handovers_governed_read
on public.project_member_handovers
for select
to authenticated
using (
  departing_user_id=auth.uid()
  or public.is_admin()
  or exists (
    select 1
    from public.project_members viewer
    where viewer.project_id=project_member_handovers.project_id
      and viewer.project_run_id=project_member_handovers.project_run_id
      and viewer.user_id=auth.uid()
      and viewer.membership_status='active'
  )
);

-- No authenticated INSERT/UPDATE/DELETE policy: handover writes are performed by
-- the service-only governed departure command after ordinary server authentication.
revoke insert,update,delete on public.project_member_handovers from anon,authenticated;
grant select on public.project_member_handovers to authenticated;

alter table public.project_runs
  add column if not exists replacement_needed boolean not null default false,
  add column if not exists replacement_needed_at timestamptz,
  add column if not exists replacement_source_membership_id uuid references public.project_members(id) on delete set null,
  add column if not exists replacement_requested_at timestamptz,
  add column if not exists replacement_requested_by uuid references public.profiles(id) on delete set null,
  add column if not exists lead_replacement_needed boolean not null default false;

create index if not exists project_runs_replacement_needed_idx
  on public.project_runs(project_id,replacement_needed,replacement_needed_at desc)
  where replacement_needed=true;

create or replace function public.phase16_transition_member_departure(
  p_project_id uuid,
  p_run_id uuid,
  p_user_id uuid,
  p_action text,
  p_handover_note text default null,
  p_reason_category text default null,
  p_optional_context text default null,
  p_completed_work text default null,
  p_open_work text default null,
  p_file_references text default null,
  p_decisions text default null,
  p_risks text default null,
  p_recommendations text default null,
  p_open_responsibilities text default null,
  p_handover_availability text default null,
  p_departure_source text default 'member_initiated'
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  member_row public.project_members%rowtype;
  project_row public.projects%rowtype;
  run_row public.project_runs%rowtype;
  reason text:=nullif(btrim(coalesce(p_reason_category,'')),'');
  context_text text:=nullif(btrim(coalesce(p_optional_context,'')),'');
  completed_text text:=nullif(btrim(coalesce(p_completed_work,'')),'');
  open_text text:=nullif(btrim(coalesce(p_open_work,'')),'');
  files_text text:=nullif(btrim(coalesce(p_file_references,'')),'');
  decisions_text text:=nullif(btrim(coalesce(p_decisions,'')),'');
  risks_text text:=nullif(btrim(coalesce(p_risks,'')),'');
  recommendations_text text:=nullif(btrim(coalesce(p_recommendations,'')),'');
  responsibilities_text text:=nullif(btrim(coalesce(p_open_responsibilities,'')),'');
  availability_text text:=nullif(btrim(coalesce(p_handover_availability,'')),'');
  legacy_note text:=nullif(btrim(coalesce(p_handover_note,'')),'');
  source_value text:=coalesce(nullif(btrim(coalesce(p_departure_source,'')),''),'member_initiated');
  active_members integer:=0;
  target_members integer:=1;
  maximum_members integer:=1;
  should_reopen boolean:=false;
  is_departing_lead boolean:=false;
begin
  if p_project_id is null or p_run_id is null or p_user_id is null then
    raise exception using errcode='23514',message='DEPARTURE_CONTEXT_REQUIRED';
  end if;
  if p_action not in ('request','complete') then
    raise exception using errcode='23514',message='INVALID_DEPARTURE_ACTION';
  end if;
  if source_value not in ('member_initiated','admin_removal','support_resolution','other_governed') then
    raise exception using errcode='23514',message='INVALID_DEPARTURE_SOURCE';
  end if;

  select * into project_row from public.projects where id=p_project_id for update;
  if project_row.id is null then raise exception using errcode='P0002',message='PROJECT_NOT_FOUND'; end if;
  perform public.phase9_lock_project_capacity(project_row.id);

  select * into run_row from public.project_runs
  where id=p_run_id and project_id=p_project_id for update;
  if run_row.id is null then raise exception using errcode='P0002',message='PROJECT_RUN_NOT_FOUND'; end if;
  if run_row.status<>'active' or coalesce(run_row.has_started,false)=false then
    raise exception using errcode='23514',message='ACTIVE_STARTED_RUN_REQUIRED';
  end if;

  select * into member_row from public.project_members
  where project_id=p_project_id and project_run_id=p_run_id and user_id=p_user_id
  for update;
  if member_row.id is null then raise exception using errcode='P0002',message='MEMBERSHIP_NOT_FOUND'; end if;
  is_departing_lead:=member_row.team_role='project_lead';

  if p_action='request' then
    if member_row.membership_status<>'active' then
      raise exception using errcode='23514',message='ACTIVE_MEMBERSHIP_REQUIRED';
    end if;
    if reason not in ('availability_changed','workload','personal_circumstances','role_fit','technical_access','other') then
      raise exception using errcode='23514',message='EXIT_REASON_REQUIRED';
    end if;
    if context_text is not null and char_length(context_text)>1000 then
      raise exception using errcode='23514',message='EXIT_CONTEXT_TOO_LONG';
    end if;
    if coalesce(completed_text,open_text,files_text,decisions_text,risks_text,recommendations_text,responsibilities_text,legacy_note) is null then
      raise exception using errcode='23514',message='HANDOVER_CONTENT_REQUIRED';
    end if;
    if member_row.departure_state='left' then
      raise exception using errcode='23514',message='MEMBER_ALREADY_LEFT';
    end if;

    insert into public.project_member_handovers(
      project_id,project_run_id,project_member_id,departing_user_id,reason_category,optional_context,
      completed_work,open_work,file_references,decisions,risks,recommendations,open_responsibilities,handover_availability
    ) values (
      p_project_id,p_run_id,member_row.id,p_user_id,reason,context_text,
      coalesce(completed_text,legacy_note),open_text,files_text,decisions_text,risks_text,recommendations_text,responsibilities_text,availability_text
    )
    on conflict(project_member_id) do update set
      reason_category=excluded.reason_category,optional_context=excluded.optional_context,
      completed_work=excluded.completed_work,open_work=excluded.open_work,file_references=excluded.file_references,
      decisions=excluded.decisions,risks=excluded.risks,recommendations=excluded.recommendations,
      open_responsibilities=excluded.open_responsibilities,handover_availability=excluded.handover_availability,updated_at=now();

    update public.project_members
    set departure_state='leaving',
        leaving_at=coalesce(leaving_at,now()),
        handover_note=coalesce(completed_text,legacy_note),
        departure_source=source_value,
        exit_reason_category=reason,
        exit_optional_context=context_text
    where id=member_row.id;

    insert into public.project_activity_log(
      project_id,project_run_id,event_type,actor_type,actor_user_id,from_status,to_status,metadata
    ) values (
      p_project_id,p_run_id,'project_leave_started','user',p_user_id,
      'active','leaving',jsonb_build_object(
        'membership_id',member_row.id,'handover_recorded',true,'reason_category',reason,
        'departure_source',source_value,'sensitive_context_included',false
      )
    );

    return jsonb_build_object('state','leaving','membership_id',member_row.id,'run_id',p_run_id,'capacity_released',false);
  end if;

  if member_row.membership_status='left' and member_row.departure_state='left' then
    return jsonb_build_object('state','left','membership_id',member_row.id,'run_id',p_run_id,'already_left',true,'recruitment_open',run_row.recruitment_open,'replacement_needed',run_row.replacement_needed);
  end if;
  if member_row.membership_status<>'active' or member_row.departure_state<>'leaving' then
    raise exception using errcode='23514',message='DEPARTURE_REQUEST_REQUIRED';
  end if;

  update public.project_member_responsibilities
  set assignment_status='released',released_at=coalesce(released_at,now()),updated_at=now()
  where project_member_id=member_row.id and assignment_status='active';

  update public.project_submission_permissions
  set revoked_at=coalesce(revoked_at,now()),revoked_by_user_id=coalesce(revoked_by_user_id,p_user_id)
  where project_run_id=p_run_id and user_id=p_user_id and revoked_at is null;

  update public.project_members
  set membership_status='left',departure_state='left',left_at=coalesce(left_at,now())
  where id=member_row.id;

  select count(*)::integer into active_members
  from public.project_members
  where project_run_id=p_run_id and membership_status='active';

  target_members:=greatest(coalesce(project_row.target_team_size,project_row.min_team_size,project_row.team_size_threshold,1),1);
  maximum_members:=case when project_row.participation_mode='solo' then 1
    else greatest(target_members,coalesce(project_row.max_team_size,target_members)) end;

  -- The run stays ACTIVE even below its original minimum. The operational gap is
  -- represented explicitly instead of rewinding project start history.
  update public.project_runs
  set replacement_needed=active_members<target_members,
      replacement_needed_at=case when active_members<target_members then coalesce(replacement_needed_at,now()) else null end,
      replacement_source_membership_id=case when active_members<target_members then member_row.id else null end,
      lead_replacement_needed=case when is_departing_lead then true else lead_replacement_needed end,
      updated_at=now()
  where id=p_run_id;

  should_reopen:=project_row.participation_mode<>'solo'
    and coalesce(project_row.late_joining_enabled,true)=true
    and (project_row.late_joining_cutoff_at is null or now()<project_row.late_joining_cutoff_at)
    and active_members<maximum_members;

  if should_reopen then
    update public.project_runs set recruitment_open=true,updated_at=now()
    where id=p_run_id and project_id=p_project_id and status='active' and has_started=true;
  end if;

  insert into public.project_activity_log(
    project_id,project_run_id,event_type,actor_type,actor_user_id,from_status,to_status,metadata
  ) values (
    p_project_id,p_run_id,'project_member_left','user',p_user_id,
    'leaving','left',jsonb_build_object(
      'membership_id',member_row.id,'capacity_released',true,'recruitment_reopened',should_reopen,
      'replacement_needed',active_members<target_members,'lead_vacancy',is_departing_lead,
      'reason_category',member_row.exit_reason_category,'departure_source',coalesce(member_row.departure_source,source_value)
    )
  );

  return jsonb_build_object(
    'state','left','membership_id',member_row.id,'run_id',p_run_id,
    'capacity_released',true,'recruitment_open',should_reopen,
    'replacement_needed',active_members<target_members,'lead_replacement_needed',is_departing_lead
  );
end;
$$;

revoke all on function public.phase16_transition_member_departure(uuid,uuid,uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.phase16_transition_member_departure(uuid,uuid,uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,text) to service_role;

comment on table public.project_member_handovers is
  'Phase 16 run-scoped operational handover. Readable only by the departing member, active members of the same run, and authorized Admin. Never public profile or analytics content.';
