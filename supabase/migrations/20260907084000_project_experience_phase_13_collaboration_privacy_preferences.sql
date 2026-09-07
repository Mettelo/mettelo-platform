-- Phase 13: collaboration communication preference and restricted-event privacy hardening.
--
-- Guarantees:
-- * project_mention and event_changed are first-class active preference events;
-- * named-member project events are not readable by every project member;
-- * the canonical event-access helper remains the single audience predicate used by
--   event resources and direct project_meetings reads.

insert into public.notification_event_catalogue (
  event_key,
  product_area,
  description,
  default_channel,
  urgency,
  action_required,
  retryable,
  active
)
values
  (
    'project_mention',
    'collaboration',
    'A project teammate mentioned you in project collaboration',
    'email_and_in_app',
    'normal',
    true,
    true,
    true
  ),
  (
    'event_changed',
    'events',
    'Material event change, cancellation or reminder',
    'email_and_in_app',
    'high',
    true,
    true,
    true
  )
on conflict (event_key) do update set
  product_area = excluded.product_area,
  description = excluded.description,
  default_channel = excluded.default_channel,
  urgency = excluded.urgency,
  action_required = excluded.action_required,
  retryable = excluded.retryable,
  active = true,
  updated_at = now();

create or replace function public.mettelo_can_access_project_event(target_event uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_meetings e
    where e.id = target_event
      and (
        public.is_admin()
        or e.organiser_user_id = (select auth.uid())
        or case
          when e.project_run_id is not null then public.mettelo_is_run_lead(e.project_run_id)
          else public.is_project_lead(e.project_id)
        end
        or (
          e.visibility = 'named_members'
          and exists (
            select 1
            from public.project_event_participants p
            where p.event_id = e.id
              and p.user_id = (select auth.uid())
          )
        )
        or (
          e.visibility in ('project_team','community_learning','approval_required')
          and (
            case
              when e.project_run_id is not null then public.mettelo_is_run_member(e.project_run_id)
              else public.is_project_member(e.project_id)
            end
            or exists (
              select 1
              from public.project_event_participants p
              where p.event_id = e.id
                and p.user_id = (select auth.uid())
            )
            or exists (
              select 1
              from public.project_event_registrations r
              where r.event_id = e.id
                and r.user_id = (select auth.uid())
                and r.status in ('reserved','offered')
            )
          )
        )
      )
  );
$$;

revoke all on function public.mettelo_can_access_project_event(uuid) from public;
grant execute on function public.mettelo_can_access_project_event(uuid) to authenticated;

drop policy if exists "project meetings readable by members" on public.project_meetings;
drop policy if exists "project meetings readable by authorised event audience" on public.project_meetings;
create policy "project meetings readable by authorised event audience"
on public.project_meetings
for select
to authenticated
using (public.mettelo_can_access_project_event(id));

comment on function public.mettelo_can_access_project_event(uuid) is
  'Canonical project-event audience predicate. Named-member events are limited to named participants plus organiser/lead/Admin; team/community events retain governed member or confirmed attendee access.';
