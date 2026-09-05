# Phase 3 — Director Sign-off Review

## Review scope

This review covers Project Experience Phase 3 — Canonical Project Model & Governance across frontend, backend, Supabase/PostgreSQL, migrations, constraints, RLS/server authorization, API contracts, Project Architect creation/editing, Admin governance, publication readiness, existing project compatibility, formation compatibility, Public/Member/Discover/Lab dependencies, responsive/accessibility behaviour, regression coverage and documentation.

## Decision state

**NOT APPROVED until the documentation-inclusive exact head completes the protected release evidence.**

Implementation defects found during the Director review were fixed before this document was committed. The remaining release condition is exact-head execution evidence, not intentionally deferred Phase 3 product work.

## Related functionality reviewed

- canonical `public.projects` project identity and lifecycle fields;
- project UUID/slug preservation;
- project problem briefs, roles, deliverables, success criteria, milestones, capabilities, domains, tools and governed resources;
- Project Architect creator/reviewer boundaries;
- Admin governance approval/publication path;
- existing `project_experience_readiness` publication contract;
- existing formation runtime use of `team_size_threshold`;
- applications, memberships, Lab and Proof relationships that reference stable project IDs;
- member/public project projections;
- Supabase Auth member identity boundary;
- service-authoritative project governance APIs;
- responsive Project Architect creator/edit surfaces and Admin formation summary;
- deterministic and browser/database test coverage.

## Issues found and fixed

### 1. Legacy Phase 2 audit syntax defects exposed by Phase 3 CI

Exact-head lint exposed two malformed expressions in the stacked Phase 2 deterministic audit. Both were corrected on the Phase 3 branch so the release pipeline can validate the complete dependency stack.

### 2. Stale profile idempotency regression assertion

`audit-profile-schema-contract.mjs` still required the old direct `.upsert()` implementation although Phase 2 moved profile persistence to the atomic `save_member_profile` RPC.

The backend was verified to remain idempotent because `save_member_profile` performs `INSERT ... ON CONFLICT(id) DO UPDATE` on the canonical profile row. The regression audit was updated to assert the actual atomic contract rather than a removed implementation detail.

### 3. Missing dedicated Phase 3 browser/RLS evidence

The Phase 3 creator/edit/Admin surfaces were covered deterministically but lacked a dedicated authenticated browser/database test. `tests/project-experience-phase3-governance.spec.ts` was added to both authenticated smoke and staging suites.

The test verifies:

- creator controls at 320px, tablet and desktop;
- no horizontal overflow;
- 200% text-size reflow;
- keyboard focus on the participation selector;
- database min/target/max invariants;
- `team_size_threshold == min_team_size` compatibility;
- invalid capacity combinations are rejected by PostgreSQL;
- an ordinary member cannot directly mutate project capacity through Supabase.

## Supabase / PostgreSQL result

### Canonical schema

Phase 3 extends the existing `public.projects` row with:

- `participation_mode` (`solo | team | flexible`);
- `min_team_size`;
- `target_team_size`;
- `max_team_size`.

`team_size_threshold` remains the compatibility representation of the existing minimum formation threshold.

### Existing data compatibility

Versioned migration `20260905123000_project_experience_phase_3_canonical_project_governance.sql` backfills conservatively:

- legacy threshold `1` → Solo `1 / 1 / 1`;
- legacy threshold `>1` → Team with min/target/max equal to the historical threshold.

No existing project UUID, slug, application, membership, Lab or Proof relationship is rewritten.

### Constraints

PostgreSQL enforces:

- capacity values 1–50;
- `min_team_size <= target_team_size <= max_team_size`;
- Solo = `1 / 1 / 1`;
- Team minimum >= 2;
- Flexible minimum = 1.

A compatibility trigger synchronises legacy threshold-only writers and canonical participation writes.

### Functions

The full draft revision RPC continues to update the canonical project definition atomically and now includes participation/capacity.

Focused edit changes use `apply_project_participation_revision(...)`, which locks the same project row, restricts modification to Draft / Changes Requested, updates the canonical capacity values and writes a governance event in one transaction.

The RPC is not exposed to public/anon/authenticated clients; it is called only by the established server-authoritative Project Architect API after authenticated role/assignment checks.

### RLS / service boundary

Phase 3 does not introduce a client-side service-role workaround. Project governance was already a trusted-server responsibility: `architectContext()` authenticates the user and verifies Project Architect/Admin scope before the server obtains the privileged project-governance database client.

The dedicated Phase 3 database test now additionally proves an ordinary member cannot directly mutate project capacity.

### Indexes

No new index is required for the Phase 3 write/read pattern. Capacity is read with an already-addressed project row and publication readiness is project-scoped. If later Discover or formation phases introduce high-cardinality participation filtering, query-driven indexing belongs with those query changes rather than speculative Phase 3 indexes.

## Backend / API integrity

- Project Architect creation validates participation with the shared parser before insert.
- Creator payload persists canonical participation and legacy threshold together.
- Draft GET exposes canonical participation fields.
- Full revision PATCH preserves canonical fields for legacy clients that omit them.
- Focused participation PATCH uses the atomic RPC and preserves project identity/history.
- Admin governance GET reads the same canonical project fields.
- Admin approval still uses the existing publication-readiness contract; Phase 3 strengthens that contract rather than creating a second lifecycle.
- Existing formation runtime continues to consume `team_size_threshold`, now guaranteed to match canonical minimum capacity.

## State-transition integrity

Phase 3 defines project structure but does not implement Phase 9 runtime formation semantics.

Creator/edit participation changes are allowed only in Draft / Changes Requested. Approval/publication remains controlled by the existing governance workflow. Existing approved/public historical projects are not automatically unpublished by the migration.

## UI / UX result

### Project Architect creation

Step 1 now distinguishes:

- Participation mode;
- Minimum participants;
- Target participants;
- Maximum participants.

Solo normalises to 1/1/1. Team and Flexible constraints are explained and validated before submission.

### Project Architect edit

A focused participation panel sits on the existing edit page rather than duplicating the full project builder. It loads the same canonical project row, exposes clear save/error/success states and disables mutation outside editable governance states.

### Admin

The existing project-governance page displays a responsive canonical participation summary and highlights any threshold/minimum divergence. The existing governance queue remains authoritative.

## Mobile / accessibility result

Source review confirms responsive wrapping/stacking and labelled native form controls. Dedicated browser coverage now exercises 320px, tablet, desktop, 200% text sizing, horizontal overflow and keyboard focus. Final PASS requires successful exact-head browser execution.

## Notifications / email / analytics

Phase 3 does not introduce a new member notification or email event. Existing governance communication behaviour remains unchanged.

Participation changes are auditable through `project_governance_events`, including the canonical capacity metadata. No separate analytics store was introduced.

## Documentation / architecture result

The phase documentation records:

- canonical schema and invariants;
- compatibility/backfill policy;
- publication readiness;
- creator/edit/Admin integration;
- security boundary;
- rollback strategy;
- Phase 9 runtime boundary;
- exact release evidence required.

No `projects_v2`, second builder, second readiness service or parallel publication workflow was introduced.

## Tests required on the final exact head

The final documentation-inclusive head must complete:

- lint;
- TypeScript typecheck;
- deterministic interaction and regression audits;
- Project Experience Phase 3 governance audit;
- Admin/Lab/platform regression audits;
- production build;
- clean isolated Supabase migration startup;
- schema/constraint execution;
- authenticated database/RLS checks;
- Phase 3 creator responsive/keyboard/200% test;
- public browser regression;
- authenticated smoke/Lab regression;
- persistence/form submissions;
- protected Release Gate and Event Room contract.

## Remaining risks

There is no intentionally deferred Phase 3 implementation defect known at this review point. The only current blocker is the absence of completed exact-head release evidence after this documentation commit. Any defect exposed by that evidence must be fixed and the exact-head validation restarted.

## Sign-off

**NOT APPROVED — exact-head release evidence pending.**
