-- Phase 18C: recommendation dismissal uses UPSERT through the authenticated client.
-- ON CONFLICT DO UPDATE requires UPDATE privilege in addition to INSERT.
-- RLS continues to restrict every write to auth.uid() ownership.

grant update on table public.project_collaboration_recommendation_dismissals to authenticated;

comment on table public.project_collaboration_recommendation_dismissals is
  'Member-owned recommendation dismissals. Authenticated SELECT/INSERT/UPDATE/DELETE remains RLS-scoped to auth.uid(); dismissal affects only that member recommendation surface.';
