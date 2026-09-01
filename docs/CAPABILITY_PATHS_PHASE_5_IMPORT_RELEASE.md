# Capability Paths V1 — Phase 5 Import & Release Governance

Phase 5 is the final build phase. It converts the approved workbook into a governed import batch, but it does **not** make Excel the long-term source of truth. After an approved commit, Mettelo Admin/database is authoritative.

## Reference workbook verified during implementation

Reference file: `Mettelo_Project_Library_AI_Ready_Domain_Sheets_v15.xlsx`

Reference SHA-256 observed during implementation: `61eda9609895c517b1fb54df2c9fb1b079dcd9c76bccaf7293ca82df0dd4006c`

Structural reconciliation from the workbook itself:

- 15 indexed Capability Path sheets
- 225 numeric Path placements
- 117 unique project codes used by those placements
- 62 of those canonical project candidates are reused by more than one Path
- the workbook contains separate Project Library, Review and Sources governance sheets

These numbers are **not hard-coded into the importer**. The Domain Paths Index declares the expected count and the parser independently counts actual normalized records. A mismatch blocks approval.

The source fingerprint is part of the batch identity. If the workbook changes after dry-run approval, it has a different fingerprint and requires a new dry run.

## Import lifecycle

1. Admin selects the approved `.xlsx` in `/admin/capability-paths/import`.
2. The workbook is parsed in the browser. The raw workbook is not uploaded to a public bucket.
3. Mettelo computes SHA-256 and normalizes Path, project, placement, taxonomy and external-resource metadata.
4. `Dry run` creates a review batch and reconciliation evidence only.
5. Existing canonical projects are reused only after an exact reviewed title match. Ambiguous matches block; the importer never fuzzy-merges automatically.
6. Every blocked/needs-change row must be resolved or explicitly rejected.
7. Every external source receives Green / Amber / Red / Link-only governance and an explicit storage decision.
8. Batch approval is separate from commit.
9. Production commit is disabled unless `CAPABILITY_PATH_IMPORT_COMMIT_ENABLED=true` during an approved release window. Local isolated Supabase is permitted for CI acceptance.
10. Commit creates Capability Paths as `draft` and new projects as `draft` + `private`. It never publishes Paths, opens applications or creates Path-specific application/membership/Proof records.
11. After commit, Admin reviews and publishes through the Phase 2 lifecycle.

## Canonical identity rules

- One workbook project code may appear in several Path placements but resolves to one canonical `projects.id` per import batch.
- Existing Mettelo projects are reused rather than reconstructed.
- Placement-only fields remain on `capability_path_projects`: position, stage, competency focus, capability built, prerequisite and Path outcome.
- Applications remain `user -> canonical project -> role`.
- Participation remains in `project_members`.
- Proof remains in canonical contribution/Proof records.
- A completed canonical project can therefore satisfy several followed Paths without duplicate work records.

## Taxonomy rules

Domains, Tools, Methods and Technical/Professional capabilities are matched only to active normalized taxonomy records.

Unknown terms become `UNMAPPED_TAXONOMY` review rows. They must be deliberately mapped/created through governed taxonomy or explicitly rejected from the import. The importer does not silently create near-duplicate taxonomy values.

## Resource governance

The importer stores resource **metadata and governance evidence**, not external binary files.

Green means storage may be considered after licence/provenance review. It does not mean automatic download.

Amber means provenance/licence/access needs manual review and cannot be marked `store_allowed`.

Red means Mettelo must not store/redistribute the item through this import.

Link-only means the external reference can be retained without copying the source.

For every source the review model preserves source organisation, URL, licence, data reality, attribution requirement, governance state and storage decision. Dataset subset/range and checksums are supported by the governance schema for any later controlled storage action.

## Content-quality rules

A project row is blocked if the import source lacks the production minimum needed for review: title, problem statement, deliverables or success criteria.

Workbook Review decisions that are not `APPROVE...` become `needs_changes`; they cannot silently enter an approved batch.

New imported projects are private Drafts specifically so a Director/Admin can improve problem framing, role definitions, deliverables, success criteria and taxonomy before publication/recruitment.

## Idempotency

The source SHA-256 is unique for active batches. Re-running the exact workbook opens the existing batch rather than creating another.

Project and Path origin tables preserve source keys and canonical IDs. The commit RPC is safe to call again for an already imported batch and returns `already_imported` instead of duplicating records.

## Rollback/recovery

Rollback is deliberately conservative:

- existing projects are never deleted;
- imported Paths can be removed only while Draft and without member Path history;
- import-created projects are removed only if they have no applications, memberships, runs or contributions;
- a project that has acquired operational history is retained and marked `rollback_retained`;
- canonical project IDs are never rewritten as a recovery strategy.

A production release must have a database recovery point plus this application-level rollback plan before commit is enabled.

## Production release checklist

Before enabling import commit:

- exact source workbook fingerprint approved;
- dry-run expected/actual counts reconcile;
- ambiguous project matches = 0;
- blocked rows = 0;
- needs-change rows = 0;
- all resource storage decisions explicit;
- Amber/Red resources are not `store_allowed`;
- database backup/recovery point recorded;
- importer exact-head CI green;
- Phase 1 DB acceptance green;
- Phase 2 Admin lifecycle green;
- Phase 3 public privacy/canonical URL green;
- Phase 4 member progress/Proof separation green;
- Phase 5 realistic-volume import/idempotency/rollback green;
- final integration branch updated from current `main`;
- consolidated exact-head Release Gate green.

## Rollout

Production sequence:

`import as Draft -> reconcile DB -> Director/Admin content review -> publish a small reuse-heavy pilot set -> verify public/member/application behaviour -> publish remaining approved Paths`

No production workbook commit is part of a Phase PR. Production import happens only after the final consolidated Capability Paths V1 PR is approved and deployed.
