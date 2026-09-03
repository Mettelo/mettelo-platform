# PR #199 — Phase 3 Private Row-Based Staging

Date: 2026-09-03
Scope: Project Library canonical import architecture
PR: #199
Branch: `codex/task-project-library-architecture`

## Purpose

Phase 3 establishes a private, row-based staging manifest for the frozen 300-project workbook without mutating canonical production project content. This intentionally replaces the retired compressed Base64/Zstandard bridge.

Frozen workbook SHA-256:
`0573929447f2e00ba09d2e41b8a1423223367ea38c3ab2ac3e0231a5cc0c65a5`

## Staging architecture

The private staging table is `private_import.project_library_stage`.

Each workbook project is represented by exactly one staging row keyed by canonical Project ID. The Phase 3 row is an integrity/identity manifest rather than a giant transport payload. Each row contains:

- phase marker (`3`)
- frozen workbook SHA-256
- deterministic SHA-256 of the complete workbook Project Library row
- canonical Project ID
- canonical project title
- canonical slug
- parsed team size
- governance classification

The complete canonical project content remains in the frozen workbook and is not committed to the public repository. Phase 4 uses this manifest for identity reconciliation; canonical production content is still untouched until the later APPLY phase.

## Validation results

Production staging validation returned:

- staged rows: 300
- distinct Project IDs: 300
- Project ID / payload key mismatches: 0
- workbook SHA mismatches: 0
- invalid row SHA-256 values: 0
- missing titles: 0
- missing slugs: 0
- invalid team sizes: 0
- missing required manifest fields: 0
- wrong phase markers: 0

Team-size distribution in staging:

- 1 person: 39 projects
- 3 people: 35 projects
- 4 people: 27 projects
- 5 people: 199 projects

Governance distribution in staging:

- GREEN: 296
- AMBER: 4

These exactly match the frozen Phase 2 workbook validation.

## Security validation

`private_import` remains inaccessible to application clients:

- `anon` schema USAGE: false
- `authenticated` schema USAGE: false
- `anon` SELECT on staging table: false
- `authenticated` SELECT on staging table: false
- `service_role` SELECT: true
- `service_role` INSERT: true

No public/member API surface was added for the staging manifest.

## Production mutation check

After staging completed:

- public projects total: 122
- projects with canonical Project ID: 0

Therefore Phase 3 did not apply canonical workbook project content to production.

## Cost constraint

Phase 3 used only the existing Supabase project and existing GitHub PR. No paid Supabase branch, new project, ETL service, external queue, paid storage add-on or new recurring infrastructure was created.

## Phase 3 success criteria

- [x] Exactly 300 private staging rows.
- [x] Exactly 300 distinct canonical Project IDs.
- [x] Every staging row is tied to the exact frozen workbook SHA-256.
- [x] Every staging row has a deterministic complete-row SHA-256 fingerprint.
- [x] Zero Project ID mismatches.
- [x] Zero malformed/missing manifest fields.
- [x] Zero missing titles/slugs.
- [x] Team sizes restricted to 1, 3, 4 or 5 and distribution matches Phase 2.
- [x] Governance distribution matches Phase 2 (296 GREEN / 4 AMBER).
- [x] Anonymous and authenticated application roles cannot use or select the private staging table.
- [x] Production remains at 122 projects / 0 canonical Project IDs.
- [x] No paid infrastructure introduced.

## Phase gate

Phase 3 is PASS. Phase 4 may perform read-only production identity reconciliation against this exact 300-row staging manifest. Any change to the workbook invalidates the Phase 2 freeze and therefore invalidates this staging manifest.
