# Capability Paths V1 — Phase 5 Acceptance Contract

Phase 5 passes only when the complete import/release system proves all of the following on one exact head:

1. Workbook `.xlsx` can be parsed without uploading raw source data to a public bucket.
2. SHA-256 fingerprint identifies the source and invalidates stale approvals when the workbook changes.
3. Domain Paths Index expected counts are independently reconciled against normalized actual rows.
4. The reference v15 structure reconciles to 15 Paths, 225 placements and 117 unique project candidates.
5. Import dry-run performs no canonical project/Path writes.
6. Existing canonical projects are reused only by deterministic reviewed match; no fuzzy auto-merge.
7. Ambiguous project matches block approval.
8. New project candidates remain private Drafts after commit.
9. Imported Capability Paths remain Draft after commit.
10. Import never opens applications or publishes a Path.
11. Placement position/stage/competency/capability/prerequisite/outcome remain Path-specific.
12. One project reused by several Paths results in one canonical project ID.
13. Project application, membership, run and Proof architecture is unchanged.
14. Project quality minimum blocks missing problem statement, deliverables or success criteria.
15. Workbook HOLD/non-approved review decisions require human resolution.
16. Domains/Tools/Methods/Capabilities map only to governed existing taxonomy or are explicitly rejected/reviewed.
17. Import never silently creates taxonomy near-duplicates.
18. Green/Amber/Red/Link-only external-resource governance is recorded.
19. Amber/Red cannot be marked Store allowed.
20. Raw external dataset files are not automatically downloaded by import.
21. Source, licence, data reality, attribution and storage decision are retained.
22. Dataset subset/checksum fields exist for later controlled storage governance.
23. Every exception can be approved/rejected deliberately by Admin.
24. Batch approval is separate from dry-run.
25. Batch commit is separate from approval.
26. Production commit is disabled unless release-window configuration explicitly enables it.
27. Commit is idempotent for an already imported batch.
28. Re-running an active source fingerprint opens the existing batch rather than duplicating it.
29. A rolled-back fingerprint can be reviewed again as a new batch.
30. Rollback never deletes an existing canonical project.
31. Rollback refuses to delete a Path with member history.
32. Rollback refuses to delete a Path that is no longer Draft.
33. Import-created project with operational history is retained rather than destroyed.
34. Existing application/membership/contribution counts remain unchanged by import/rollback.
35. Admin import route is Admin-only.
36. Normal members cannot call import mutations.
37. Imported content is not visible publicly until the existing Phase 2 publish lifecycle is used.
38. Phase 3 Draft/private non-leakage remains green.
39. Phase 4 historical completed project/Verified Proof derivation works without backfill duplication.
40. Realistic-volume dry-run completes within the protected CI timeout.
41. Realistic-volume commit completes within the protected CI timeout.
42. 15 Path origins are created for a 15-Path fixture.
43. 117 project origins are created for 117 candidates, regardless of 225 placements.
44. 225 placement origins are created for a 225-placement fixture.
45. Canonical reused existing project survives rollback unchanged.
46. New import-created Draft projects are removed on safe rollback.
47. New imported Draft Paths are removed on safe rollback.
48. Import batch remains as audit evidence after rollback.
49. Phase 1 database acceptance remains green.
50. Phase 2 Admin lifecycle remains green.
51. Phase 3 public Path/privacy regression remains green.
52. Phase 4 member progress/Proof regression remains green.
53. Phase 5 deterministic architecture audit is blocking.
54. Phase 5 realistic-volume lifecycle is blocking in authenticated isolated Supabase QA.
55. lint is green.
56. typecheck is green.
57. build is green.
58. persistence is green.
59. existing project application/interest regressions are green.
60. protected Release Gate is green.

Final Phase 5 approval means the importer is production-capable but **does not itself authorise the production import**. Production import occurs only after the final integration branch is updated from current main, the consolidated PR is green/deployed, a recovery point exists, the exact workbook fingerprint is approved, and the release-window commit switch is explicitly enabled.
