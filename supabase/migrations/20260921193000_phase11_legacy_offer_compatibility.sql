-- Phase 11 legacy REVIEW_REQUIRED compatibility.
-- Modern REVIEW_REQUIRED admissions must have the exact accepted/consumed Offer.
-- Canonical memberships created before the Offer architecture are grandfathered
-- only when their matching application has no admission snapshot/decision.

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

  if effective_admission='review_required' then
    select count(*)::integer into exact_offer_gaps
    from public.project_members m
    where m.project_run_id=p_run_id
      and m.project_id=p_project_id
      and m.membership_status in ('waiting','active')
      -- Only modern review admissions are subject to the exact Offer contract.
      and exists (
        select 1
        from public.project_applications a
        where a.project_id=p_project_id
          and a.project_run_id=p_run_id
          and a.user_id=m.user_id
          and (
            a.admission_mode_snapshot is not null
            or a.admission_decision is not null
          )
      )
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
          and o.capacity_released_at is null
          and o.capacity_consumed_at is not null
      );

    -- The private v1 base predates the legacy distinction and may have added
    -- offer_acceptance for any REVIEW_REQUIRED membership. Rebuild those arrays
    -- from the base output before applying the modern exact-Offer result.
    select coalesce(jsonb_agg(value),'[]'::jsonb) into team_blockers
    from jsonb_array_elements_text(team_blockers) item(value)
    where value<>'offer_acceptance';

    select coalesce(jsonb_agg(value),'[]'::jsonb) into blockers
    from jsonb_array_elements_text(blockers) item(value)
    where value<>'offer_acceptance';

    select coalesce(jsonb_agg(value),'[]'::jsonb) into reasons
    from jsonb_array_elements_text(reasons) item(value)
    where value<>'OFFER_NOT_ACCEPTED';

    if exact_offer_gaps>0 then
      team_blockers:=team_blockers||jsonb_build_array('offer_acceptance');
      blockers:=blockers||jsonb_build_array('offer_acceptance');
      reasons:=reasons||jsonb_build_array('OFFER_NOT_ACCEPTED');
    end if;
  end if;

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
  team_ready:=jsonb_array_length(team_blockers)=0;
  system_ready:=coalesce((result#>>'{system,ready}')::boolean,false)
    and not (effective_admission='auto' and (run_row.scheduled_start_at is null or run_row.scheduled_start_at>now()));

  result:=jsonb_set(result,'{team,blockers}',team_blockers,true);
  result:=jsonb_set(result,'{team,ready}',to_jsonb(team_ready),true);
  result:=jsonb_set(result,'{team,missing_accepted_offers}',to_jsonb(exact_offer_gaps),true);
  result:=jsonb_set(result,'{system,blockers}',system_blockers,true);
  result:=jsonb_set(result,'{system,ready}',to_jsonb(system_ready),true);
  result:=jsonb_set(result,'{system,schedule_due}',to_jsonb(effective_admission<>'auto' or (run_row.scheduled_start_at is not null and run_row.scheduled_start_at<=now())),true);
  result:=jsonb_set(result,'{system,scheduled_start_at}',coalesce(to_jsonb(run_row.scheduled_start_at),'null'::jsonb),true);
  result:=jsonb_set(result,'{system,kickoff_ready}','true'::jsonb,true);
  result:=jsonb_set(result,'{system,support_route_ready}','true'::jsonb,true);
  result:=jsonb_set(result,'{system,support_route}',to_jsonb('/contact'::text),true);
  result:=jsonb_set(result,'{reason_codes}',reasons,true);
  result:=jsonb_set(result,'{blockers}',blockers,true);
  result:=jsonb_set(result,'{ready}',to_jsonb(project_ready and team_ready and system_ready),true);
  result:=jsonb_set(result,'{state}',to_jsonb(case when project_ready and team_ready and system_ready then 'READY' else 'NOT_READY' end),true);

  return result;
end;
$$;

revoke all on function public.phase11_project_start_readiness(uuid,uuid)
  from public,anon,authenticated;
grant execute on function public.phase11_project_start_readiness(uuid,uuid)
  to service_role;

-- Recover only independent legacy runs that become completely ready under the
-- compatibility rule. Multi-member formation remains governed by normal Team
-- readiness or explicit Admin force-start.
do $$
declare
  x record;
  readiness jsonb;
  activation jsonb;
begin
  for x in
    select r.id as run_id,r.project_id
    from public.project_runs r
    join public.projects p on p.id=r.project_id
    where r.status='forming'
      and coalesce(r.has_started,false)=false
      and greatest(coalesce(r.required_team_size,r.team_size_threshold,1),1)=1
      and public.effective_project_admission_mode(p.project_type,p.admission_mode)='review_required'
  loop
    readiness:=public.phase11_project_start_readiness(x.project_id,x.run_id);
    if coalesce((readiness->>'ready')::boolean,false) then
      activation:=public.phase9_activate_project_run(x.project_id,x.run_id,'manual',null);
    end if;
  end loop;
end $$;
