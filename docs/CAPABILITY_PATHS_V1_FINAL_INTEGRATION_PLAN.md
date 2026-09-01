# Capability Paths V1 — Final integration sequence

Phase 5 is the final feature phase. After its exact-head acceptance gate is green:

1. Confirm Phase 1–5 approval evidence.
2. Merge approved phase branches into `feature/capability-paths-v1-integration` in order.
3. Update the integration branch from the latest `main`.
4. Resolve drift without weakening any Phase 1–5 success criterion.
5. Run the complete exact-head suite on integration.
6. Open one consolidated PR from `feature/capability-paths-v1-integration` to `main`.
7. Merge only after protected Release Gate is green for the exact consolidated head.
8. Deploy the code/schema release with production import commit still disabled.
9. Create/record a database recovery point and approve the exact workbook SHA-256.
10. Enable `CAPABILITY_PATH_IMPORT_COMMIT_ENABLED=true` only for the controlled import window.
11. Run production dry-run against the exact workbook and reconcile every row/resource decision.
12. Commit the approved batch as Draft content.
13. Disable the import commit switch again.
14. Director/Admin reviews the imported Draft Paths/projects.
15. Publish a small reuse-heavy pilot set through the normal Phase 2 lifecycle.
16. Verify public/member/application/Proof behaviour in production.
17. Publish the remaining approved Paths.

There is no Phase 6 Capability Paths feature PR in V1. Post-release work is monitoring, content governance, issue remediation and later roadmap planning.
