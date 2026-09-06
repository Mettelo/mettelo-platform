-- Project Experience Phase 11 — final authority hardening.
--
-- Keep one externally callable Phase 11 readiness contract while composing the
-- already-versioned 0201 implementation internally. This migration closes two
-- start-authorization gaps found during Director review:
--   * REVIEW_REQUIRED members must be backed by the accepted Offer for the
--     application assigned to THIS run, not any historical Offer for a project;
--   * AUTO readiness itself reports SCHEDULE_NOT_DUE before the intervention
--     window expires, so Admin/API projections agree with the DB start guard.
-- It also adds the partial index used by the durable due-start worker.

create index if not exists project_runs_phase11_due_start_idx
  on public.project_runs(scheduled_start_at, project_id)
  where status='forming'
    and has_started=false
    and scheduled_start_at is not null;

-- Preserve the previous implementation only as a private implementation detail.
-- The canonical callable name remains phase11_project_start_readiness.
alter function public.phase11_project_start_readiness(uuid,uuid)
  rename to phase11_project_start_readiness_v1_base;
revoke all on function public.phase11_project_start_readiness_v1_base(uuid,uuid)
  from public,anon,authenticated,service_role;

create or replace function public.phase11_project_start_readiness(
  p_project_id uuid,
  p_run_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  result jsonb;
  project_row public.projects%rowtype;
  run_row public.project_runs%rowtype;
  effective_admission text;
  exact_offer_gaps integer:=0;
  blockers jsonb:='[]'::jsonb;
  team_blockers jsonb:='[]'::jsonb;
  system_blockers jsonb:='[]'::jsonb;
  reasons jsonb:='[]'::jsonb;
  project_ready boolean:=false;
  team_ready boolean:=false;
  system_ready boolean:=false;
begin
  -- Private base call is allowed inside this SECURITY DEFINER function even
  -- though no SQL role receives EXECUTE on the base implementation.
  result:=public.phase11_project_start_readiness_v1_base(p_project_id,p_run_id);

  select * into project_row from public.projects where id=p_project_id;
  select * into run_row from public.project_runs where id=p_run_id and project_id=p_project_id;
  if project_row.id is null or run_row.id is null then
    raise exception using errcode='P0002',message='PROJECT_RUN_NOT_FOUND';
  end if;

  effective_admission:=public.effective_project_admission_mode(project_row.project_type,project_row.admission_mode);
  blockers:=coalesce(result->'blockers','[]'::jsonb);
  team_blockers:=coalesce(result#>'{team,blockers}','[]'::jsonb);
  system_blockers:=coalesce(result#>'{system,blockers}','[]'::jsonb);
  reasons:=coalesce(result->'reason_codes','[]'::jsonb);

  -- REVIEW_REQUIRED authority is run-scoped. The accepted Offer must belong to
  -- the same application that Phase 10 assigned to this run, must remain
  -- unreleased, and its reservation must have been consumed into membership.
  if effective_admission='review_required' then
    select count(*)::integer into exact_offer_gaps
    from public.project_members m
    where m.project_run_id=p_run_id
      and m.project_id=p_project_id
      and m.membership_status in ('waiting','active')
      and not exists (
        select 1
        from public.project_applications a
        join public.project_offers o on o.application_id=a.id
        where a.project_id=p_project_id
          and a.project_run_id=p_run_id
          and a.user_id=m.user_id
          and o.project_id=p_project_id
          and o.user_id=m.user_id
          and o.status='accepted'
          and o.accepted_at is not null
          and o.reservation_released_at is null
          and o.reservation_consumed_at is not null
      );

    if exact_offer_gaps>0 then
      if not (team_blockers ? 'offer_acceptance') then
        team_blockers:=team_blockers||jsonb_build_array('offer_acceptance');
      end if;
      if not (blockers ? 'offer_acceptance') then
        blockers:=blockers||jsonb_build_array('offer_acceptance');
      end if;
      if not (reasons ? 'OFFER_NOT_ACCEPTED') then
        reasons:=reasons||jsonb_build_array('OFFER_NOT_ACCEPTED');
      end if;
    end if;
  end if;

  -- For AUTO projects the intervention deadline is part of FINAL readiness,
  -- not merely a scheduler hint. Six hours passing triggers this check; it does
  -- not bypass Project/Team/System readiness.
  if effective_admission='auto'
     and (run_row.scheduled_start_at is null or run_row.scheduled_start_at>now()) then
    if not (system_blockers ? 'schedule_not_due') then
      system_blockers:=system_blockers||jsonb_build_array('schedule_not_due');
    end if;
    if not (blockers ? 'schedule_not_due') then
      blockers:=blockers||jsonb_build_array('schedule_not_due');
    end if;
    if not (reasons ? 'SCHEDULE_NOT_DUE') then
      reasons:=reasons||jsonb_build_array('SCHEDULE_NOT_DUE');
    end if;
  end if;

  project_ready:=coalesce((result#>>'{project,ready}')::boolean,false);
  team_ready:=coalesce((result#>>'{team,ready}')::boolean,false) and exact_offer_gaps=0;
  system_ready:=coalesce((result#>>'{system,ready}')::boolean,false)
    and not (effective_admission='auto' and (run_row.scheduled_start_at is null or run_row.scheduled_start_at>now()));

  result:=jsonb_set(result,'{team,blockers}',team_blockers,true);
  result:=jsonb_set(result,'{team,ready}',to_jsonb(team_ready),true);
  result:=jsonb_set(result,'{team,missing_accepted_offers}',to_jsonb(exact_offer_gaps),true);
  result:=jsonb_set(result,'{system,blockers}',system_blockers,true);
  result:=jsonb_set(result,'{system,ready}',to_jsonb(system_ready),true);
  result:=jsonb_set(result,'{system,schedule_due}',to_jsonb(effective_admission<>'auto' or (run_row.scheduled_start_at is not null and run_row.scheduled_start_at<=now())),true);
  result:=jsonb_set(result,'{system,scheduled_start_at}',coalesce(to_jsonb(run_row.scheduled_start_at),'null'::jsonb),true);
  -- Kickoff communication is generated only after atomic activation by the
  -- canonical start service. No pre-start meeting row is required by the current
  -- architecture, so readiness means that canonical mechanism is available.
  result:=jsonb_set(result,'{system,kickoff_ready}','true'::jsonb,true);
  -- Mettelo's existing authenticated/public Contact workflow is the canonical
  -- escalation route until a project-specific support model is introduced by a
  -- later explicit product phase; Phase 11 does not duplicate it.
  result:=jsonb_set(result,'{system,support_route_ready}','true'::jsonb,true);
  result:=jsonb_set(result,'{system,support_route}',to_jsonb('/contact'::text),true);
  result:=jsonb_set(result,'{reason_codes}',reasons,true);
  result:=jsonb_set(result,'{blockers}',blockers,true);
  result:=jsonb_set(result,'{ready}',to_jsonb(project_ready and team_ready and system_ready),true);
  result:=jsonb_set(result,'{state}',to_jsonb(case when project_ready and team_ready and system_ready then 'READY' else 'NOT_READY' end),true);

  return result;
end;
$$;

comment on function public.phase11_project_start_readiness(uuid,uuid) is
  'Canonical service-only Phase 11 final readiness authority. Revalidates run-scoped REVIEW_REQUIRED Offer acceptance and AUTO schedule eligibility in addition to canonical Project/Team/System readiness.';
revoke all on function public.phase11_project_start_readiness(uuid,uuid)
  from public,anon,authenticated;
grant execute on function public.phase11_project_start_readiness(uuid,uuid)
  to service_role;
