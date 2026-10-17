# Phase 1 — 50-project catalogue and experience contract
**State:** proposed acceptance contract; no runtime/database writes. **Base:** 07099572bfe01c49a746fda4a4406f72a284439c. **Deployment:** manual only, not CI acceptance.

## Entry conditions and phase success criteria
1. Exactly 40 unique approved `Mettelo/project-library/docs/projects.json` entries, at a pinned source commit, have a documented validation report including master repository availability and schema/taxonomy consistency. A failed/missing entry **blocks** approval rather than silently reducing the catalogue.
2. The new project content fields and page information architecture have one authoritative definition, for public /projects, public detail, authenticated Discover/detail and Lab overview. Every metadata field has a verified origin; no invented durations, eligibility or availability.
3. A complete existing-to-new disposition report classifies all 305 current Supabase `projects` records with dependency counts and actions. **Do not delete any row** during Phase 1.
4. Confirm exact protection contract for 12 applications, 10 project runs and 8 memberships observed on 17 October 2026; refresh counts and test rows before every later migration. Map offers, notifications, tasks, resource records and Proof. Historical records remain readable to authorised users.
5. Draft a new schema with stable external catalogue IDs, immutable operational project UUIDs/run IDs, snapshot provenance and separate team delivery repository records. Compare additive in-place vs isolated replacement before selection.
6. Define accessible mobile-to-desktop wireframes and state tables, including failures, closed/eligible status, applications, member views and direct GitHub master brief links; owner approves layouts before coding.
7. Confirm the final team submission contract: **one required user-entered team GitHub delivery repository URL**; existing summary>=30, conditional evidence URL and `phase19_submit_final_proof` logic must be updated together in a later phase. Independent member Proof review is preserved.
8. Phase output consists of decision record, schema/UX contract, data disposition and fully enumerated tests. No production, migration, code change or deployment permitted; human owner gate required.

## Content ownership and application authority
**GitHub master repos** are editorial truth for complete briefs, source files, detailed outputs and source instructions. **Mettelo** owns operational project identity, publication approval, verified dynamic eligibility, applications/roles, offers, run/team membership, Lab work, submissions, governance, review and Proof. The catalogue importer retains last approved snapshot through GitHub outages.

## Page contracts
| Surface | Required presentation | Must remain working |
| --- | --- | --- |
| Public catalogue | Exactly approved 40; concise 2–3 sentence business brief, track, sector/roles, search/facets, accurate count, pagination | SEO, links, signed-out access, mobile filter navigation |
| Public detail | Concise approximately 150–250-word summary; prominent labelled **Read master brief on GitHub** link; status, role/application CTA | Correct URL validation, dynamic eligibility, sign-in return, accessible navigation |
| Member Discover and detail | Same catalogue identity, with saves, fit/readiness and application/offer status from canonical policy | Existing server-side authorisation, applications, alerts, member navigation |
| Initial Mettelo Lab | Project title, short summary, team/run identity, role, master repo link; distinct team delivery status/input | Chat, team, tasks, RLS, support, review, notifications, completion and Proof; do not remove server-side dependencies merely because long project detail UI is hidden |

## Database disposition contract
Current read-only baseline 17 October 2026: `projects=305` (302 open, 1 draft, 1 forming, 1 pilot), `project_applications=12`, `project_runs=10`, `project_members=8`, `contributions=0`. These are observations, **not approval to delete**. Each project must be classified: (1) map to new 40, (2) archive/hide in public catalogue but preserve related operational data, (3) active historical operational retain, (4) manual review, (5) eligible for later deletion only after data-retention approval and verified backup/restore. All FK references and RLS must pass.

## Delivery acceptance contract
The master's brief repository and the team's delivery repository are distinct. For new GitHub-first runs, the UI requires only the team's delivery GitHub repository URL; server derives actor/run/time/audit metadata. URL allowlist/secure validation, membership authority, resubmission, review state, historical compatibility and review/Proof separation are mandatory. A URL being submitted must **not** auto-verify an individual member contribution.

## Exit-gate checklist and evidence
- [ ] 40/40 catalogue data validated at exact approved GitHub SHA.
- [ ] Every current project and all protected dependent records classified and counted.
- [ ] New ERD, mapping strategy, rollback and retention decision approved.
- [ ] Public, member and Lab page wireframes/state matrix approved.
- [ ] One-URL submission and member Proof separation signed off.
- [ ] Risk/UX/accessibility/regression matrix documented (320, 375, 390, 430, 768, 1024, 1280, 1440 px; keyboard, 200% zoom, WCAG 2.2 AA).
- [ ] Manual owner approval recorded before Phase 2 engineering.
- [ ] Only checks appropriate to this **docs-only** change required; no automated deployment.

**Gate rule:** If any criterion is incomplete, Phase 1 remains OPEN. No destructive database operation, frontend cutover or automatic deployment can proceed.


## Authoritative scope update — 50 projects (17 October 2026)
**Supersedes all references to 40 as the initial launch count in this Phase 1 contract.** Owner has approved **50** launch projects. Pin the source to `Mettelo/project-library` main commit `65dc740ac1c6c8f88868863a6772150c1a5a12f7` and JSON blob `44477ee087cf22a7d2a9427a7613186f96a407fe` for the current audit; repin if source changes before implementation.

Verified: `docs/projects.json` contains 50 entries, 50 distinct IDs, all numeric suffixes 001–050 and nonempty `brief`, `roles`, `repository` values. URLs are structurally within the Mettelo GitHub organisation. The final five (046–050) are AI copilot/assistant projects. **Repository existence/content and access remain to be independently verified.** Ten early entries (001–010) have empty `use_case` and `data_source`; resolve by content approval or versioned schema rule, not fabrication.

**Updated success gate:** approve all 50 specific source IDs and master links; resolve mandatory metadata; classify all 305 legacy project records and preserve 12 applications, 10 runs, 8 memberships, 4 offers and all other related records; approve ERD, Lab and public/member page design, one delivery GitHub URL input with independent Proof review, rollback and security regression. Phase 1 remains open until objective evidence is complete. No automated deployment, Production deletion or code cutover authorised.


## Evidence update — complete master README and first-order protected-link audit

**Repository verification:** independently fetched `README.md` from the named GitHub repository of all 50 catalogue entries with the connected GitHub integration. **50/50 succeeded**; no missing README files. This proves authenticated connector access/readability, **not** that every repo is publicly accessible anonymously or that every master brief meets content acceptance standards. The 10 blank early `use_case`/`data_source` entries remain a separate content/schema decision.

**Read-only Supabase linkage:** cross-referenced 305 projects against applications, project runs, memberships and offers. **11 project records have at least one such operational link** and **294 have no links in these four categories**. This is *not* a declaration that the 294 are safe to delete: other FKs (tasks, notifications, Lab, resource records, governance, other history) still require a complete dependency inventory. One project can have multiple applications/runs; do not infer row totals from joined aggregates. Previously verified totals: 12 applications, 10 runs, 8 memberships, 4 offers.

**Phase 1 result:** master README existence gate is PASSED; full content/public visibility, field gaps, complete FK data-disposition crosswalk, redesigned schema, UX and signed-owner final gate remain OPEN. No database write, frontend change or deployment performed.


## Database FK topology audit — live read-only inspection, 17 October 2026

PostgreSQL `information_schema` identified **47 direct foreign-key edges to public.projects (47 distinct child tables)** and **37 direct foreign-key edges to public.project_runs (37 distinct child tables)**. These overlap and are not 84 independent tables. This is the *declared FK topology*, not yet a complete row-level disposition or an inventory of application-code references, trigger functions, views, storage objects or non-FK references.

Critical families requiring explicit preservation and before/after regression: application/offer/admission, project roles/author assignments, runs/membership, tasks/workstreams/milestones, Lab chat/collaboration, events/notifications, data source and resource governance, support, final delivery/review, contributions/Proof, saved projects, spotlight and capability paths. The source `projects` table cannot be dropped in isolation without breaking declarative referential integrity.

**Recommended Phase 1 architecture decision for formal approval:** retain current operational tables/UUIDs and separately introduce a governed catalogue projection for the 50 GitHub specs. Retire the legacy 305 records from discoverability with publication filtering after dependency tests, rather than deleting the Supabase database. A complete isolated replacement instance is a separate high-risk option requiring Auth/RLS migration, full data/relationship transfer, dual-read/rollback and proven restore. No migration SQL has been executed.

### Required row-level work to close this gate
1. Produce for **all 47 + 37 FK edges** child-row counts, counts of distinct referenced project/run IDs, orphan checks and ON DELETE behaviour, using read-only grouped aggregates.
2. Inventory triggers, RPCs, views, storage, environment/service keys and application query paths beyond declared FKs; test every protected journey.
3. Draft per-project action mapping: approved master ID, existing operational UUID, active/historical references, archive/unpublish/retain/new record action and explicit human approval.
4. Run snapshots/restore rehearsal on isolated non-Production environment before any destructive replacement work.
5. Verify new target ERD/RLS/migration on isolated staging and compare all protected entity counts/keys and permissions before cutover.

**Current gate:** the relational topology is identified but a destructive delete/new database remains BLOCKED. Existing 305 projects, 12 applications, 10 runs, 8 memberships and 4 offers must remain intact until approved, verified migration.

## Phase 1 final architecture and frontend contract (planning deliverable)

### Canonical entities and lifecycle
```
catalogue_revision (GitHub commit, imported time, approval, validation)
  -> catalogue_project (unique external ID, summary, track, skills, master_repo, publication)
  -> operational_project_mapping (external ID <-> stable project UUID)
  -> project (existing UUID, lifecycle, eligibility, capacity, application policy)
  -> project_run (run UUID, distinct cohort)
  -> project_members / offers / tasks / Lab conversations
  -> team_submission (run UUID, team GitHub delivery repository, review/version/audit)
  -> individual contribution / independently reviewed Proof
```
For initial cutover, retain original Supabase operational structures and PKs; introduce new catalogue/sync/mapping and team-delivery projection additively in later phases. Rebuilding the entire database is **not** the initial default because the existing schema serves identity, notifications, RLS, Lab, governance and history. A fresh instance is an optional separate decision after parity and restore rehearsal. Data-loss prevention is non-negotiable.

### Screen-by-screen decision contract
1. **Public catalogue:** exactly 50 approved IDs at launch, accessible keyword/search/role/sector/track filters, true operational status and paging; no hidden legacy results in search, suggestions, sitemap, SEO or cached pages.
2. **Public project detail:** title, 2–3 sentence brief, concise problem/outcome, team/role/skill tags only when evidenced, **Read full master brief on GitHub** link, canonical apply or sign-in CTA and accurate eligibility/closure.
3. **Member Discover/detail:** same catalogue ID/projection plus save/apply/status, member suitability and admin policy states. Only published and eligible projects accept submissions.
4. **My Projects:** preserve all legitimate historical and active runs independent of whether their master projects are among the new 50. An archived catalogue listing must not erase member access to active work.
5. **Mettelo Lab first screen:** title, short summary, run/team/role status, master GitHub brief CTA and distinct **team delivery repository** section. Collapse/remove duplicate canonical brief/resource/milestone specification paragraphs in UI only after classifying whether they support server readiness or run tooling.
6. **Final delivery:** one required member-entered **team's GitHub repository URL**. Do not reuse the GitHub master brief URL as submission; validate and record run/auth/revision/timestamp; preserve Open/Partner review semantics and member Proof verification.

### Source schema resolution
The 10 legacy blank `use_case` and `data_source` fields are a catalogue *quality* issue. Proposed controlled fallback: render validated `brief` and a GitHub master specification link; treat empty `use_case`/`data_source` as optional in the current v1 index with validation warnings rather than invented descriptions. Make these mandatory only after editorial backfill approval. No source GitHub repository edits in this planning phase.

### New evidence: populated dependent entities
Read-only actual table counts (not mutually exclusive project IDs): `project_deliverables=4500`, `project_data_sources=300`, `project_milestones=303`, `project_problem_briefs=300`, `project_discussions=14`, `project_tasks=6`, `project_activity_log=44`, `notifications` with project ID `=83`, `saved_projects=0`, `project_resources=0`, `project_support_cases=0`, `project_weekly_pulses=0`. A previous audit established 47 direct FK child tables of projects and 37 of runs; populated data-source, deliverable and notification rows mean a blanket project delete is not acceptable.

### Final safety gate, prerequisites for implementation
**Non-negotiable quantitative invariant:** before/after for every protected table: record counts, distinct PKs, FK orphans, active membership/run access, project application/offer invariants, server RLS and RPC tests, public/member visual routes. A legitimate 305->50 discoverability change is expected, but unexpected changes in operational rows are a failure.

**Phase 1 document deliverables:** source 50-entry count and 50 accessible master READMEs verified; FK topology and representative row counts verified; target ERD and page contracts specified; submission input/Proof boundary documented. **Still missing:** full all-84-FK per-table counts and project-by-project crosswalk, public-anonymous repository access, approved wireframes, source 001–010 editorial policy signoff, isolated backup/restore proof and end-to-end runtime regression. Therefore Phase 1 is **DOCUMENTED BUT NOT APPROVED**; do not auto-advance or apply schema/deletes to Production.

### Explicit release process
CI Release gate requires risk-appropriate lint/typecheck/build, schema/security and browser regression. **There is no deployment check and no automated deployment.** Owner alone performs manual deployment after independently approving a release.
