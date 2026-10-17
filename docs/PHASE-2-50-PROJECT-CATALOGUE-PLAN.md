# Phase 2 — GitHub-first 50-project catalogue implementation plan

**Status:** planning only / NOT AUTHORISED FOR EXECUTION. **Prepared:** 17 October 2026. **Baseline:** `e2e123246fafc5957de7afa3c9418473fdbceccc`. **Deployment:** always owner-managed manual, never CI-triggered.

## 1. Objective and boundaries

Create the tested, non-destructive technical foundation for 50 approved GitHub master projects. The approved data comes from `Mettelo/project-library/docs/projects.json` at a pinned reviewed commit, not legacy workbook projects. Mettelo retains ownership of user identity, admission, project runs, Lab, delivery and independent Proof. This phase's deliverable is a design, isolated prototype and guarded implementation PR **only after Phase 1 exits**; no Production schema or catalogue cutover is authorised by this planning PR.

## 2. Entry gate — all required before coding

- [ ] Phase 1 preservation PR #285 reviewed and merged with required checks green.
- [ ] Phase 1 owner decision approves retention of existing operational UUIDs, 305-row data disposition, restoration plan and published 50-source list.
- [ ] GitHub index commit SHA pinned; 50/50 master repositories and required fields validated. For the ten `001–010` entries with blank `use_case` and `data_source`, record explicit field policy (approved source backfill or optional field with fallback).
- [ ] Database backup/restore test in an isolated environment passed, with security and row-level baseline.
- [ ] Confirm scope against exact current `main` SHA, open PRs, branch protection and existing Supabase migrations.

**Blocked entry means this plan remains design-only.**

## 3. Success criteria — defined before execution

| ID | Measurable pass criterion | Required evidence |
| --- | --- | --- |
| P2-01 | Exactly 50 source records, 50 unique full external IDs, accepted metadata and 50 valid master repo URLs | Pinned commit, JSON schema report, link inspection |
| P2-02 | Deterministic digest/versioned snapshot ingestion; reimport is idempotent | Test: two identical imports produce no duplicate or unexpected updates |
| P2-03 | Stable mapping from every published external ID to an approved operational UUID; no collision with legacy keys | Uniqueness/index tests, explicit mapping crosswalk |
| P2-04 | Existing 305 project rows and all protected historical relationships remain unchanged during staging/prototyping | Pre/post row counts, key-set comparison, foreign-key integrity |
| P2-05 | Auth, member applications, offers, 10 runs, 8 memberships, notifications and individual Proof continue working | Isolated RLS/RPC API regression plus historical browser tests |
| P2-06 | Import failures are fail-closed, log exact errors and preserve last-good snapshot | Broken GitHub, malformed JSON, missing field, duplicate ID, timeout tests |
| P2-07 | No public/member/SEO page prematurely changes to the new catalogue | Snapshot and route regression comparison |
| P2-08 | No service secrets in browser; all exposed tables have RLS and narrow role permissions | Security audit, policy tests and secret scan |
| P2-09 | Exact-head quality checks, targeted browser checks, migration rehearsal and rollback all pass | Test logs, SHA, manual rollback proof |
| P2-10 | Final phase gate approved with no unexplained database/frontend regression | Signed gate record, deferred cutover plan |

## 4. Proposed schema (names provisional)

```text
catalogue_revisions
  id, source_commit_sha, index_blob_sha, checksum, record_count,
  validation_status, approval_status, imported_at, promoted_at, error_summary

catalogue_projects
  external_id UNIQUE, revision_id, name, track, sector,
  brief, problem, roles, capabilities, master_repository_url,
  source_metadata JSONB, publication_status, content_checksum

catalogue_operational_mapping
  external_id UNIQUE REFERENCES catalogue_projects,
  operational_project_id UNIQUE REFERENCES projects(id),
  mapping_status, mapped_by, mapped_at

catalogue_sync_audit
  revision_id, attempt_started_at, result, inserted_count,
  updated_count, rejected_count, per_record_errors
```

The exact DB schema, referential delete actions and source metadata normalization require review of live migrations, Postgres constraints, existing `projects` lifecycle and RLS before implementation. Do **not** manufacture 50 legacy matches by ordinal/key. New operational records are permitted only with an explicit migration/approval plan, not through a blind live import.

## 5. Staged implementation units

**2A — Source contract:** verify/pin JSON source commit; define versioned schema and missing-field policy; validate stable IDs, brief, roles, track, URL and allowed status; verify 50 master READMEs and anonymous visibility where intended. Deliver validator and fixtures PR.

**2B — Isolated storage design:** review Supabase migrations, proposed normalized revision/project/mapping tables, unique keys, RLS, audit columns and rollback. Apply/test only in isolated non-Production DB after Phase 1 backup gate. Deliver SQL migration PR and database security tests.

**2C — Sync and projection service:** server-only retrieval of pinned GitHub snapshot, checksum/version checks, atomic staging/promote, previous-good fallback, non-destructive importer, explicit mapping and secure member/public read projections. Deliver isolated ingestion + replay tests.

**2D — Reconciliation dry run:** generate 305→50 historical disposition report, no automatic delete, checks for references across all declared FKs and operational code reads, review new operational ID creation. Deliver signed diff/restore proof and no-op dry-run report.

**2E — Closeout:** run exact-head lint/typecheck/build, catalogue/RLS/API/browser regression, schema verify, read-only Production count recheck and owner sign-off. No cutover, Production migration or deployment unless separately requested under a later gated release phase.

## 6. Regression matrix

| Surface or asset | Must remain invariant in Phase 2 |
| --- | --- |
| `projects`, `project_runs` and dependents | Counts, existing IDs, relationships and status |
| Applications/offers | Identical active/historical decisions and routes |
| Member Discover and public Projects | Legacy current experience until explicit switch; no 50-only premature publication |
| Mettelo Lab | Membership, permissions, task/chat/review and accessibility |
| Final Proof | Existing RPC readiness/reviewer outcomes and contribution verification |
| Auth/RLS | No broader read/update/insert access; no cross-run visibility |
| Notifications and activity | Persist, remain associated with original project/run |
| CI and deployment | Checks remain; deployment always manual and excluded from CI gate |

## 7. Exit package

Deliver the source contract, ERD/migrations for isolated execution, validation test logs, source SHA and 50-row manifest, identity crosswalk, signed data disposition, rollback exercise, before/after invariant report, security/RLS findings, exact-head CI results and a human acceptance decision.

**Stop conditions:** any unexplained delete, missing legacy membership, orphan FK, auth/RLS regression, broken public/member frontend, unapproved publish, duplicate ID, missing required source field, or attempted auto-deployment blocks progression. Future Phase 3 and public/member/Lab redesigns remain gated and separate.

## 8. Explicit instruction to implementing AI

> First reread AGENTS.md and all developer/release instructions at the exact current main SHA. Do not execute Phase 2 while Phase 1 entry criteria are incomplete. Define and record success criteria and a database/frontend preservation baseline before making changes. Make small PRs in order: source validator, isolated schema, importer, reconciliation dry run. Never drop Production data; keep existing 305 projects and protected activity stable. Never trigger or require deployment in CI. For each PR verify exact-head code, DB isolation/RLS, historical-run and public/member browser gates, report all failures, and do not mark complete until green and owner-approved.

**Review coordination:** PR #285 preservation matrix was merged before this planning PR. Revalidate branch-protected Release gate at this new exact head SHA; manual deployment remains the sole deployment path.
