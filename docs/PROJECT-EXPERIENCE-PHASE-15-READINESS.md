# Project Experience Phase 15 — Solo Delivery & Solo-to-Team Conversion

**Status: IMPLEMENTED / VALIDATION IN PROGRESS / NOT APPROVED**

**Stacked base:** Phase 14 branch `feature/project-experience-phase-14`

## Authoritative objective

Allow work to start without waiting for team liquidity.

Phase 15 extends the existing canonical participation, run, membership, Lab, recruitment, contribution and Proof architecture. It does not create a parallel conversion or membership system.

## Source-defined requirements

### Solo start

For Solo/Flexible projects, an accepted member must be able to progress through the existing canonical chain:

`accepted member → run → membership → Lab → project start`

### Solo UI

Where the member is currently working independently, the product communicates:

- WORKING INDEPENDENTLY;
- current project state;
- target team;
- joining availability;
- Open collaboration place, where permitted.

`Invite collaborator` remains intentionally deferred to the canonical invitation work in Phase 18. Phase 15 does not introduce a duplicate invitation system.

### Solo → Team

A later collaborator joins the **same run** through the existing governed late-joining/admission architecture. The Phase 15 control does not create a separate project or run and does not rewrite:

- tasks;
- milestones;
- chat;
- history;
- resources;
- contribution history.

### Proof integrity

Solo work may evidence Technical Delivery, Ownership, Problem Solving, Documentation and Communication. Solo delivery must not automatically infer Collaboration or Peer Leadership.

## Existing canonical architecture confirmed before change

### Phase 9 participation/run authority

`projects.participation_mode` remains the authority for `solo`, `team` and `flexible` participation.

The existing Phase 9 runtime contract establishes:

- Solo/Flexible one-person start geometry where configured;
- Team runs use the project minimum viable team size;
- target team size is planning guidance, not a start threshold;
- strict Solo database capacity is one member;
- Flexible capacity can grow toward target/max capacity;
- started-run thresholds are preserved rather than rewritten after activation;
- capacity is enforced by database guards on canonical `project_members` / Offers;
- one live membership per user/run is protected by the existing membership contract;
- active recruiting runs use the canonical `project_runs.recruitment_open` state;
- `phase9_project_run_capacity` is the authoritative occupied/reserved/available/late-join snapshot.

### Atomic run activation

The existing Phase 9 activation function revalidates project, run, capacity, readiness and lifecycle state transactionally. One-person run geometry bypasses Team-only responsibility/lead gates where canonical participation rules permit it.

### Existing late joining

Phase 6/9/10 late-admission contracts already use the existing active run and canonical membership path. Phase 15 preserves that behaviour rather than introducing a conversion-specific join path.

## Phase 15 implementation

### Member / Lab UI

The canonical `MetteloLabPanel` now renders `ProjectSoloDeliverySection` when:

- the run is active;
- exactly one active member is present;
- participation mode is Solo or Flexible.

The member sees a responsive WORKING INDEPENDENTLY panel containing:

- active independent-delivery state;
- target team size;
- joining availability;
- joining-window context;
- explicit Proof-integrity guidance.

For a Flexible one-person active run, the member may open or close a collaboration place. Strict Solo remains independent-only under the current Phase 9 maximum-capacity contract.

### Backend / API

`PATCH /api/project-joining-availability` is a narrow Phase 15 control. It does not enrol anyone. Before changing the existing run recruitment flag it revalidates:

- authenticated user;
- exact project and project run;
- active same-run membership;
- active/started run state;
- exactly one active member;
- Flexible participation mode for opening collaboration;
- `late_joining_enabled`;
- late-joining cutoff;
- authoritative Phase 9 capacity via `phase9_project_run_capacity`.

The only runtime state it changes is the existing `project_runs.recruitment_open` flag for the exact active run.

### Database / migrations

**No Phase 15 migration is introduced.**

This is intentional. The required persistence and concurrency contracts already exist in Phase 9/10. Phase 15 consumes them instead of creating duplicate schema, run state, membership state, capacity logic or invitation state.

### RLS / authorization

No RLS policy is relaxed or replaced. Lab visibility continues to use the existing run-scoped member access introduced before Phase 15. The new server route performs explicit same-project/same-run active-membership checks before a service-role mutation and constrains the update to that exact active started run.

### Proof

Phase 15 does not write `contributions`, verification state, Proof records or contribution-review events. Existing contribution submission remains explicit, run-scoped, evidence-linked and `pending` for review. Regression coverage prevents the independent-delivery control from automatically producing Collaboration or Peer Leadership evidence.

### Notifications / email / cron / analytics

No new invitation, notification, email, cron or analytics subsystem is introduced in this phase. Opening a collaboration place is recruitment availability only. Invitation delivery and invite-specific communications remain owned by the later canonical invitation phase.

## Regression coverage added

`tests/project-experience-phase15-solo-conversion.spec.ts` is included in the blocking `test:regression` suite and asserts:

1. independent Lab state only appears for active one-person Solo/Flexible runs;
2. Flexible opening reuses `phase9_project_run_capacity` and `project_runs.recruitment_open`;
3. Team-only cannot expose the independent-delivery state;
4. strict Solo cannot open collaboration under max-one capacity;
5. late-joining and capacity rules remain authoritative;
6. the Phase 15 route cannot insert runs, memberships or invitations;
7. opening availability cannot mutate tasks, milestones, chat or resources;
8. solo delivery cannot auto-write or auto-verify Proof;
9. actual same-run collaborator geometry remains covered by the existing Phase 9 isolated-Supabase E2E.

## Success criteria evidence register

| # | Criterion | Current evidence status |
|---|---|---|
| 1 | Solo start works | PASS at existing Phase 9 isolated-Supabase contract; Phase 15 preserves it |
| 2 | Flexible solo works | PASS at existing Phase 9 isolated-Supabase contract; Lab state now surfaced |
| 3 | Team-only cannot start solo | PASS at existing Phase 9 minimum-team contract + Phase 15 UI negative regression |
| 4 | Same run supports later collaborator | PASS at existing Phase 9 same-active-run E2E; Phase 15 creates no alternate run path |
| 5 | History preserved | PASS by same-run/no-rewrite contract; exact-head regression pending final gate |
| 6 | Contribution preserved | PASS by no-contribution-mutation contract; exact-head regression pending final gate |
| 7 | Tasks preserved | PASS by no-task-mutation contract; exact-head regression pending final gate |
| 8 | Milestones preserved | PASS by no-milestone-mutation contract; exact-head regression pending final gate |
| 9 | Proof integrity preserved | PASS by explicit pending-review contribution architecture + new Phase 15 regression |
| 10 | Joining rules enforced | PASS in route + Phase 9 server-authoritative policy; exact-head E2E gate pending |
| 11 | Capacity enforced | PASS via `phase9_project_run_capacity` and existing database guards; exact-head E2E gate pending |
| 12 | RLS correct | EXISTING run-scoped RLS preserved; exact-head authenticated/RLS gates pending |
| 13 | Solo-to-team E2E passes | Existing Phase 9 isolated-Supabase same-run E2E is wired into smoke/staging; fresh exact-head run pending |
| 14 | Docs updated | PASS |

No phase approval is claimed until the fresh exact-head CI and protected release evidence complete successfully.

## Validation evidence

The first implementation head `fdfd1d08441440b214a34c1f6fb6c7525ee540b9` passed:

- lint;
- typecheck;
- interaction audit;
- regression-coverage audit, including the Phase 15 blocking contract;
- project-interest-flow audit;
- Phase 0/1/2/3 audits;
- Admin audits;
- reputation/journey/platform resilience audits;
- Mettelo Lab static audit.

Production build and isolated-Supabase/browser shards were still executing when this documentation update was committed. Because this documentation commit changes the exact head, all final sign-off evidence must come from the new exact head, not from `fdfd1d...`.

## Mandatory release gates

Before Phase 15 can be signed off:

- lint;
- typecheck;
- production build;
- blocking regression;
- RLS/IDOR + database state/CRUD tests through the existing isolated-Supabase suites;
- Solo start and Flexible-solo E2E through the existing Phase 9 participation suite;
- Team-only negative-start E2E;
- same-run Solo-to-Team E2E;
- Lab/collaboration regression;
- contribution and Proof integrity regression;
- Admin/member/public/Discover regression where affected;
- mobile/tablet/desktop and 200% reflow;
- keyboard/screen-reader/accessibility checks;
- exact-head protected Release Gate;
- dependency-chain safety.

## Change-control rule

Do not mark Phase 15 APPROVED while any material gap, skipped critical test, Supabase/RLS inconsistency or dependency-chain risk remains unresolved. Any new commit invalidates prior exact-head release evidence.
