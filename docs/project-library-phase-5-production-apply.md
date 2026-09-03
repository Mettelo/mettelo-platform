# PR #199 — Phase 5 Production APPLY

Status: IN PROGRESS
Date: 2026-09-03
Frozen workbook SHA-256: `0573929447f2e00ba09d2e41b8a1423223367ea38c3ab2ac3e0231a5cc0c65a5`

## Completed hardening

- `project_library_apply_stage_v2` is applied to production and version-controlled on PR #199.
- The import-run ledger constraint now permits the `apply_v2` audit mode used by the hardened function.
- The temporary experimental public row-transport RPC and token table have been removed.
- The cleanup migration is safe on isolated CI stacks where those experimental objects never existed.
- The immediate pre-APPLY contract remains: 300 staged projects, 117 existing UUIDs matched, 183 creates, 5 unrelated projects preserved, 0 ambiguities and 0 duplicate target mappings.

## Full-payload transport checkpoint

The Phase 5 full canonical payload is derived from the exact frozen workbook and carries the Phase 2 workbook SHA plus deterministic per-row fingerprints. Because the current connected database interface cannot accept a local workbook/file directly, the payload is being transferred to the already-existing private import workspace in bounded chunks. This transport is temporary only; it is not the canonical runtime architecture and will be removed after successful staging.

Current verified checkpoint:

- expected encoded payload size: 604,944 characters
- expected transport chunks: 51
- chunks stored: 3 / 51
- characters stored: 36,000 / 604,944
- production canonical APPLY: NOT YET EXECUTED
- production projects remain unchanged until the complete payload passes hash, count and structure validation

## Gate before APPLY

Do not execute `project_library_apply_stage_v2` until all 51 chunks are present, the reconstructed payload hashes match the frozen Phase 5 payload, decompression/JSON parsing returns exactly 300 projects, every record carries the exact workbook SHA, and the pre-APPLY identity reconciliation still returns the Phase 4 contract.

## Security note carried forward

Supabase's schema advisory flags the `private_import` tables because row-level security is disabled. Direct privilege checks performed during Phase 3 showed `anon` and `authenticated` had no schema usage and no SELECT access, while the service role retained controlled access. RLS will therefore be handled deliberately in the Phase 8 security hardening rather than being enabled automatically without policies, which could break the protected import workflow.

## Cost constraint

This work continues to use only existing Mettelo GitHub/Supabase infrastructure. No paid Supabase branch, new project, external ETL/queue/storage service or other new recurring paid infrastructure has been introduced.
