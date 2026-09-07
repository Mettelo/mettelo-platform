-- Phase 8 reminder claim hardening.
--
-- The function returns an OUT column named expires_at. In PL/pgSQL that OUT
-- parameter is also a variable, so every project_offers column reference must be
-- table-qualified to avoid runtime ambiguity.

create or replace function public.phase8_claim_offer_reminders(
  p_limit integer default 100
)
returns table(
  offer_id uuid,
  application_id uuid,
  project_id uuid,
  user_id uuid,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path=public
as $$
begin
  return query
  with candidates as (
    select po.id
    from public.project_offers as po
    where po.status='pending'
      and po.reminder_sent_at is null
      and po.expires_at>now()
      and po.expires_at<=now()+interval '24 hours'
    order by po.expires_at asc
    for update skip locked
    limit greatest(1,least(coalesce(p_limit,100),500))
  ), claimed as (
    update public.project_offers as po
    set reminder_sent_at=now(),updated_at=now()
    from candidates as candidate
    where po.id=candidate.id
    returning po.id,po.application_id,po.project_id,po.user_id,po.expires_at
  )
  select claimed.id,claimed.application_id,claimed.project_id,claimed.user_id,claimed.expires_at
  from claimed;
end;
$$;

revoke all on function public.phase8_claim_offer_reminders(integer) from public,anon,authenticated;
grant execute on function public.phase8_claim_offer_reminders(integer) to service_role;
