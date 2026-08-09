-- Cover foreign keys used by member, project, partner and event queries.
create index if not exists idx_contributions_project on public.contributions(project_id);
create index if not exists idx_contributions_verified_by on public.contributions(verified_by);
create index if not exists idx_event_registrations_user on public.event_registrations(user_id);
create index if not exists idx_partnerships_organisation on public.partnerships(organisation_id);
create index if not exists idx_partnerships_owner on public.partnerships(owner_user_id);
create index if not exists idx_project_applications_role on public.project_applications(project_role_id);
create index if not exists idx_project_members_role on public.project_members(project_role_id);
create index if not exists idx_project_members_user on public.project_members(user_id);
create index if not exists idx_project_roles_project on public.project_roles(project_id);
create index if not exists idx_projects_lead on public.projects(lead_user_id);
create index if not exists idx_saved_opportunities_opportunity on public.saved_opportunities(opportunity_id);
create index if not exists idx_spotlights_user on public.spotlights(user_id);
