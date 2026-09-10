-- Project Experience Phase 21: continuation, Admin project operations and future project scale.
--
-- This migration extends the canonical projects model. It does not introduce a
-- second project, recruitment, Offer, Lab, completion or Proof architecture.
--
-- Key boundaries:
--   * Partner projects remain REVIEW_REQUIRED.
--   * Updated Phase 18 collaboration policy is project configuration only; live
--     opportunity state remains run-scoped and Phase 19 completion freeze wins.
--   * Project duplication creates a new private draft and copies only reusable
--     project-definition records. Historical participation/activity is excluded.

-- ---------------------------------------------------------------------------
-- Canonical Phase 18/21 project policy
-- ---------------------------------------------------------------------------

alter table public.projects
  add column if not exists collaboration_marketplace_enabled boolean not null default true,
  add column if not exists project_lead_invites_enabled boolean not null default true,
  add column if not exists team_member_invites_enabled boolean not null default false,
  add column if not exists external_collaboration_invites_enabled boolean not null default false,
  add column if not exists collaboration_social_sharing_enabled boolean not null default false,
  add column if not exists offer_expiry_hours integer not null default 72,
  add column if not exists offer_reminders_enabled boolean not null default true;

comment on column public.projects.collaboration_marketplace_enabled is
  'Phase 21 project policy controlling whether an eligible forming/active run may expose canonical Phase 18 Collaborator Needed opportunities. It never overrides run capacity, joining windows, recruitment closure or Phase 19 completion freeze.';
comment on column public.projects.project_lead_invites_enabled is
  'Whether an active Project Lead may send canonical Phase 18 member invitations when member_invites_enabled is also true.';
comment on column public.projects.team_member_invites_enabled is
  'Whether ordinary active team members may send canonical Phase 18 member invitations when member_invites_enabled is also true.';
comment on column public.projects.external_collaboration_invites_enabled is
  'Whether authorized project actors may send canonical Phase 18 email invitations for an active collaboration need.';
comment on column public.projects.collaboration_social_sharing_enabled is
  'Whether an active public Phase 18 collaboration opportunity may expose external social-share controls. Sharing grants no membership or Lab authority.';
comment on column public.projects.offer_expiry_hours is
  'Project-level REVIEW_REQUIRED Offer validity in hours. AUTO projects do not fabricate Offers.';
comment on column public.projects.offer_reminders_enabled is
  'Whether canonical Project Offer reminder processing may claim reminders for this project.';

alter table public.projects
  drop constraint if exists projects_phase21_offer_expiry_check;
alter table public.projects
  add constraint projects_phase21_offer_expiry_check
  check (offer_expiry_hours between 1 and 720);

-- Keep the existing Phase 7 Partner hard rule explicit on reconstructed stacks.
alter table public.projects
  drop constraint if exists projects_partner_requires_review_check;
alter table public.projects
  add constraint projects_partner_requires_review_check
  check (project_type is distinct from 'partner' or admission_mode='review_required');

create index if not exists projects_phase21_lifecycle_updated_idx
  on public.projects(status,updated_at desc);
create index if not exists projects_phase21_publication_idx
  on public.projects(visibility,status,updated_at desc);
create index if not exists projects_phase21_admission_idx
  on public.projects(project_type,admission_mode,status);
create index if not exists projects_phase21_recruitment_policy_idx
  on public.projects(collaboration_marketplace_enabled,member_invites_enabled,late_joining_enabled,status)
  where status not in ('completed','cancelled','archived');

-- ---------------------------------------------------------------------------
-- Project-level Offer configuration consumed by the canonical Phase 8 trigger.
-- ---------------------------------------------------------------------------

create or replace function public.phase8_create_offer_from_application()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  expiry_hours integer:=72;
begin
  if new.status='offered' and old.status is distinct from new.status then
    select greatest(1,least(720,coalesce(p.offer_expiry_hours,72)))
      into expiry_hours
    from public.projects p
    where p.id=new.project_id;

    insert into public.project_offers(
      application_id,
      project_id,
      user_id,
      project_run_id,
      status,
      offered_at,
      expires_at,
      offered_by_user_id,
      capacity_reserved_at
    ) values (
      new.id,
      new.project_id,
      new.user_id,
      new.project_run_id,
      'pending',
      now(),
      now()+make_interval(hours=>expiry_hours),
      auth.uid(),
      now()
    )
    on conflict (application_id) do nothing;
  end if;
  return new;
end;
$$;

revoke all on function public.phase8_create_offer_from_application() from public,anon,authenticated;

-- ---------------------------------------------------------------------------
-- Idempotent Admin duplication request register.
-- ---------------------------------------------------------------------------

create table if not exists public.project_duplication_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by_user_id uuid not null references auth.users(id) on delete restrict,
  source_project_id uuid not null references public.projects(id) on delete restrict,
  duplicated_project_id uuid not null references public.projects(id) on delete restrict,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  constraint project_duplication_requests_actor_key_unique unique(requested_by_user_id,idempotency_key),
  constraint project_duplication_requests_not_same check (source_project_id<>duplicated_project_id)
);

alter table public.project_duplication_requests enable row level security;
revoke all on table public.project_duplication_requests from public,anon,authenticated;
grant all on table public.project_duplication_requests to service_role;

create index if not exists project_duplication_requests_source_idx
  on public.project_duplication_requests(source_project_id,created_at desc);
create index if not exists project_duplication_requests_target_idx
  on public.project_duplication_requests(duplicated_project_id);

-- ---------------------------------------------------------------------------
-- Safe canonical project duplication.
-- ---------------------------------------------------------------------------

create or replace function public.phase21_duplicate_project(
  p_source_project_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  actor uuid:=auth.uid();
  actor_role text:=coalesce(auth.jwt()->'app_metadata'->>'role','');
  source_project public.projects%rowtype;
  existing_request public.project_duplication_requests%rowtype;
  new_project_id uuid:=gen_random_uuid();
  new_slug text;
  copied_resources integer:=0;
  copied_roles integer:=0;
  copied_milestones integer:=0;
  copied_deliverables integer:=0;
  copied_success integer:=0;
  copied_capabilities integer:=0;
  now_at timestamptz:=now();
begin
  if actor is null or actor_role<>'admin' then
    raise exception using errcode='42501',message='ADMIN_REQUIRED';
  end if;
  if p_source_project_id is null then
    raise exception using errcode='22023',message='SOURCE_PROJECT_REQUIRED';
  end if;
  if length(trim(coalesce(p_idempotency_key,'')))<8 or length(trim(p_idempotency_key))>160 then
    raise exception using errcode='22023',message='IDEMPOTENCY_KEY_INVALID';
  end if;

  -- Serialize a source duplication operation with project-level policy edits.
  select * into source_project
  from public.projects
  where id=p_source_project_id
  for share;
  if source_project.id is null then
    raise exception using errcode='P0002',message='SOURCE_PROJECT_NOT_FOUND';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(actor::text||':'||trim(p_idempotency_key),21));

  select * into existing_request
  from public.project_duplication_requests
  where requested_by_user_id=actor
    and idempotency_key=trim(p_idempotency_key)
  for update;
  if existing_request.id is not null then
    return jsonb_build_object(
      'project_id',existing_request.duplicated_project_id,
      'source_project_id',existing_request.source_project_id,
      'already_created',true
    );
  end if;

  new_slug:=left(regexp_replace(lower(coalesce(source_project.slug,source_project.title,'project')),'[^a-z0-9]+','-','g'),80)
    ||'-copy-'||left(replace(new_project_id::text,'-',''),8);

  insert into public.projects(
    id,slug,title,summary,problem_statement,project_archetype,
    status,visibility,project_type,partner_name,location,location_type,
    difficulty_level,duration_weeks,weekly_commitment,
    participation_mode,min_team_size,target_team_size,max_team_size,team_size_threshold,
    presentation_required,github_repo_required,final_proof_required,
    admission_mode,auto_start_delay_minutes,auto_start_paused_at,
    late_joining_enabled,late_joining_cutoff_at,project_sharing_enabled,member_invites_enabled,
    collaboration_marketplace_enabled,project_lead_invites_enabled,team_member_invites_enabled,
    external_collaboration_invites_enabled,collaboration_social_sharing_enabled,
    offer_expiry_hours,offer_reminders_enabled,
    applications_open,created_by_user_id,updated_by_user_id,
    governance_status,risk_level,risk_reasons,admin_review_required,
    created_at,updated_at
  ) values (
    new_project_id,new_slug,left(source_project.title||' — Copy',180),source_project.summary,source_project.problem_statement,source_project.project_archetype,
    'draft','private',source_project.project_type,source_project.partner_name,source_project.location,source_project.location_type,
    source_project.difficulty_level,source_project.duration_weeks,source_project.weekly_commitment,
    source_project.participation_mode,source_project.min_team_size,source_project.target_team_size,source_project.max_team_size,source_project.team_size_threshold,
    source_project.presentation_required,source_project.github_repo_required,source_project.final_proof_required,
    'review_required',360,null,
    source_project.late_joining_enabled,null,false,false,
    false,true,false,false,false,
    greatest(1,least(720,coalesce(source_project.offer_expiry_hours,72))),source_project.offer_reminders_enabled,
    false,actor,actor,
    'draft',source_project.risk_level,source_project.risk_reasons,source_project.admin_review_required,
    now_at,now_at
  );

  -- Canonical project definition: safe to copy because these rows are not run history.
  insert into public.project_problem_briefs(
    project_id,context,stakeholder,primary_question,expected_outcome,success_metrics,
    constraints,ethics_considerations,primary_use_case,primary_objective,
    supporting_objectives,key_questions,in_scope,out_of_scope,updated_by
  )
  select new_project_id,context,stakeholder,primary_question,expected_outcome,success_metrics,
    constraints,ethics_considerations,primary_use_case,primary_objective,
    supporting_objectives,key_questions,in_scope,out_of_scope,actor
  from public.project_problem_briefs
  where project_id=p_source_project_id;

  insert into public.project_roles(
    project_id,title,discipline,description,openings,skills,responsibilities,
    recommended_skills,experience_expectation,weekly_commitment,role_status,application_requirements
  )
  select new_project_id,title,discipline,description,openings,skills,responsibilities,
    recommended_skills,experience_expectation,weekly_commitment,'open',application_requirements
  from public.project_roles
  where project_id=p_source_project_id;
  get diagnostics copied_roles=row_count;

  insert into public.project_capabilities(project_id,capability_id,importance,evidence_expected)
  select new_project_id,capability_id,importance,evidence_expected
  from public.project_capabilities
  where project_id=p_source_project_id;
  get diagnostics copied_capabilities=row_count;

  insert into public.project_domains(project_id,domain_id,is_primary)
  select new_project_id,domain_id,is_primary
  from public.project_domains
  where project_id=p_source_project_id;

  insert into public.project_role_families(project_id,role_catalogue_id,source)
  select new_project_id,role_catalogue_id,'phase21_duplicate'
  from public.project_role_families
  where project_id=p_source_project_id;

  insert into public.project_tools(project_id,tool_id)
  select new_project_id,tool_id
  from public.project_tools
  where project_id=p_source_project_id;

  insert into public.project_deliverables(
    project_id,project_run_id,workstream_id,title,deliverable_type,owner_user_id,reviewer_user_id,
    acceptance_criteria,status,is_required,created_by,public_summary,expected_format,sort_order
  )
  select new_project_id,null,null,title,deliverable_type,null,null,
    acceptance_criteria,'planned',is_required,actor,public_summary,expected_format,sort_order
  from public.project_deliverables
  where project_id=p_source_project_id and project_run_id is null;
  get diagnostics copied_deliverables=row_count;

  insert into public.project_success_criteria(
    project_id,title,description,measurement,is_required,visibility,sort_order,created_by_user_id
  )
  select new_project_id,title,description,measurement,is_required,visibility,sort_order,actor
  from public.project_success_criteria
  where project_id=p_source_project_id;
  get diagnostics copied_success=row_count;

  insert into public.project_milestones(
    project_id,title,description,week_start,week_end,expected_output,sort_order,status
  )
  select new_project_id,title,description,week_start,week_end,expected_output,sort_order,'planned'
  from public.project_milestones
  where project_id=p_source_project_id;
  get diagnostics copied_milestones=row_count;

  -- Resource duplication is deliberately conservative. Only public, already GREEN
  -- project-level source definitions are copied, and the duplicate must re-review
  -- them before publication. Internal storage locations and prior access state are
  -- never copied, preventing private-resource exfiltration.
  insert into public.project_data_sources(
    project_id,project_run_id,name,description,source_type,external_url,owner_user_id,
    version_label,data_period,unit_of_observation,data_format,sensitivity,access_status,
    quality_status,known_limitations,provenance,download_policy,publish_policy,
    provider_id,provider_name,provider_url,licence_name,licence_url,required_subset,
    approximate_size,retention_policy,internal_storage_policy,governance_status,added_by
  )
  select new_project_id,null,name,description,source_type,external_url,null,
    null,data_period,unit_of_observation,data_format,'public','needs_access',
    'unreviewed',known_limitations,provenance,'team_only','not_permitted',
    provider_id,provider_name,provider_url,licence_name,licence_url,required_subset,
    approximate_size,'unknown','unknown','unreviewed',actor
  from public.project_data_sources
  where project_id=p_source_project_id
    and project_run_id is null
    and governance_status='green'
    and sensitivity='public';
  get diagnostics copied_resources=row_count;

  -- Start a new governance/audit history. Never copy the source event log.
  insert into public.project_architect_assignments(
    project_id,user_id,assignment_role,assigned_by_user_id
  ) values (new_project_id,actor,'creating_architect',actor);

  insert into public.project_governance_events(
    project_id,actor_user_id,actor_scope,event_type,from_status,to_status,reason,metadata
  ) values (
    new_project_id,actor,'admin','project_duplicated',null,'draft',
    'Admin duplicated reusable project configuration into a new private draft.',
    jsonb_build_object(
      'source_project_id',p_source_project_id,
      'historical_data_copied',false,
      'roles',copied_roles,
      'capabilities',copied_capabilities,
      'deliverables',copied_deliverables,
      'success_criteria',copied_success,
      'milestones',copied_milestones,
      'resources_requiring_revalidation',copied_resources
    )
  );

  insert into public.project_duplication_requests(
    requested_by_user_id,source_project_id,duplicated_project_id,idempotency_key
  ) values (actor,p_source_project_id,new_project_id,trim(p_idempotency_key));

  return jsonb_build_object(
    'project_id',new_project_id,
    'source_project_id',p_source_project_id,
    'already_created',false,
    'status','draft',
    'visibility','private',
    'historical_data_copied',false,
    'copied',jsonb_build_object(
      'roles',copied_roles,
      'capabilities',copied_capabilities,
      'deliverables',copied_deliverables,
      'success_criteria',copied_success,
      'milestones',copied_milestones,
      'resources',copied_resources
    )
  );
end;
$$;

revoke all on function public.phase21_duplicate_project(uuid,text) from public,anon;
grant execute on function public.phase21_duplicate_project(uuid,text) to authenticated;

comment on function public.phase21_duplicate_project(uuid,text) is
  'Phase 21 Admin-only idempotent project duplication. Creates one new private canonical draft, copies reusable definition records only, re-governs copied public resources, and never copies applications, Offers, memberships, runs, Chat, collaboration invitations/interests, submissions, contributions/Proof, completion or historical audit/activity.';
