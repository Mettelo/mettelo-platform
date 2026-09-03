# PR #199 — Phase 1 Baseline and Architecture Freeze

Date: 2026-09-03
Scope: Project Library canonical import architecture
PR: #199
Branch: `codex/task-project-library-architecture`

## Purpose

Phase 1 establishes the exact pre-import production baseline, freezes the implementation architecture, and removes the abandoned compressed-payload execution path before any canonical project content is applied.

## Production baseline

Connected Supabase project: `Mettelo Platform` (`aconptuqupsgznyrxhrh`).

Current runtime counts captured during Phase 1:

- Projects: 122
- Canonical projects: 0
- Project applications: 6
- Project members: 3
- Project runs: 5
- Project tasks: 6
- Project meetings: 8
- Project discussions: 10
- Contributions: 0
- Final proof submissions: 0
- Project architect assignments: 0
- Capability-path project mappings: 225
- Project deliverables: 0
- Project roles: 129
- Project data sources: 0
- Project success criteria: 0

A protected identity baseline already exists in `private_import.project_identity_baseline` for all 122 existing projects. It contains 122 identities and 0 canonical project keys, captured before the canonical import.

A protected relationship baseline already exists in `private_import.project_relationship_baseline`. It covers project-linked records including applications, project members, runs, tasks, meetings, discussions, capability-path mappings, notifications, milestones, tools, methods and other project-linked operational records. These records are preservation evidence for the later APPLY and idempotency phases.

Key recorded relationship counts include:

- project_applications: 6
- project_members: 3
- project_runs: 5
- project_tasks: 6
- project_meetings: 8
- project_discussions: 10
- capability_path_projects: 225
- capability_path_import_project_origins: 117
- capability_path_import_rows: 357
- notifications linked to projects: 62
- project_milestones: 3
- project_workstreams: 8
- project_domains: 6
- project_methods: 4
- project_tools: 2

## Architecture freeze

The canonical architecture remains:

`Reconciled workbook -> validated project records -> private row-based staging -> deterministic reconciliation -> existing Project Experience runtime tables -> public/member/Lab projections`

Rules:

1. The workbook remains the editorial source of truth.
2. Supabase remains the runtime source of truth.
3. No parallel project system or duplicate project tables are introduced.
4. Existing project UUIDs are preserved when identities reconcile.
5. Existing applications, memberships, runs, tasks, discussions, capability paths, evidence/proof and other operational relationships are preserved.
6. Canonical template rows are separate from run-scoped operational rows.
7. Restricted dataset/resource URLs remain server/DB gated and are never made public by client-side hiding alone.
8. Production APPLY remains blocked until the staged 300-project dataset passes validation and dry-run reconciliation.

## Transport decision

The compressed Base64/Zstandard bridge is retired. It failed because the compressed stream was incomplete and produced premature EOF / unterminated JSON behavior. The PR workflow that invoked that bridge has been removed.

The production `project-library-protected-loader` Edge Function has also been changed to a JWT-protected retired endpoint that returns HTTP 410 and does not decode, stage or apply project-library payloads.

The supported execution route from Phase 3 onward is row-based private staging. No giant compressed payload, Zstandard stream, Base64 transport, or unauthenticated temporary loader is part of the required import path.

## Cost constraint

This implementation must use existing Mettelo GitHub, Supabase and Vercel infrastructure. It must not create a paid Supabase branch, new paid project, third-party ETL service, external queue, paid storage add-on or other recurring paid infrastructure. If a later action would require a new paid feature, it is blocked until explicitly approved.

## Phase 1 success criteria

- [x] PR #199 remains Draft.
- [x] Production project count recorded.
- [x] Canonical project count recorded.
- [x] Existing identity baseline confirmed for all 122 projects.
- [x] Existing operational relationship baseline confirmed.
- [x] No canonical production project content applied during Phase 1.
- [x] No parallel project architecture introduced.
- [x] Row-based staging architecture frozen as the supported import route.
- [x] Compressed/Zstandard bridge removed from the PR execution path.
- [x] Temporary production loader converted to JWT-protected retired endpoint.
- [x] No new paid infrastructure introduced.

## Phase gate

The exact phase-completion branch head is recorded in the PR #199 description after the final Phase 1 commit. Phase 1 is PASS only when that head passes the relevant PR CI checks. Phase 2 must not mutate canonical production project content.
