# Capability Paths V1 — Phase 1 Foundation

## Product contract

Capability Paths add direction to Mettelo's existing project system; they do not replace projects or turn Mettelo into a course catalogue.

- **Project** — the canonical real-work record. Applications, memberships, delivery, resources and Proof continue to reference this record.
- **Capability Path** — a structured, recommended progression through canonical projects toward a professional capability/role direction.
- **Industry / Domain** — the context in which the problem exists. Continue to use `domains` + `project_domains`.
- **Capability** — a normalised technical or professional capability that a project can develop/evidence.
- **Tool** — software/technology used. Continue to use `tools` + `project_tools`.
- **Method** — analytical/technical approach. Continue to use `methods` + `project_methods`.
- **Proof** — verified evidence of contribution. It remains separate from path progress.

A path gives direction, not restriction. Projects can exist without any path, and members may work on projects outside a followed path.

## Canonical relationship model

The key relationship is many-to-many:

`capability_paths -> capability_path_projects -> projects`

A single project may therefore appear in several paths at different positions and stages while retaining one project ID, one public URL, one application flow, one delivery workspace and one Proof history.

`capability_path_projects` owns path-specific meaning:

- `position`
- `stage_id`
- `competency_focus`
- `capability_built`
- `prerequisite_project_id`
- `prerequisite_mode`
- `path_outcome`
- `placement_type`

These fields must never be copied onto `projects` as a single `career_path`, `path_stage` or `path_number` field.

## Path lifecycle

Supported states:

- `draft` — editable, not publicly readable.
- `published` — publicly discoverable.
- `archived` — retained for history, not offered as a new public path.

Archiving a path must never delete projects, applications, memberships, project runs, contributions or Proof.

## Path stages

Stages are controlled records within a path, not free-text labels on projects. Each path can define only the stages it needs. Stage order is deterministic via `position`.

Typical workbook stages can map to records such as:

- Foundation
- Applied Analytics
- Intermediate
- Advanced
- Advanced Strategy
- Capstone

The names are not hard-coded in the schema.

## Prerequisites

V1 treats prerequisites as **recommended by default**. The data model can represent `required` for future governed exceptions, but Phase 1 does not introduce a hard application blocker.

A prerequisite is path-specific. The same project can have a prerequisite in one path and no prerequisite in another.

## Capability taxonomy

`capabilities` separates:

- `technical`
- `professional`

Examples:

- SQL query design -> technical capability
- Stakeholder communication -> professional capability

Do not duplicate tools as capabilities simply because they appear in a skills column. `Python`, `Power BI`, `Tableau`, etc. remain tools when the workbook is describing technology usage. Methods such as forecasting, clustering and causal inference remain methods.

Legacy `profiles.skills[]` remains backward-compatible but is not the canonical taxonomy for the Capability Path import.

## Member relationship

`member_capability_paths` records which published paths a member follows and supports one primary path at a time. It does **not** store project completion.

Path progress will later be derived from canonical project/member/contribution records. Opening a project, following a path or applying to a project must never count as project completion.

Verified Proof remains a separate evidence state from project completion.

## Workbook mapping contract

| Workbook concept | Canonical destination | Rule |
| --- | --- | --- |
| Career Path | `capability_paths` | One stable path record per approved professional direction. |
| Target role / end capability | `capability_paths.target_role` / `target_outcome` | Avoid guaranteed employment/qualification language. |
| Project # | `capability_path_projects.position` | Path-specific; never stored on `projects`. |
| Stage | `capability_path_stages` + `stage_id` | Normalise repeated stage labels within each path. |
| Competency Focus | `capability_path_projects.competency_focus` | Required placement context. |
| Capability Built | `capability_path_projects.capability_built` | Required placement context; later can also map to normalised capabilities. |
| Prerequisite | `prerequisite_project_id` | Resolve to the canonical project inside the same path. Recommended by default. |
| Path Outcome | `capability_path_projects.path_outcome` | Path-specific outcome. |
| Industry / Domain | `domains` + `project_domains` | Map to existing canonical Mettelo domain slug; do not create spelling variants silently. |
| Technical Skills | `capabilities` + `project_capabilities` | Normalise genuine capabilities; technologies remain tools and techniques may remain methods. |
| Professional Skills | `capabilities` + `project_capabilities` | Use `capability_type='professional'`. |
| Tools | `tools` + `project_tools` | Reuse canonical tools. |
| Methods | `methods` + `project_methods` | Reuse canonical methods. |
| Project title / problem / deliverables | `projects` | One canonical project record even when reused across paths. |
| Dataset/resource | Existing project resource architecture | No bulk storage until governance classification is approved. |

## Import identity and deduplication

The workbook contains placements, not necessarily unique projects. Import must resolve projects before creating placements.

Dry-run resolution states:

- `reuse_existing` — confidently matched to an existing Mettelo project.
- `create_new` — no existing canonical project exists.
- `enrich_existing` — existing project should receive approved missing metadata/taxonomy.
- `ambiguous` — multiple possible matches; requires human resolution.
- `reject` — duplicate/invalid/unapproved record.

A second run of the same approved import must not create duplicate paths, projects, stages, capabilities or placements. Stable slugs/external import keys and canonical project IDs will be used by the Phase 5 importer.

## Resource governance gate

Phase 1 does not upload workbook documents or datasets.

Before a Phase 5 resource is stored, classify it:

- **GREEN** — approved to download/store/use under known terms.
- **AMBER** — conditions, attribution, scope or link-only handling require review.
- **RED** — do not download/store.

Retain source organisation, source URL, licence, attribution, access date, selected subset/range and governance decision.

## Security contract

- Published path metadata may be publicly read.
- Draft/archived path metadata is available only through privileged Admin/server access.
- Members may read/manage only their own followed-path relationship.
- Member path completion must not be client-authoritative.
- Existing project visibility/member access continues to control project capability visibility.
- Routine public/member reads do not require a service-role key.

## Phase 1 hard acceptance scenario

Before Phase 1 is approved, the isolated database must prove:

1. Create Path A and Path B.
2. Create stages in both.
3. Use one canonical project record.
4. Place that project in both paths at different positions/stages.
5. Confirm there is still one `projects.id`.
6. Confirm both path placements remain distinct.
7. Confirm duplicate position inside one path is rejected.
8. Confirm a stage from a different path cannot be attached to the placement.
9. Confirm an unrelated/invalid prerequisite cannot silently cross paths.
10. Confirm existing project applications/memberships/Proof tables require no migration or rewritten foreign key.

No workbook production import is approved until all five Capability Path phases have passed their own gates and the final integration branch passes the exact-head release suite.
