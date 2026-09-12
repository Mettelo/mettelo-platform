-- Grow the Team recovery: direct member requests must not require a public marketplace post.
-- A private direct-invite collaboration context preserves the existing same-run admission
-- constraint without publishing private recruitment activity in Find a Team/public APIs.

alter table public.project_collaboration_needs
  drop constraint if exists project_collaboration_needs_source_check;

alter table public.project_collaboration_needs
  add constraint project_collaboration_needs_source_check
  check (source in ('member','direct_invite','phase15_solo_to_team','phase16_replacement','admin'));

create unique index if not exists project_collaboration_needs_one_active_direct_context
  on public.project_collaboration_needs(project_run_id,created_by)
  where status='active' and source='direct_invite';

-- Direct contexts are service-side invitation/admission constraints only. They must
-- never appear as member-marketplace opportunities through authenticated RLS.
drop policy if exists project_collaboration_needs_member_read on public.project_collaboration_needs;
create policy project_collaboration_needs_member_read
on public.project_collaboration_needs
for select
to authenticated
using (
  status='active'
  and source<>'direct_invite'
  and exists (
    select 1 from public.projects p
    where p.id=project_collaboration_needs.project_id
      and p.visibility in ('public','members')
      and p.status not in ('cancelled','completed','archived')
  )
  and exists (
    select 1 from public.project_runs r
    where r.id=project_collaboration_needs.project_run_id
      and r.project_id=project_collaboration_needs.project_id
      and r.status in ('forming','active')
  )
);

comment on index public.project_collaboration_needs_one_active_direct_context is
  'One private direct-invitation context per recruiting member and canonical run; excluded from marketplace/public discovery.';