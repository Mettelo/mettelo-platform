-- Phase 3 career RLS performance hardening.
-- Keep candidate isolation while avoiding per-row auth evaluation and overlapping SELECT policies.

drop policy if exists "members can view own career applications" on public.career_applications;
create policy "members can view own career applications"
on public.career_applications
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "members can view own career application events" on public.career_application_events;
create policy "members can view own career application events"
on public.career_application_events
for select
to authenticated
using (
  exists (
    select 1
    from public.career_applications ca
    where ca.id = application_id
      and ca.user_id = (select auth.uid())
  )
);

drop policy if exists "admins manage career onboarding" on public.career_onboarding_items;
drop policy if exists "members can view own career onboarding" on public.career_onboarding_items;

create policy "career onboarding readable by owner or admin"
on public.career_onboarding_items
for select
to authenticated
using (
  (select public.is_admin())
  or exists (
    select 1
    from public.career_applications ca
    where ca.id = application_id
      and ca.user_id = (select auth.uid())
  )
);

create policy "admins insert career onboarding"
on public.career_onboarding_items
for insert
to authenticated
with check ((select public.is_admin()));

create policy "admins update career onboarding"
on public.career_onboarding_items
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "admins delete career onboarding"
on public.career_onboarding_items
for delete
to authenticated
using ((select public.is_admin()));
