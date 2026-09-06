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

### Canonical team responsibilities and active delivery roster

`resolveProjectTeamOverview()` continues to serve the shared formation/team model and now reads active `project_member_responsibilities` for the authorised run. The Lab presentation filters that shared result to active delivery participants (and completed participants only for a completed run), so pre-start `waiting` members do not appear as active Lab collaborators. Existing Phase 10 formation behaviour remains unchanged.

The Team cards present canonical `@username`, participation state, Project Lead role and delivery responsibilities without introducing another responsibility or identity source.

### Complete Lab overview context

The existing Lab home now presents authenticated, run-scoped:

- project/run status;
- active team summary;
- current milestone;
- next meeting;
- blocked tasks;
- upcoming work.

Intentional empty states are provided for no milestone, no meeting, no blockers and no upcoming tasks. Milestones and tasks remain the existing run-scoped delivery records; no parallel planning model was introduced.

### Active-run RLS boundary

`20260906030000_project_experience_phase_12_lab_access_rls.sql` adds `phase12_has_lab_access(project_id, run_id)` and restrictive RLS policies over private Lab execution tables. The restrictive layer composes with existing ownership/leadership policies, so a broad legacy project-member policy cannot independently grant Lab access.

Ordinary users require `active` or `completed` membership in the exact run and an `active`, `review` or `completed` run. Admin remains explicitly supported. The broad legacy `is_project_member()` helper is deliberately not redefined because it is also required by pre-start architecture.

Private collaboration tables (`project_discussions`, `project_resources`, `project_meetings`, `project_tasks`) and responsibility rows additionally require a concrete non-null run. Canonical project-definition rows on milestones, data sources, deliverables and source versions may remain project-level where the existing model permits them.

### Task relation integrity

`20260906030100_project_experience_phase_12_task_relation_integrity.sql` adds a PostgreSQL trigger that rejects a task whose milestone or workstream belongs to another project/run, and adds a run+milestone task index. The task API performs the same same-project/same-run milestone validation before insert so users receive a clear error before the database invariant is reached.

## Security rules

- ordinary access is authenticated;
- ordinary members require active/completed canonical membership;
- private execution rows require the exact canonical run;
- waiting, removed and non-members do not receive private Lab access;
- private collaboration rows cannot become cross-run-visible by leaving `project_run_id` null;
- private working-copy resource URLs are projected only when resource governance is `green` and internal storage policy is explicitly `permitted`;
- service-role use remains server-side and behind explicit authorization; normal member reads/writes use the authenticated Supabase client/RLS;
- task/milestone/workstream relations are enforced by both API validation and a reproducible database invariant.

## Blocking tests and evidence

`tests/project-experience-phase12-canonical-lab.spec.ts` is included in `test:regression` and protects canonical brief separation, resources, responsibilities, overview, roster filtering, active-run RLS, relation integrity, run scoping, navigation and accessibility structure.

`tests/project-experience-phase12-lab-access-e2e.spec.ts` is included in both authenticated `test:e2e:smoke` and `test:e2e:staging`. On the disposable isolated Supabase stack it verifies:

- active same-run resource/task reads;
- waiting-member denial;
- anonymous and signed-in non-member denial;
- same-project/wrong-run IDOR denial;
- cross-run task mutation denial;
- null-run private resource denial;
- immediate access revocation after membership deletion;
- PostgreSQL rejection of a cross-run task→milestone relationship.

The deterministic Lab audit suite also covers mobile navigation, 320px/device layouts, 200% zoom/reflow, overflow, keyboard/focus contracts and interaction feedback. Final sign-off still requires those checks and all exact-head GitHub release gates to complete successfully on the final commit.

## Release-review defects fixed

- corrected a stale My Projects audit that crossed the Preparing/Active section boundary while preserving the no-early-Lab product rule;
- updated stale Member Journey assertions to the current `/member/applications` lifecycle CTA and atomic `save_member_profile` RPC contract rather than reverting safer product behaviour;
- wired Phase 12 RLS E2E into the protected authenticated smoke and staging suites;
- added anonymous/non-member/wrong-run/removal security journeys;
- removed waiting members from the active Lab delivery roster;
- closed the task→milestone cross-run integrity gap at API and PostgreSQL layers;
- separated shared project-level canonical data from private run-scoped collaboration RLS.

## Remaining sign-off blockers

- complete the exact-head Mettelo CI, isolated Supabase reconstruction, authenticated browser/E2E and protected Release Gate on the final Phase 12 commit;
- resolve any exact-head failures without weakening inherited contracts;
- Phase 11 / PR #220 remains an explicit upstream dependency and is itself still marked NOT APPROVED; Phase 12 must not merge or receive final product approval ahead of that prerequisite.

## Sign-off

**NOT APPROVED.**

Do not merge Phase 12 until all Phase 12 exact-head gates are green and the Phase 11 prerequisite is approved/resolved.
