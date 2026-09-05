# Project Experience Phase 3 — Canonical Project Model & Governance

## Status

**Implementation and Director architecture review complete. Not release-approved until the final exact head passes the repository gates.**

This phase defines the canonical project participation/capacity contract, integrates it into the existing Project Architect/Admin journeys, and makes it part of the existing publication-readiness boundary. Final exact-head CI, isolated migration/security evidence, browser/a11y evidence and regression evidence remain release-owner gates.

## Objective

Extend the existing `projects` record rather than creating a second project model. A project can now describe whether it is designed for Solo, Team, or Flexible participation while preserving every existing project ID, application relationship, Project Architect workflow, Admin governance workflow, Lab relationship, team history, and Proof relationship.

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

A database compatibility trigger keeps legacy threshold-only writers functional and canonical writes aligned with the runtime threshold. Legacy INSERT behaviour is explicitly handled so an existing writer that only supplies `team_size_threshold` seeds the new canonical fields rather than having its value overwritten by defaults.

Phase 9 may later evolve runtime formation semantics, but Phase 3 does not.

## Project Architect creation journey

The existing canonical 10-step Project Architect builder is preserved and extended rather than replaced.

Step 1 now exposes:

- Participation mode — Solo / Team / Flexible;
- Minimum participants;
- Target participants;
- Maximum participants;
- inline explanation of how the selected mode affects project formation.

Client-side readiness uses the same invariants as the server/database contract. The creation payload includes the canonical participation fields and preserves `team_size_threshold = min_team_size` for runtime compatibility.

The existing `POST /api/architect-projects` route uses `parseProjectParticipation` and `validateProjectParticipation`, persists the values on the same `projects` row, and records the participation definition in the existing project-created governance event metadata.

## Project Architect edit journey

The existing large canonical draft editor is preserved. A focused participation panel is rendered beside it rather than creating a replacement editor.

`ArchitectProjectParticipationPanel`:

- loads the same project record;
- is editable only in `draft` or `changes_requested`;
- exposes Solo / Team / Flexible plus min/target/max;
- provides an accessible status/error region;
- is responsive down to small mobile widths;
- writes through `PATCH /api/architect-projects/[id]/participation`.

The focused endpoint reuses the existing Project Architect/Admin authentication and assignment boundaries and executes `apply_project_participation_revision(...)`.

That RPC locks the same project row, validates the same invariants, updates canonical participation plus the legacy threshold, and inserts `project_participation_updated` into `project_governance_events` in one PostgreSQL transaction.

The existing full draft revision RPC remains participation-aware, so both the full canonical draft save and the focused participation edit are consistent with the same project definition.

## Publication governance

The existing `public.project_experience_readiness` view remains the single Project Experience publication-readiness contract.

Phase 3 adds critical blockers for:

- invalid/missing participation mode;
- invalid min/target/max capacity;
- divergence between `team_size_threshold` and `min_team_size`.

The existing Admin approval route already requires `publication_ready = true`, so the stronger project definition is enforced without a new approval subsystem.

## Admin governance journey

The existing Admin governance route exposes participation mode and capacity alongside the project governance record.

The existing Admin governance page now includes `AdminProjectParticipationSummary`, which shows:

- project title and governance state;
- Solo / Team / Flexible mode;
- minimum, target and maximum capacity;
- a visible warning if the legacy formation threshold diverges from the canonical minimum.

This is presentation over the same API and same `projects` record. It is not a second governance queue or second project authority.

## Atomic revision contracts

### Full canonical draft revision

`public.apply_project_experience_draft_revision(...)` keeps its existing signature and privilege boundary. It validates and writes participation/capacity inside the same transaction as the full canonical project revision and governance audit event.

### Focused participation revision

`public.apply_project_participation_revision(...)` exists for the focused Project Architect participation panel. It:

- locks the project row;
- permits only Draft / Changes Requested;
- validates Solo / Team / Flexible invariants;
- updates `participation_mode`, min/target/max and `team_size_threshold` atomically;
- records previous/current values in `project_governance_events`;
- is executable only by `service_role` and `postgres`.

Neither RPC changes project UUID, slug or downstream foreign-key ownership.

## API integration

Implemented:

- project creation POST validates and persists canonical participation;
- project draft GET exposes canonical participation fields;
- project full draft PATCH uses shared participation parsing/validation;
- focused participation GET/PATCH uses existing Architect assignment/Admin access controls;
- Admin governance GET exposes participation fields;
- Admin approval reports participation-definition blockers through the existing readiness response.

Shared application validation lives in `lib/project-participation.ts`.

## Preservation boundaries

Phase 3 does not:

- change Supabase Auth/member identity authority;
- rewrite existing project UUIDs/slugs;
- change project application ownership;
- change existing formation deadlines or cancellation rules;
- invent a new runtime Solo/Team/Flexible state machine;
- weaken resource governance;
- bypass Project Architect or Admin governance;
- alter Proof attribution ownership;
- duplicate the project table or publication/readiness service.

## Security

- canonical revision RPCs remain `SECURITY DEFINER` with a fixed `search_path`;
- public/anon/authenticated execution is revoked;
- only existing service-role/postgres callers execute the atomic mutations;
- API callers are authenticated and assignment/Admin checked before RPC execution;
- database CHECK constraints enforce participation invariants independently of client validation;
- publication remains server/database gated, not UI gated;
- project IDs and governance state are re-read server-side before mutation.

## Accessibility and responsive design

Creator controls use native select/number form controls inside the existing builder hierarchy.

The focused edit panel uses:

- a labelled section and fieldset;
- native radio controls;
- explicit min/target/max labels;
- `role="alert"` for errors;
- `aria-live="polite"` for save confirmation;
- minimum 44px input/button targets;
- 3-column desktop layout collapsing to one column on mobile;
- a 360px hardening breakpoint.

The Admin summary collapses from three columns to two and then one column, with capacity metadata remaining readable.

Exact-head browser/reflow/keyboard evidence remains a release gate and must not be represented as passed until CI produces it.

## Deterministic regression contract

`scripts/audit-project-experience-phase-3-governance.mjs` is wired into the existing blocking `audit:phase3` command while preserving the pre-existing Careers Phase 3 audit.

The audit protects:

- schema and constraints;
- legacy compatibility/backfill;
- readiness integration;
- full and focused atomic RPC boundaries;
- shared validation;
- creator controls/payload/API persistence;
- edit API/panel;
- Admin API/summary;
- continued use of the legacy threshold by the current formation runtime;
- absence of a `projects_v2` duplicate.

## Change-management / rollback

The schema change is additive. Existing projects are backfilled from a pre-existing field and retain their IDs and relationships.

If application presentation must be rolled back before Phase 3 release, the new fields may remain safely populated while old readers continue using `team_size_threshold`. Removing the fields requires a deliberate later migration and must not occur while Phase 3-aware code is deployed.

The focused participation panel/API/RPC can be reverted independently without removing the canonical columns. The full draft revision remains compatible with the same fields.

## Success-criteria status

| Criterion | Status | Evidence / note |
| --- | --- | --- |
| One canonical project record remains authoritative | PASS | Existing `public.projects`; no duplicate project table |
| Existing project IDs and relationships are preserved | PASS | Additive columns only; no ID rewrite |
| Solo projects can be defined | PASS | UI, shared validation, DB constraint |
| Team projects can be defined | PASS | UI, shared validation, DB constraint |
| Flexible projects can be defined | PASS | UI, shared validation, DB constraint |
| Min/target/max capacity is explicit | PASS | Creator, edit panel, Admin summary |
| Legacy formation threshold remains compatible | PASS | Backfill + compatibility trigger + aligned writes |
| Invalid participation cannot publish | PASS | Existing readiness/approval boundary extended |
| Project Architect creation persists participation | PASS | Existing POST route extended |
| Project Architect edit persists participation | PASS | Focused atomic RPC/API + full draft RPC |
| Admin can inspect participation before approval | PASS | Existing Admin governance API/page extended |
| Project Architect/Admin boundaries remain enforced | PASS | Existing context/assignment/Admin checks reused |
| Governance history records participation changes | PASS | Existing governance event table reused |
| Resource governance remains unchanged | PASS | No resource permission/policy weakening |
| Formation runtime behaviour remains Phase 9 scope | PASS | Runtime threshold contract preserved; no new state machine |
| Deterministic Phase 3 contract is blocking in CI | PASS | Existing `audit:phase3` now runs Careers + Project Experience audit |
| Lint/typecheck/build exact head | BLOCKED | Awaiting current exact-head CI |
| Clean isolated migrations/security | BLOCKED | Awaiting current exact-head CI |
| Browser mobile/tablet/desktop/200%/keyboard | BLOCKED | Awaiting current exact-head browser evidence |
| Application/Lab/Proof/formation regression | BLOCKED | Awaiting current exact-head release evidence |

## Release decision

**NOT APPROVED FOR RELEASE YET.**

There are no intentionally deferred Phase 3 implementation gaps in the canonical participation/governance scope. Release remains blocked only on current exact-head automated evidence and any defects that evidence identifies. Final merge/release execution belongs to the separate merge owner.
