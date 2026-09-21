-- Forward recovery for accepted Offers that are still only reservations.
-- This intentionally replays the canonical Phase 10/11/9 authorities instead of
-- duplicating formation or activation policy in migration code.

do $$
declare
  candidate record;
  formed jsonb;
  readiness jsonb;
  activated jsonb;
begin
  for candidate in
    select
      a.id as application_id,
      a.project_id
    from public.project_applications a
    join public.project_offers o on o.application_id=a.id
    join public.projects p on p.id=a.project_id
    where a.status='accepted'
      and o.status='accepted'
      and o.accepted_at is not null
      and o.capacity_released_at is null
      and o.capacity_consumed_at is null
      and public.effective_project_admission_mode(p.project_type,p.admission_mode)='review_required'
      and p.status not in ('cancelled','completed','archived')
    order by o.accepted_at asc,o.id asc
  loop
    begin
      readiness:=null;
      activated:=null;
      formed:=public.phase10_form_accepted_offer(candidate.application_id);

      if coalesce((formed->>'required_team_size')::integer,0)=1
         and coalesce(formed->>'participation_preference','') in ('solo','flexible')
         and nullif(formed->>'run_id','') is not null then
        readiness:=public.phase11_project_start_readiness(
          candidate.project_id,
          (formed->>'run_id')::uuid
        );

        if coalesce((readiness->>'ready')::boolean,false) then
          activated:=public.phase9_activate_project_run(
            candidate.project_id,
            (formed->>'run_id')::uuid,
            'manual',
            null
          );
        end if;
      end if;

      insert into public.project_activity_log(
        project_id,
        project_run_id,
        event_type,
        actor_type,
        from_status,
        to_status,
        metadata
      ) values (
        candidate.project_id,
        nullif(formed->>'run_id','')::uuid,
        'accepted_offer_forward_recovery',
        'system',
        'accepted',
        case
          when coalesce((activated->>'started')::boolean,false)
            or coalesce((activated->>'already_started')::boolean,false)
            then 'active'
          when nullif(formed->>'membership_id','') is not null
            then 'waiting_for_team'
          else 'accepted'
        end,
        jsonb_build_object(
          'application_id',candidate.application_id,
          'formation',formed,
          'readiness',readiness,
          'activation',activated,
          'source','20260921095000_replay_accepted_offer_formation_recovery'
        )
      );
    exception when others then
      raise warning 'accepted Offer forward recovery skipped application %: %',
        candidate.application_id,sqlerrm;
    end;
  end loop;
end
$$;
