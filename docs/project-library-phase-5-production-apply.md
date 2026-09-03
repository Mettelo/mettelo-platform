# PR #199 — Phase 5 Production APPLY

Status: PASS
Date: 2026-09-03
Frozen workbook SHA-256: `0573929447f2e00ba09d2e41b8a1423223367ea38c3ab2ac3e0231a5cc0c65a5`
Production APPLY run: `fd997cb7-62a8-49e9-bdf6-d7b5c18ddf3f`

## Final production result

The canonical production APPLY completed successfully against the existing Project Experience architecture.

- staged projects: 300
- distinct staged Project IDs: 300
- staged rows carrying the exact frozen workbook SHA: 300
- existing projects matched and updated in place: 117
- new projects created: 183
- unrelated existing projects preserved: 5
- ambiguous matches: 0
- production projects before APPLY: 122
- production projects after APPLY: 305
- canonical project keys after APPLY: 300
- existing baseline UUIDs still present after APPLY: 122 / 122
- baseline UUIDs adopted by the canonical library: 117
- unrelated baseline UUIDs preserved outside the canonical library: 5

The import-run ledger records the exact workbook SHA and the same 117-match / 183-create / 0-ambiguity contract.

## Canonical child coverage

Direct production verification after APPLY confirms every canonical project has the required structured content:

- project problem briefs: 300 projects covered
- canonical deliverables: 4,500 rows across 300 projects
- canonical success criteria: 5,400 rows across 300 projects
- canonical roles: 1,247 rows across 300 projects
- canonical data sources: 300 rows across 300 projects
- dataset governance: 296 GREEN / 4 AMBER

No canonical project is missing its brief, deliverables, success criteria, roles or data source.

## Operational relationship preservation

The protected Phase 1 relationship baseline reconciles exactly after APPLY:

- project applications: 6 -> 6
- project members: 3 -> 3
- project runs: 5 -> 5
- project tasks: 6 -> 6
- project meetings: 8 -> 8
- project discussions: 10 -> 10
- Capability Path project relationships: 225 -> 225

No protected operational relationship count decreased, and all 122 pre-import project UUIDs remain present.

## Execution architecture and false-negative runner result

The large workbook was no longer transported through the ChatGPT conversation. The frozen workbook was placed in the existing private `mettelo-staging` repository and processed by a bounded one-shot engineering workflow in 25-project batches.

One workflow attempt reported a post-APPLY `project_deliverables` coverage of 88/300. This was a verification false negative caused by the REST result-size cap: the APPLY itself had already returned `backend_after=305`, `canonical_after=300`, `matched_existing=117`, `created_projects=183`, and `ambiguous=0`. Direct database verification immediately afterward found 4,500 canonical deliverables covering all 300 canonical projects, together with full 300-project coverage for all other canonical child structures. The false-negative workflow result is therefore retained as execution history rather than hidden.

## Security and cleanup completed in Phase 5

- `project_library_stage_payload`, `project_library_reconcile_stage` and `project_library_apply_stage_v2` execution is revoked from `public`, `anon` and `authenticated` and granted to `service_role` only.
- `anon` and `authenticated` privileges on the `private_import` schema/tables are revoked.
- temporary Phase 5 transport helper functions and the transport-token table are retired.
- guarded import RPC statement timeout is explicitly bounded at 120 seconds for this controlled import path.
- the temporary `project-library-phase5-runner` Edge Function was retired immediately after successful APPLY and now requires JWT verification and returns HTTP 410.
- Phase 8 still owns the deliberate RLS/policy review for the private import tables; Phase 5 did not blindly enable RLS without reviewed policies.

Version-controlled hardening: `supabase/migrations/20260903110000_project_library_phase5_execution_hardening.sql`.

## Cost constraint

The completed APPLY used only the existing Mettelo GitHub and Supabase infrastructure. No paid Supabase branch, new project, external ETL service, paid queue/storage service or other recurring paid infrastructure was introduced.

## Phase 5 gate

PASS. Canonical production content is now present for all 300 projects, existing identities and operational relationships are preserved, governance classification remains 296 GREEN / 4 AMBER, and temporary execution transport has been retired.

Phase 6 may now perform the mandatory second-run idempotency and canonical reconciliation checks.
