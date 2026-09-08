-- Project Experience Phase 18C: member-controlled recommendations and privacy-safe collaboration analytics.
-- Extends existing member privacy preferences and canonical Phase 18 collaboration needs.

alter table public.member_privacy_preferences
  add column if not exists allow_collaboration_recommendations boolean not null default true;

create table if not exists public.project_collaboration_recommendation_dismissals (
  user_id uuid not null references public.profiles(id) on delete cascade,
  collaboration_need_id uuid not null references public.project_collaboration_needs(id) on delete cascade,
  dismissed_at timestamptz not null default now(),
  primary key(user_id, collaboration_need_id)
);
create index if not exists project_collaboration_recommendation_dismissals_need_idx on public.project_collaboration_recommendation_dismissals(collaboration_need_id,dismissed_at desc);
alter table public.project_collaboration_recommendation_dismissals enable row level security;
drop policy if exists project_collaboration_recommendation_dismissals_own on public.project_collaboration_recommendation_dismissals;
create policy project_collaboration_recommendation_dismissals_own on public.project_collaboration_recommendation_dismissals for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
revoke all on table public.project_collaboration_recommendation_dismissals from anon;
grant select,insert,delete on table public.project_collaboration_recommendation_dismissals to authenticated;
grant all on table public.project_collaboration_recommendation_dismissals to service_role;

create table if not exists public.project_collaboration_analytics_events (
  id bigint generated always as identity primary key,
  event_type text not null check (event_type in ('opportunity_viewed','recommendation_viewed','recommendation_dismissed','interest_started','interest_submitted','invite_sent','invite_accepted','share_linkedin','share_x','share_whatsapp','share_copy')),
  project_id uuid not null references public.projects(id) on delete cascade,
  project_run_id uuid not null references public.project_runs(id) on delete cascade,
  collaboration_need_id uuid not null references public.project_collaboration_needs(id) on delete cascade,
  actor_user_id uuid references public.profiles(id) on delete set null,
  surface text not null check (surface in ('member_home','find_a_team','member_project','public_opportunity','external_invite','system')),
  created_at timestamptz not null default now()
);
create index if not exists project_collaboration_analytics_rollup_idx on public.project_collaboration_analytics_events(project_id,project_run_id,collaboration_need_id,event_type,created_at desc);
create index if not exists project_collaboration_analytics_actor_idx on public.project_collaboration_analytics_events(actor_user_id,created_at desc) where actor_user_id is not null;
alter table public.project_collaboration_analytics_events enable row level security;
revoke all on table public.project_collaboration_analytics_events from public,anon,authenticated;
grant all on table public.project_collaboration_analytics_events to service_role;

create or replace function public.phase18_record_collaboration_analytics(p_event_type text,p_collaboration_need_id uuid,p_surface text,p_actor_user_id uuid default null)
returns void language plpgsql security definer set search_path=public as $$
declare need public.project_collaboration_needs%rowtype;
begin
  if p_event_type not in ('opportunity_viewed','recommendation_viewed','recommendation_dismissed','interest_started','interest_submitted','invite_sent','invite_accepted','share_linkedin','share_x','share_whatsapp','share_copy') then raise exception using errcode='23514',message='INVALID_COLLABORATION_ANALYTICS_EVENT'; end if;
  if p_surface not in ('member_home','find_a_team','member_project','public_opportunity','external_invite','system') then raise exception using errcode='23514',message='INVALID_COLLABORATION_ANALYTICS_SURFACE'; end if;
  select * into need from public.project_collaboration_needs where id=p_collaboration_need_id;
  if need.id is null then raise exception using errcode='P0002',message='COLLABORATION_NEED_NOT_FOUND'; end if;
  insert into public.project_collaboration_analytics_events(event_type,project_id,project_run_id,collaboration_need_id,actor_user_id,surface) values(p_event_type,need.project_id,need.project_run_id,need.id,p_actor_user_id,p_surface);
end;$$;
revoke all on function public.phase18_record_collaboration_analytics(text,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.phase18_record_collaboration_analytics(text,uuid,text,uuid) to service_role;

comment on table public.project_collaboration_analytics_events is 'Phase 18 privacy-safe collaboration funnel events. Structured identifiers only; never store email, private profile text, support data, free text, or popularity scores.';
comment on table public.project_collaboration_recommendation_dismissals is 'Member-owned recommendation dismissals. Dismissal affects only that member recommendation surface and never admission, eligibility, project capacity or other members ranking.';