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

## Initial architecture review

### Already present and to preserve

- the existing `MetteloLabNavigation`, workspace shell and responsive Lab layers;
- active/completed membership and active/review/completed run entry gate;
- canonical project definition loader (`getProjectLabCanonicalData`);
- canonical brief UI (`ProjectLabCanonicalBrief`);
- run-scoped milestone/task/resource/discussion/meeting queries;
- existing delivery, Data, Chat, events, Proof and completion panels;
- current responsive/device/accessibility Lab audits.

### Phase 12 gap fixed in the first implementation slice

The existing Team surface exposed member identity, `@username`, role and participation state but did not expose the canonical Phase 10 delivery responsibilities required by the Phase 12 contract.

Phase 12 now extends `resolveProjectTeamOverview()` to read active `project_member_responsibilities` for the visible run and displays those responsibilities on each member's existing Lab Team card. No alternate responsibility source was introduced.

## Security rules

- ordinary access must be authenticated;
- ordinary members must have active/completed canonical membership;
- the member's run must be active, review or completed;
- removed/non-members must not receive private Lab access;
- private working-copy resource URLs are projected only when resource governance is `green` and internal storage policy is explicitly `permitted`;
- run-specific execution data must stay scoped to the authorised run;
- service-role reads must remain behind explicit server-side membership/admin checks and must never become a browser-side authority.

## Testing

`tests/project-experience-phase12-canonical-lab.spec.ts` protects the first deterministic Phase 12 contract, including:

- active/completed Lab membership gate;
- canonical project-level resource/deliverable/timeline separation;
- governed private working-copy URLs;
- one canonical Project Brief component;
- canonical Phase 10 responsibility consumption and display;
- Project Lead / username / participation state preservation;
- run-scoped milestones and tasks;
- existing Lab navigation;
- accessible Lab skip/label structure;
- required brief sections.

This static contract is not sufficient for final sign-off. Phase 12 still requires authenticated RLS/E2E proof for non-member and removed-member denial, resource permission boundaries, milestone/task mutations, responsive/device coverage and exact-head release gates.

## Sign-off

**NOT APPROVED.**

Do not merge Phase 12 until all 14 acceptance criteria and the complete exact-head test matrix are green, and do not merge ahead of Phase 11 / PR #220.
