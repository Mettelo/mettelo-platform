-- Preserve the existing Phase 8 expiry-worker delivery contract after integrity hardening.
-- The worker returns exactly-once expired Offer targets so the cron route can send
-- canonical expiry communication without querying stale pending state again.

create or replace function public.phase8_expire_project_offers(
  p_limit integer default 100
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  offer_row public.project_offers%rowtype;
  now_at timestamptz:=now();
  expired_count integer:=0;
  expired_rows jsonb:='[]'::jsonb;
begin
  for offer_row in
    select *
    from public.project_offers
    where status='pending' and expires_at<=now_at
    order by expires_at asc
    for update skip locked
    limit greatest(1,least(coalesce(p_limit,100),500))
  loop
    update public.project_offers
    set status='expired',expired_at=now_at,capacity_released_at=now_at,updated_at=now_at
    where id=offer_row.id and status='pending';

    if found then
      update public.project_applications
      set status='expired',updated_at=now_at
      where id=offer_row.application_id and status='offered';

      insert into public.project_activity_log(
        project_id,project_run_id,event_type,actor_type,from_status,to_status,metadata
      ) values (
        offer_row.project_id,offer_row.project_run_id,'offer_expired','system','offered','expired',
        jsonb_build_object(
          'offer_id',offer_row.id,
          'application_id',offer_row.application_id,
          'source','phase8_expiry_worker',
          'capacity_released',true,
          'decision_seconds',greatest(0,extract(epoch from (now_at-offer_row.offered_at))::bigint)
        )
      );

      expired_rows:=expired_rows||jsonb_build_array(jsonb_build_object(
        'offer_id',offer_row.id,
        'application_id',offer_row.application_id,
        'project_id',offer_row.project_id,
        'user_id',offer_row.user_id,
        'expires_at',offer_row.expires_at
      ));
      expired_count:=expired_count+1;
    end if;
  end loop;

  return jsonb_build_object('expired',expired_count,'offers',expired_rows);
end;
$$;

revoke all on function public.phase8_expire_project_offers(integer) from public,anon,authenticated;
grant execute on function public.phase8_expire_project_offers(integer) to service_role;
