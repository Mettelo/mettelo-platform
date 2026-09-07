# Project Experience Phase 14 — Readiness Review

**Status:** STARTED / READINESS ONLY — implementation contract not yet established in-repository.

## Dependency

Phase 14 is intentionally stacked on Project Experience Phase 13 and currently begins from exact Phase 13 head:

`e286921f71f578ba267f69e6b7ee6e74caf1c1cf`

Phase 13 remains a separate draft PR and must not be treated as approved or merged merely because Phase 14 development has started.

## Current rule

Do not invent or infer a new Phase 14 product contract from adjacent implementation.

The repository currently contains Phase-specific documentation through Phase 13 but no authoritative Phase 14 objective/success-criteria document. Before any Phase 14 product mutation is accepted, the Phase 14 contract must be recovered from the approved Project Experience playbook or explicitly established and reviewed.

## Architecture that Phase 14 must preserve

Any Phase 14 implementation must extend the existing Project Experience architecture rather than create a competing system. At minimum preserve:

- canonical `projects` project definition and governance;
- canonical `project_applications` admission history;
- canonical `project_offers` offer/acceptance history;
- canonical `project_runs` run/cohort lifecycle;
- canonical `project_members` participation authority;
- Phase 10 `project_member_responsibilities` delivery ownership;
- canonical Project Lead authority through existing team-role state;
- canonical Phase 11 start-readiness and existing activation boundary;
- canonical Mettelo Lab workspace introduced/extended in Phase 12;
- existing project Chat/discussion infrastructure;
- existing project event/meeting infrastructure;
- existing project task/milestone/delivery infrastructure;
- existing notification preference, in-app notification and transactional email infrastructure;
- existing Proof/completion infrastructure already present in the product;
- existing Supabase Auth identity and RLS boundaries;
- existing public/member/Admin separation and permission-safe project resources.

## Phase 13 handoff conditions inherited by Phase 14

Phase 13 added or hardened:

- Update / Question / Blocker / Decision Chat categories;
- active-team `@username` mention validation;
- `project_mention` notification preferences;
- preference-aware event-change communication;
- visibility-aware restricted-event audience rules;
- read-only completed-project collaboration;
- blocking Phase 13 regression and authenticated E2E coverage.

Phase 14 must not regress or duplicate these capabilities.

## Mandatory readiness review before implementation

Before Phase 14 changes are considered valid, inspect and document:

1. authoritative Phase 14 objective and member/Admin journey;
2. exact existing frontend surfaces affected;
3. exact existing backend/API/service boundaries affected;
4. Supabase tables, views, functions, triggers and migrations already serving the intended capability;
5. RLS and Auth relationships;
6. foreign keys, constraints and indexes;
7. lifecycle/state-machine ownership;
8. existing notification/email event keys and preference behavior;
9. existing Lab integration points;
10. existing Proof/completion integration points;
11. public/member/Admin visibility boundaries;
12. mobile/tablet/desktop and accessibility implications;
13. analytics/audit requirements;
14. regression/E2E coverage to extend rather than replace;
15. rollback and migration ordering relative to the stacked Phase 6→13 chain.

## Non-negotiable delivery rules

- No duplicate project, run, member, task, event, Chat, Proof, notification or lifecycle system.
- No hosted-only Supabase DDL.
- All schema changes must be versioned and reproducible.
- Supabase is a mandatory sign-off area.
- Existing accepted behavior must be preserved unless Phase 14 explicitly changes the approved product contract.
- Exact-head lint, typecheck, build, blocking regression/E2E, isolated Supabase reconstruction, responsive/accessibility evidence, Event Room contract and protected Release Gate remain mandatory before approval.

## Current decision

**Phase 14 has started at readiness/architecture review only. No product behavior has been changed yet because the authoritative Phase 14 contract is not present in the repository and must not be fabricated.**
