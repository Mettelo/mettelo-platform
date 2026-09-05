# Project Experience Phase 3 — Canonical Project Model & Governance

## Status

**Implementation in progress. Not release-approved.**

This phase defines the canonical project participation/capacity contract and makes it part of the existing publication-readiness boundary. Exact-head CI, database migration evidence, browser/a11y evidence, and final creator/Admin presentation work remain required before release approval.

## Objective

Extend the existing `projects` record rather than creating a second project model. A project must be able to describe whether it is designed for Solo, Team, or Flexible participation while preserving every existing project ID, application relationship, Project Architect workflow, Admin governance workflow, Lab relationship, team history, and Proof relationship.

Phase 3 defines project structure and governance only. Phase 9 remains responsible for runtime participation/formation behaviour.

## Architecture decisions

### Canonical project remains `public.projects`

No `_v2` table, duplicate builder, duplicate readiness service, or parallel publication workflow is introduced.

### Participation model

Canonical fields:

- `participation_mode`: `solo | team | flexible`
- `min_team_size`
- `target_team_size`
- `max_team_size`

Invariants:

- all capacity values are between 1 and 50;
- `min_team_size <= target_team_size <= max_team_size`;
- Solo is always `1 / 1 / 1`;
- Team requires `min_team_size >= 2`;
- Flexible requires `min_team_size = 1`.

### Legacy formation compatibility

`team_size_threshold` remains in place because existing formation/runtime code uses it as the minimum formation threshold. Phase 3 treats it as the compatibility representation of `min_team_size`.

Existing data is backfilled conservatively:

- historical threshold `1` → Solo `1 / 1 / 1`;
- historical threshold `>1` → Team where min/target/max initially equal that threshold.

This avoids inventing historical capacity intent.

A database compatibility trigger keeps legacy threshold-only writers functional and keeps canonical writes aligned with the runtime threshold. Phase 9 may later evolve runtime formation semantics, but Phase 3 does not.

## Publication governance

The existing `public.project_experience_readiness` view remains the single Project Experience publication-readiness contract.

Phase 3 adds critical blockers for:

- invalid/missing participation mode;
- invalid min/target/max capacity;
- divergence between `team_size_threshold` and `min_team_size`.

The existing Admin approval route already requires `publication_ready = true`, so the stronger project definition is enforced without a new approval subsystem.

## Atomic revision contract

`public.apply_project_experience_draft_revision(...)` keeps its existing signature and privilege boundary. It now validates and writes participation/capacity inside the same transaction as the canonical project revision and governance audit event.

The event metadata records the participation mode and min/target/max values; project UUID and governance history remain unchanged.

## API integration

Implemented:

- project draft GET exposes canonical participation fields;
- project draft PATCH uses shared participation parsing/validation;
- Admin governance GET exposes participation fields;
- Admin approval copy explicitly reports participation-definition blockers through the existing readiness response.

Shared application validation lives in `lib/project-participation.ts`.

## Preservation boundaries

Phase 3 must not:

- change Supabase Auth/member identity authority;
- rewrite existing project UUIDs/slugs;
- change project application ownership;
- change existing formation deadlines or cancellation rules;
- invent a new team/solo runtime state machine;
- weaken resource governance;
- bypass Project Architect or Admin governance;
- alter Proof attribution ownership.

## Security

- canonical revision remains a `SECURITY DEFINER` RPC with a fixed `search_path`;
- public/anon/authenticated execution remains revoked;
- only existing service-role/postgres callers execute the atomic revision;
- database CHECK constraints enforce the core participation invariants independently of client validation;
- publication remains server/database gated, not UI gated.

## Change-management / rollback

The schema change is additive. Existing projects are backfilled from a pre-existing field and retain their IDs and relationships.

If application surfaces must be rolled back before Phase 3 release, the new fields may remain safely populated while old readers continue using `team_size_threshold`. Removing the columns requires a deliberate later migration and must not occur while Phase 3-aware code is deployed.

## Current evidence

### Implemented

- additive canonical participation schema;
- conservative legacy backfill;
- database invariants;
- legacy/canonical threshold compatibility;
- publication-readiness integration;
- shared server validation;
- draft read integration;
- atomic revision persistence;
- Admin governance API exposure.

### Pending before release approval

- creator form controls for Solo/Team/Flexible and min/target/max;
- edit-form controls for the same contract;
- visible Admin queue participation summary;
- focused automated Phase 3 audit/tests;
- exact-head lint/typecheck/build;
- exact-head migration/security tests;
- browser tests at mobile/tablet/desktop and 200% reflow;
- keyboard and screen-reader verification;
- regression checks for applications, formation, Lab, and Proof.

## Release decision

**NOT APPROVED FOR RELEASE YET.**

The canonical backend/governance foundation is implemented, but Phase 3 remains open until the pending user-facing controls and exact-head evidence are complete.
