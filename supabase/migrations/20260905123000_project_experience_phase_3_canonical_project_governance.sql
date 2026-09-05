-- Project Experience Phase 3: canonical project participation and publication governance.
--
-- Preserve the existing team_size_threshold runtime contract as the minimum
-- formation threshold while introducing an explicit planning model for Solo,
-- Team and Flexible projects. Phase 9 owns runtime formation behaviour; this
-- migration only defines and governs the canonical project definition.

alter table public.projects
  add column if not exists participation_mode text,
  add column if not exists min_team_size integer,
  add column if not exists target_team_size integer,
  add column if not exists max_team_size integer;

-- Conservative legacy backfill: do not invent capacity beyond the historical
-- formation threshold. Existing threshold=1 projects become Solo; all others
-- remain Team projects whose min/target/max initially equal the old threshold.
update public.projects
set
  participation_mode = case when greatest(1, least(50, coalesce(team_size_threshold, 5))) = 1 then 'solo' else 'team' end,
  min_team_size = greatest(1, least(50, coalesce(team_size_threshold, 5))),
  target_team_size = greatest(1, least(50, coalesce(team_size_threshold, 5))),
  max_team_size = greatest(1, least(50, coalesce(team_size_threshold, 5)))
where participation_mode is null
   or min_team_size is null
   or target_team_size is null
   or max_team_size is null;

alter table public.projects
  alter column participation_mode set default 'team',
  alter column min_team_size set default 5,
  alter column target_team_size set default 5,
  alter column max_team_size set default 5,
  alter column participation_mode set not null,
  alter column min_team_size set not null,
  alter column target_team_size set not null,
  alter column max_team_size set not null;

alter table public.projects drop constraint if exists projects_participation_mode_check;
alter table public.projects add constraint projects_participation_mode_check
  check (participation_mode in ('solo','team','flexible'));

alter table public.projects drop constraint if exists projects_participation_capacity_check;
alter table public.projects add constraint projects_participation_capacity_check
  check (
    min_team_size between 1 and 50
    and target_team_size between 1 and 50
    and max_team_size between 1 and 50
    and min_team_size <= target_team_size
    and target_team_size <= max_team_size
    and (
      (participation_mode = 'solo' and min_team_size = 1 and target_team_size = 1 and max_team_size = 1)
      or (participation_mode = 'team' and min_team_size >= 2)
      or (participation_mode = 'flexible' and min_team_size = 1)
    )
  );

comment on column public.projects.participation_mode is
  'Canonical participation definition: solo, team, or flexible. Runtime formation behaviour is governed separately.';
comment on column public.projects.min_team_size is
  'Minimum viable participant count. Canonical equivalent of legacy team_size_threshold.';
comment on column public.projects.target_team_size is
  'Preferred planning capacity for the project; must be between min_team_size and max_team_size.';
comment on column public.projects.max_team_size is
  'Maximum planned participant capacity for the project.';

-- Compatibility trigger. Legacy writers that only change team_size_threshold
-- remain valid; canonical writers update the legacy threshold from min_team_size.
-- This prevents old runtime formation logic from diverging from the new model.
create or replace function public.sync_project_participation_contract()
returns trigger
language plpgsql
set search_path=public
as $$
declare
  legacy_min integer;
  canonical_changed boolean;
begin
  legacy_min := greatest(1, least(50, coalesce(new.team_size_threshold, 5)));
  canonical_changed := tg_op = 'INSERT'
    or old.participation_mode is distinct from new.participation_mode
    or old.min_team_size is distinct from new.min_team_size
    or old.target_team_size is distinct from new.target_team_size
    or old.max_team_size is distinct from new.max_team_size;

  if tg_op = 'UPDATE'
     and old.team_size_threshold is distinct from new.team_size_threshold
     and not canonical_changed then
    new.min_team_size := legacy_min;
    new.target_team_size := greatest(new.target_team_size, legacy_min);
    new.max_team_size := greatest(new.max_team_size, new.target_team_size);
    if legacy_min = 1 and new.participation_mode = 'team' then
      new.participation_mode := 'flexible';
    elsif legacy_min >= 2 and new.participation_mode = 'solo' then
      new.participation_mode := 'team';
    end if;
  else
    if new.participation_mode = 'solo' then
      new.min_team_size := 1;
      new.target_team_size := 1;
      new.max_team_size := 1;
    end if;
    new.team_size_threshold := new.min_team_size;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_project_participation_contract on public.projects;
create trigger sync_project_participation_contract
before insert or update of team_size_threshold,participation_mode,min_team_size,target_team_size,max_team_size
on public.projects
for each row execute function public.sync_project_participation_contract();

revoke all on function public.sync_project_participation_contract() from public,anon,authenticated;

-- Extend the canonical publication-readiness view. Admin approval already uses
-- this view, so participation definition becomes an enforced publication gate
-- without introducing a second approval subsystem.
create or replace view public.project_experience_readiness
with (security_invoker=true)
as
with assessed as (
  select
    p.id as project_id,
    p.slug,
    p.title,
    array_remove(array[
      case when nullif(btrim(coalesce(p.title,'')),'') is null then 'title' end,
      case when nullif(btrim(coalesce(p.summary,'')),'') is null then 'summary' end,
      case when nullif(btrim(coalesce(p.problem_statement,'')),'') is null then 'problem_statement' end,
      case when pb.project_id is null or nullif(btrim(coalesce(pb.context,'')),'') is null then 'business_context' end,
      case when pb.project_id is null or nullif(btrim(coalesce(pb.stakeholder,'')),'') is null then 'stakeholder' end,
      case when pb.project_id is null or nullif(btrim(coalesce(pb.expected_outcome,'')),'') is null then 'expected_outcome' end,
      case when p.participation_mode not in ('solo','team','flexible') then 'participation_mode' end,
      case when p.min_team_size is null or p.target_team_size is null or p.max_team_size is null
             or p.min_team_size < 1 or p.max_team_size > 50
             or p.min_team_size > p.target_team_size or p.target_team_size > p.max_team_size
             or (p.participation_mode='solo' and (p.min_team_size<>1 or p.target_team_size<>1 or p.max_team_size<>1))
             or (p.participation_mode='team' and p.min_team_size<2)
             or (p.participation_mode='flexible' and p.min_team_size<>1)
        then 'participation_capacity' end,
      case when p.team_size_threshold is distinct from p.min_team_size then 'formation_threshold_alignment' end,
      case when not exists(select 1 from public.project_roles r where r.project_id=p.id and coalesce(r.role_status,'open') in ('open','limited')) then 'roles' end,
      case when not exists(select 1 from public.project_deliverables d where d.project_id=p.id and d.project_run_id is null and d.is_required) then 'deliverables' end,
      case when not exists(select 1 from public.project_success_criteria sc where sc.project_id=p.id and sc.is_required) then 'success_criteria' end
    ],null)::text[] as critical_missing,
    array_remove(array[
      case when pb.project_id is null or nullif(btrim(coalesce(pb.primary_use_case,'')),'') is null then 'primary_use_case' end,
      case when pb.project_id is null or nullif(btrim(coalesce(pb.primary_objective,'')),'') is null then 'primary_objective' end,
      case when not exists(select 1 from public.project_milestones m where m.project_id=p.id and m.project_run_id is null) then 'timeline' end,
      case when not exists(select 1 from public.project_capabilities pc where pc.project_id=p.id) then 'capabilities' end,
      case when not exists(select 1 from public.project_capabilities pc where pc.project_id=p.id and pc.evidence_expected) then 'evidence_expectations' end
    ],null)::text[] as quality_gaps,
    coalesce((
      select array_agg(concat('resource:',ds.id::text,':',coalesce(nullif(btrim(ds.name),''),'unnamed'),':',ds.governance_status) order by ds.created_at,ds.id)
      from public.project_data_sources ds
      where ds.project_id=p.id and ds.project_run_id is null and ds.governance_status in ('unreviewed','verification_required','amber')
    ),'{}'::text[]) as verification_required,
    coalesce((
      select array_agg(concat('resource:',ds.id::text,':',coalesce(nullif(btrim(ds.name),''),'unnamed'),':red') order by ds.created_at,ds.id)
      from public.project_data_sources ds
      where ds.project_id=p.id and ds.project_run_id is null and ds.governance_status='red'
    ),'{}'::text[]) as red_resource_blockers,
    array_remove(array[
      case when pb.project_id is null then 'project_brief' end,
      case when not exists(select 1 from public.project_deliverables d where d.project_id=p.id and d.project_run_id is null and d.is_required) then 'deliverables' end,
      case when not exists(select 1 from public.project_success_criteria sc where sc.project_id=p.id and sc.is_required) then 'success_criteria' end,
      case when not exists(select 1 from public.project_milestones m where m.project_id=p.id and m.project_run_id is null) then 'timeline' end
    ],null)::text[] as lab_missing
  from public.projects p
  left join public.project_problem_briefs pb on pb.project_id=p.id
), readiness as (
  select *, critical_missing || quality_gaps as definition_blockers,
    cardinality(verification_required)=0 and cardinality(red_resource_blockers)=0 as resources_clear
  from assessed
)
select
  project_id,slug,title,
  cardinality(definition_blockers)=0 as experience_ready,
  definition_blockers as missing_requirements,
  critical_missing,quality_gaps,verification_required,red_resource_blockers,
  definition_blockers || verification_required || red_resource_blockers as publication_blockers,
  lab_missing,
  cardinality(definition_blockers)=0 as public_detail_ready,
  cardinality(definition_blockers)=0 as application_ready,
  resources_clear as resource_governance_ready,
  cardinality(definition_blockers)=0 and resources_clear as publication_ready,
  cardinality(lab_missing)=0 and resources_clear as lab_ready
from readiness;

grant select on public.project_experience_readiness to authenticated;
grant select on public.project_experience_readiness to service_role;
