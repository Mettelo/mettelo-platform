-- Phase 18 recovery: native device sharing is a first-class privacy-safe funnel event.
-- This extends the existing canonical collaboration analytics event set only.

alter table public.project_collaboration_analytics_events
  drop constraint if exists project_collaboration_analytics_events_event_type_check;

alter table public.project_collaboration_analytics_events
  add constraint project_collaboration_analytics_events_event_type_check
  check (event_type in (
    'opportunity_viewed','recommendation_viewed','recommendation_dismissed',
    'interest_started','interest_submitted','invite_sent','invite_accepted',
    'share_linkedin','share_x','share_whatsapp','share_copy','share_native'
  ));

create or replace function public.phase18_record_collaboration_analytics(
  p_event_type text,
  p_collaboration_need_id uuid,
  p_surface text,
  p_actor_user_id uuid default null
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  need public.project_collaboration_needs%rowtype;
begin
  if p_event_type not in (
    'opportunity_viewed','recommendation_viewed','recommendation_dismissed',
    'interest_started','interest_submitted','invite_sent','invite_accepted',
    'share_linkedin','share_x','share_whatsapp','share_copy','share_native'
  ) then
    raise exception using errcode='23514',message='INVALID_COLLABORATION_ANALYTICS_EVENT';
  end if;
  if p_surface not in ('member_home','find_a_team','member_project','public_opportunity','external_invite','system') then
    raise exception using errcode='23514',message='INVALID_COLLABORATION_ANALYTICS_SURFACE';
  end if;
  select * into need from public.project_collaboration_needs where id=p_collaboration_need_id;
  if need.id is null then
    raise exception using errcode='P0002',message='COLLABORATION_NEED_NOT_FOUND';
  end if;
  insert into public.project_collaboration_analytics_events(
    event_type,project_id,project_run_id,collaboration_need_id,actor_user_id,surface
  ) values (
    p_event_type,need.project_id,need.project_run_id,need.id,p_actor_user_id,p_surface
  );
end;
$$;

revoke all on function public.phase18_record_collaboration_analytics(text,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.phase18_record_collaboration_analytics(text,uuid,text,uuid) to service_role;
