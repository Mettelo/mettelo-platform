-- Production Workstream 2 schema reconciliation.
--
-- This migration records the compatibility recovery required when a populated
-- environment reached Workstream 2 with an older Project Experience schema.
-- It is deliberately idempotent on environments that already applied the
-- canonical migration chain. It does not publish projects, create membership,
-- bypass RLS, or mutate lifecycle state.

begin;

-- Legacy populated environments may have project_roles.recommended_skills as
-- text[] even though the canonical Project Experience contract uses jsonb.
-- Preserve every existing value during the one-way representation upgrade.
do $$
declare
  v_udt_name text;
begin
  select c.udt_name
    into v_udt_name
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'project_roles'
    and c.column_name = 'recommended_skills';

  if v_udt_name = '_text' then
    alter table public.project_roles
      alter column recommended_skills drop default;

    alter table public.project_roles
      alter column recommended_skills type jsonb
      using to_jsonb(coalesce(recommended_skills, '{}'::text[]));

    alter table public.project_roles
      alter column recommended_skills set default '[]'::jsonb,
      alter column recommended_skills set not null;
  end if;
end;
$$;

-- The current Submit Interest journey uses `flexible`. Keep the legacy
-- `either` value readable for historical Phase 6 rows without allowing the
-- compatibility constraint to reject current submissions.
alter table public.project_applications
  drop constraint if exists project_applications_participation_preference_check;

alter table public.project_applications
  add constraint project_applications_participation_preference_check
  check (
    participation_preference is null
    or participation_preference in ('solo', 'team', 'flexible', 'either')
  );

-- Fail deployment loudly if the environment is still missing any authority
-- required by the Workstream 2 public catalogue / member decision contract.
do $$
begin
  if to_regclass('public.project_offers') is null then
    raise exception 'WORKSTREAM2_RECONCILIATION_MISSING:project_offers';
  end if;

  if to_regclass('public.project_acceptance_criteria') is null then
    raise exception 'WORKSTREAM2_RECONCILIATION_MISSING:project_acceptance_criteria';
  end if;

  if to_regclass('public.project_dependencies') is null then
    raise exception 'WORKSTREAM2_RECONCILIATION_MISSING:project_dependencies';
  end if;

  if to_regclass('public.project_experience_readiness') is null then
    raise exception 'WORKSTREAM2_RECONCILIATION_MISSING:project_experience_readiness';
  end if;

  if to_regprocedure('public.get_public_project_capacity(uuid)') is null then
    raise exception 'WORKSTREAM2_RECONCILIATION_MISSING:get_public_project_capacity';
  end if;

  if to_regprocedure('public.get_public_project_capacities()') is null then
    raise exception 'WORKSTREAM2_RECONCILIATION_MISSING:get_public_project_capacities';
  end if;

  if to_regprocedure('public.workstream2_publication_blockers(uuid)') is null then
    raise exception 'WORKSTREAM2_RECONCILIATION_MISSING:workstream2_publication_blockers';
  end if;

  if to_regprocedure('public.workstream2_member_application_readiness(uuid)') is null then
    raise exception 'WORKSTREAM2_RECONCILIATION_MISSING:workstream2_member_application_readiness';
  end if;
end;
$$;

comment on constraint project_applications_participation_preference_check
  on public.project_applications is
  'Compatibility boundary: current Submit Interest values are solo/team/flexible; historical Phase 6 either rows remain valid.';

commit;
