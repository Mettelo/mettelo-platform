# Capability Paths Phase 5 release notes

Phase 5 adds a controlled import and release-governance layer for the approved Capability Paths workbook.

Key characteristics:

- dependency-free browser-side XLSX parsing for the governed workbook shape;
- SHA-256 source fingerprinting;
- dry-run before write;
- expected-vs-actual reconciliation;
- canonical project reuse rather than duplication;
- many-to-many Path placements;
- taxonomy exceptions require mapping/rejection;
- Green / Amber / Red / Link-only external-resource governance;
- no external binary data download during import;
- Draft-only Path/project creation;
- production commit feature switch;
- idempotent commit;
- conservative rollback;
- realistic 15 Path / 225 placement / 117 project acceptance coverage.

The feature remains stacked on Phase 4 until all exact-head gates are green. Production import is intentionally outside the Phase PR and occurs only after the consolidated V1 release is deployed and the approved release window is opened.
