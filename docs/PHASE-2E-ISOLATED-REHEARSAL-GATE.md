# Phase 2E — 50-project catalogue migration rehearsal gate

**Status:** UNVERIFIED / no production authorisation. This is a test protocol, not a claim the catalogue has been migrated.

## Baseline
Production snapshot from the prior read-only audit: 305 legacy projects, 12 applications, 10 runs, 8 memberships, four offers. The record counts and complete FK topology must be *freshly read* immediately before any migration. Every project/run UUID and child primary key must be preserved. The 50 GitHub master projects are a separate approved source; none of the old records shares its canonical external ID pattern.

## Stage environment
1. Prepare a strictly isolated Postgres/Supabase test environment from a verified restorable snapshot. Never connect test scripts to Production service-role keys.
2. Verify backup restore, record-count parity, RLS settings, Auth and referenced storage/permission behaviour. Stop if any element is missing.
3. Apply the reviewed additive private catalogue schema prototype from `docs/phase2b/isolated-catalogue-schema.sql` in isolation only after security review. This file is **not** a production migration.
4. Pin source `Mettelo/project-library/docs/projects.json` to a 40-character commit SHA and run the merged validator and offline preview, recording the digest and all warnings.
5. Load exactly 50 staged catalogue rows through the reviewed transaction generator `scripts/generate-isolated-catalogue-rehearsal.mjs` (defaults to `ROLLBACK`, requires isolated-target attestation for `COMMIT`); verify composite revision+external ID uniqueness, security, absence of partial writes and error audit.
6. Produce a full legacy lineage export (every direct FK table, 47 project-related and 37 run-related FK edges) and separate treatment plan for every one of the 305 original IDs, avoiding PII in GitHub.
7. Test a reversible *discovery projection switch* in staging: exactly 50 public and member discoverable IDs, while authorised historic project/run URLs and Lab activity remain functional. The frontend switch is implemented behind the disabled-by-default `METTELO_PHASE2_CATALOGUE_MODE=github50` flag and is not enabled in Production.
8. Execute anonymous/member/admin security checks, full affected browser regression, WCAG keyboard/mobile tests, performance baseline and all existing application/Proof journeys.
9. Roll back staging projection to old catalogue; verify invariant UUID/key sets, child counts, permissions, notification references and request success. Archive test evidence.
10. Present the evidence and owner cutover recommendation for separate manual deployment approval. No automated deploy and no production writes in this phase without that distinct authorisation.

## Fail conditions
- Missing or changed historical project/run/member/application/offer IDs or reference rows.
- Orphan FK, privilege escalation, unapproved anonymous access, accidental exposure of private/team GitHub repository links.
- Catalogue entry count !=50, missing approved master URL, duplicate IDs, source/version mismatch, partial imports, inadequate content/metadata policy.
- Failed historical navigation, Lab operations, intake, Proof or accessibility regression.
- An unproven backup restoration, absent rollback, or CI failing at the exact release SHA.

## Current execution evidence
- Phase 2A source-validator PR #287 merged.
- Phase 2B prototype PR #289 merged, but SQL is only a non-executed prototype in `docs/`.
- Phase 2C offline import-preview PR #290 merged, but no catalogue rows have been loaded.
- Phase 2D reconciliation, rollback-first import generator and pure projection PR #291 merged.\n- Phase 2 public/member 50-master integration PR #293 merged; no production flag enabled.\n- Phase 2 final UX and isolated acceptance PR #294 is pending required CI checks.\n- Read-only isolated database assertions: `docs/phase2b/isolated-catalogue-acceptance.sql`; gated browser acceptance: `npm run test:phase2-browser`.
- **No isolated restored snapshot, SQL execution, staged 50-row import or public 50-only cutover has been verified.** Thus Phase 2E remains OPEN pending separately authorised staging rehearsal, actual anonymous/member regression and manual release decision.
