-- Project Experience Phase 5: enforce one active role-neutral interest per member/project.
--
-- The historical table-level UNIQUE(project_id,user_id,project_role_id) does not
-- prevent duplicate rows when project_role_id is NULL because PostgreSQL treats
-- NULL values as distinct for ordinary unique constraints. Phase 5 intentionally
-- submits initial interest without assigning a formal project role, so the
-- database must protect that role-neutral path against concurrent duplicate
-- submissions rather than relying only on an API pre-check.
--
-- An earlier interest-specific index also treated declined interest as permanently
-- blocking a future submission. Phase 5 treats declined and withdrawn requests as
-- terminal history, so remove that stricter legacy predicate before installing the
-- canonical active-interest invariant below.

drop index if exists public.project_applications_one_interest_per_project_user;

create unique index if not exists project_applications_one_active_interest_per_project_user
  on public.project_applications(project_id,user_id)
  where application_kind='interest'
    and status not in ('declined','withdrawn');

comment on index public.project_applications_one_active_interest_per_project_user is
  'Phase 5 invariant: one active role-neutral interest per member and project; declined or withdrawn history does not block future interest.';
