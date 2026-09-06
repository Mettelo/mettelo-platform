# Project Experience Phase 12 — Mettelo Lab Canonical Project Experience

Status: **IN PROGRESS — NOT APPROVED**

## Objective

Make Mettelo Lab the operating environment for project delivery while preserving the existing Lab architecture and consuming canonical Project Experience data.

Phase 12 must not create a second Project Brief, team system, responsibility model, milestone/task authority, resource authority, collaboration system or Proof model.

## Canonical sources to preserve

- `projects` and the canonical project-definition relations for project-level content;
- `project_problem_briefs` for approved brief detail;
- project-level `project_data_sources`, `project_deliverables`, `project_success_criteria` and `project_milestones` for canonical project intent;
- `project_runs` for the delivery cohort/run;
- `project_members` for membership, Project Lead and participation state;
- `project_member_responsibilities` for Phase 10 delivery responsibility ownership;
- run-scoped `project_milestones`, `project_tasks`, `project_deliverables`, `project_data_sources` and collaboration records for live execution;
- existing Chat, meetings/events, decisions/blockers and Proof/contribution infrastructure.

## Phase 12 acceptance contract

1. Lab consumes canonical project data.
2. Lab does not duplicate or manually recreate the Project Brief.
3. Team is displayed from the member's canonical run.
4. Canonical delivery responsibilities are displayed.
5. Resources are permission-safe.
6. Milestones work.
7. Tasks work.
8. Existing Lab navigation is preserved.
9. Non-members cannot access Lab.
10. Removed/inactive members cannot access private Lab.
11. Mobile works.
12. Accessibility passes.
13. Lab regression passes.
14. Documentation is updated.

## Implemented Phase 12 slices

### Canonical team responsibilities

The existing Team surface exposed member identity, `@username`, role and participation state but did not expose the canonical Phase 10 delivery responsibilities required by Phase 12.

`resolveProjectTeamOverview()` now reads active `project_member_responsibilities` for the authorised run and maps them by canonical user identity. The public team object does not expose the internal membership-row identifier or Member ID. Each existing Lab Team card now presents the member's responsibilities without introducing another responsibility source.

### Complete Lab overview context

The existing Lab home already exposed progress and a next action. Phase 12 now completes the playbook overview with authenticated, run-scoped reads for:

- project/run status;
- team;
- current milestone;
- next meeting;
- blocked tasks;
- upcoming work.

Milestones and tasks remain the existing run-scoped delivery records; no parallel planning model was introduced.

### Active-run RLS boundary

`20260906030000_project_experience_phase_12_lab_access_rls.sql` adds the service-safe `phase12_has_lab_access(project_id, run_id)` predicate and restrictive RLS policies over private Lab execution tables. The restrictive layer composes with existing permissive ownership/leadership policies, so those older policies cannot independently grant Lab access.

The Phase 12 predicate requires an ordinary user to have `active` or `completed` membership in the exact run and requires the run to be `active`, `review` or `completed`. Admin remains explicitly supported. The broad legacy `is_project_member()` helper is deliberately not redefined because it is also used outside the private Lab boundary.

The restrictive layer covers discussions, resources, meetings, tasks, milestones, responsibilities, data sources, data-source versions and deliverables.

## Security rules

- ordinary access must be authenticated;
- ordinary members must have active/completed canonical membership;
- the member's run must be active, review or completed;
- waiting, removed and non-members must not receive private Lab access;
- private working-copy resource URLs are projected only when resource governance is `green` and internal storage policy is explicitly `permitted`;
- run-specific execution data must stay scoped to the authorised run;
- service-role reads must remain behind explicit server-side membership/admin checks and must never become a browser-side authority.

## Testing and current evidence

`tests/project-experience-phase12-canonical-lab.spec.ts` is now included in the blocking `test:regression` command. It protects canonical brief separation, governed resources, Phase 10 responsibilities, the complete Lab overview, active-run RLS, run-scoped milestones/tasks, preserved navigation and accessibility structure.

`tests/project-experience-phase12-lab-access-e2e.spec.ts` adds disposable isolated-Supabase journeys proving:

- an active member can read same-run private resources/tasks;
- a waiting member receives no private resource/task rows;
- `phase12_has_lab_access` returns false for a waiting member;
- deleting the active membership immediately revokes private resource/task reads and the Phase 12 access predicate.

The E2E file exists but **must not be counted as blocking sign-off evidence until it is wired into and passes the protected isolated-Supabase smoke/staging command**.

Initial Phase 12 CI evidence before the RLS/overview changes:

- lint passed;
- typecheck passed;
- regression-coverage audit passed;
- persistence shard passed;
- informational journey shard passed;
- clean isolated Supabase setup passed on the earlier Phase 12 head;
- one Phase 1 identity audit failed because the first responsibility projection selected an internal membership-row identifier. That implementation was corrected rather than weakening the Phase 1 audit.

The newest exact head still requires a complete fresh release-gate result after the RLS migration and overview changes.

## Remaining sign-off work

- execute the Phase 12 RLS E2E as a protected blocking isolated-Supabase test;
- prove milestone/task mutations under active-run RLS, not only reads;
- confirm clean migration reconstruction with `20260906030000`;
- confirm responsive/device/200% zoom coverage after the overview and responsibility additions;
- confirm accessibility and Lab regression suites on the exact head;
- resolve any exact-head failures without weakening inherited contracts;
- keep Phase 12 stacked behind Phase 11 / PR #220.

## Sign-off

**NOT APPROVED.**

Do not merge Phase 12 until all 14 acceptance criteria and the complete exact-head test matrix are green, and do not merge ahead of Phase 11 / PR #220.
