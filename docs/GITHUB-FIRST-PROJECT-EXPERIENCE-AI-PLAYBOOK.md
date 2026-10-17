# GitHub-First Project Experience — AI Implementation Playbook

**Version:** 1.0 · **Date:** 17 October 2026 · **Status:** controlled implementation proposal; not a deployed feature  
**Platform:** [Mettelo Platform](https://github.com/Mettelo/mettelo-platform)  
**Editorial catalogue:** [Mettelo Project Library](https://github.com/Mettelo/project-library)  
**Source:** [Catalogue schema](https://github.com/Mettelo/project-library/blob/main/CATALOGUE_SCHEMA.md) · [Structured index](https://github.com/Mettelo/project-library/blob/main/docs/projects.json)

> **Operating decision:** GitHub owns the approved master *project specifications* and dataset/source guidance. Mettelo owns *operational state*: project identity and publication approval, applications, qualification, offers, membership, runs/cohorts, Lab, notifications, governance and Proof. Never erase or replace operational history merely to switch the catalogue source.

## How to run this playbook

1. Follow [AGENTS.md](../AGENTS.md), [CONTRIBUTING.md](../CONTRIBUTING.md) and [Developer Start Here](DEVELOPER-START-HERE.md) **before** any implementation. Verify exact current `main` SHA, exact-SHA CI, branch protection, open PRs, deployment, schema and relevant checks. A merge is not proof of release.
2. Execute **one phase at a time**, one focused branch/PR per coherent change, with a human approval gate. Do not combine migration, UX, publication, data deletion and unrelated refactors.
3. Before each phase write user stories, exact success criteria, preservation boundaries, RED/AMBER/GREEN risk classification, verification steps and rollback plan.
4. Change relevant docs and regression tests in the same PR. Use the repository's exact gate definitions; skipped critical tests are not green.
5. Record source SHAs, CI references, before/after counts, screenshots, RLS evidence and owner sign-off in every handoff.

## 1. Business outcomes and scope

**Goal:** Replace the platform's legacy project-*content source and discoverable catalogue presentation* with an approved, synchronised GitHub-first catalogue while preserving Mettelo's full project participation lifecycle.

The new journey is:

```text
GitHub project-library/docs/projects.json (approved metadata)
    -> schema/URL/provenance validation
    -> approved versioned cached catalogue snapshot
    -> Mettelo public Projects + authenticated Discover
    -> concise project detail (~150–250 words) + full master GitHub brief
    -> canonical Mettelo sign-in, qualification and application
    -> admission/offer/acceptance -> exact project run -> Mettelo Lab
    -> reviewed evidence, completion and Proof
```

Success means: (a) members discover consistent, accurate projects; (b) no duplicate detailed specification editing in Mettelo; (c) all eligibility/status is truthful; (d) all existing applications, project runs, Lab data and evidence remain intact; (e) GitHub failures do not erase catalogue results or interrupt canonical submission APIs.

**Out of scope without separate approval:** automatic creation of GitHub team delivery repositories, granting GitHub organisation permissions, importing repository commits as Proof, exposing private partner briefs, wholesale deletion of existing project records, re-engineering application/admission/run lifecycle, or changing unrelated website content.

## 2. Evidence baseline and architecture constraints

At playbook drafting, the project-library README describes **40 projects** in five tracks (30 cross-functional). It defines a structured JSON index in `docs/projects.json` and links to individual master repositories. Revalidate counts and schema from the exact live commit before implementation. The platform's current engineering docs describe Supabase-based `projects`, `project_roles`, `project_applications`, `project_runs`, membership and Lab workflows. Historical [PR #199](https://github.com/Mettelo/mettelo-platform/pull/199) used workbook-to-database import; [PR #274](https://github.com/Mettelo/mettelo-platform/pull/274) repaired lifecycle/readiness after imports. These are dependency evidence, not permission to remove the system.

**Canonical ownership table**

| Area | Authoritative source | Required boundary |
| --- | --- | --- |
| Master brief, business problem, deliverables, source register and repository links | Approved GitHub master repository and catalogue index | Never execute untrusted content; validate safe URLs and text |
| Public ID, searchable catalogue tags and brief summary | Validated `docs/projects.json`, after Mettelo editorial approval | Snapshot/version provenance; unique stable IDs |
| Canonical UUID, publication, real application availability, roles, admissions and offers | Existing Mettelo operational data and server policy | RLS, canonical API, idempotency and audited governance |
| Exact project run, team, milestones, tasks, Lab, notifications and Proof | Existing Mettelo operational data | Never remap historical foreign keys or cross runs |

**External identity:** map stable external `id` (for example `MTL-XF-031`) to existing `projects.id` UUID via a unique governed mapping. Never silently rewrite operational UUIDs. Store source URL, catalogue SHA/ETag, snapshot hash, sync timestamps and validation/approval status. Distinguish catalogue content status, platform publication state and dynamic application eligibility.

**Secure integration:** default to scheduled or explicitly triggered *server-only* ingestion of a version-pinned or SHA-tracked `docs/projects.json` index. Validate against a versioned schema, prohibit unsafe URLs/untrusted HTML, allowlist approved `github.com/Mettelo/...` repositories by default (exceptions require formal approval), and materialise a cached approved snapshot. No client-side GitHub API dependency for page render; no service credentials in public metadata. On GitHub outage, retain last known approved snapshot, label staleness honestly, alert operations and do not silently publish an empty set.

## 3. Catalogue contract

The existing catalogue schema lists `id`, `name`, `track`, `capabilities`, `roles`, `sector`, `brief`, `problem`, `use_case`, `data_source`, `expertise`, `team_size`, `repository`, optional `data_downloads[{label,url}]`, optional `source_guide` and `status`. Preserve backward compatibility and formally version any schema extension.

Validate: required fields, ID uniqueness, title/brief lengths, clear genuine business use case, normalised roles/sector/track, safe HTTPS destinations, GitHub repository ownership/existence, non-empty discoverability, approved downloads, no secrets, no duplicate IDs or unapproved redirects. An invalid entry must be quarantined with a deterministic report rather than taking down the catalogue.

For matching, search the full approved result set before pagination. Maintain combined filters for track, role, sector, capability and keyword; clear/active chips, URL/back navigation, sort and result counts. Current standalone project-library catalogue shows 10 results/page; platform visual pagination can differ only with documented UX rationale. Test with 200–300 representative records.

## 4. Customer journey and UX acceptance

| Stage | Expected experience | Authoritative safeguard |
| --- | --- | --- |
| Public browse | Responsive cards with title, 2–3 sentence business brief, track/sector, useful role/capability chips and one primary view action | Approved snapshot; no invented values |
| Project detail | Approximately 150–250 words of project context, goals, expected outputs, relevant skills/data, truthful status and clear **Read full brief on GitHub** link | Link provenance; operational status separated from repository label |
| Member Discover | Consistent project identity, searchable and filterable, saves/recommendations where existing behaviour supports them | Canonical eligibility and profile readiness |
| Apply | Sign-in preserving destination; existing application route and confirmation flow | Server-side status, authentication, terms, RLS, duplicate prevention |
| Admission | Existing Admin/AUTO review, offer, acceptance and formation | Never bypass exact offer/run/Lead/readiness invariants |
| Delivery | Correct link to source brief in governed Mettelo Lab | Exact-run membership, privacy, notifications, Proof and completion |

Design loading, empty, stale-source, invalid-link, closed, validation, error and success states. Retain keyboard usability, visible focus, logical semantics, WCAG 2.2 AA, at least 44px practical touch targets, reduced motion and no horizontal overflow at 320, 375, 390, 430, 768, 1024, 1280 and 1440 CSS px; test 200% zoom and screen readers. Record mobile, tablet and desktop visual evidence.

## 5. Legacy data reconciliation — NO BLANKET DELETE

**Never interpret “remove existing projects from the system” as permission for destructive database deletion.** It means moving the discoverable catalogue to the approved GitHub source and retiring superseded *presentation* entries safely.

1. Inventory production/staging counts and relationships across `projects`, roles, applications, runs, members, saves, resources, milestones, Lab, Proof and any newer related tables.
2. Produce a **read-only mapping crosswalk**: existing UUID/slug/title, external project ID candidate, match confidence, current public/draft/active state, linked applications/runs/Proof, proposed action and reviewer.
3. Classify: mapped and linked; duplicate needing manual review; historical to preserve but unpublish; active/forming to preserve; unknown and blocked.
4. Run isolated staging dry-run and orphan/invariant checks. No automatic UUID changes, cascade deletes, history rewriting or silent applications reassignment.
5. Apply only additive/backward-compatible changes. Reconciliation must be idempotent and auditable. A reversible feature flag controls public catalogue cutover.
6. Owner approves row-by-row exception policy and production migration report before any Production write.

## 6. Phased AI implementation plan

| Phase | Deliverable | Mandatory exit gate |
| --- | --- | --- |
| **0 — Evidence/bootstrapping** | Repository Readiness Brief; exact source SHAs; CI; dependency graph; UI baseline; data counts | No edits; current risks and preservation approved |
| **1 — Product contract and UX** | Approved user stories, field ownership, layout/states, journeys, acceptance tests, accessibility specification | Owner signs off before code |
| **2 — Project-library quality** | Versioned JSON schema, validator, clean taxonomy, link/ID validation, CI fixtures | All approved entries validate; exceptions reported |
| **3 — Ingest and caching** | Secure server-side import/projection, provenance, stale/failure recovery, observability | Verified failure modes; exact-head tests green |
| **4 — Canonical mapping** | Additive mapping, staging dry-run, legacy archive policy, referential checks, rollback | Owner approves crosswalk; no orphaned data |
| **5 — Public Projects UX** | Responsive catalogue cards, filters and concise detail with GitHub CTA | Browsing/SEO/accessibility/browser regressions green |
| **6 — Member Discover and Apply** | Shared project projection and existing application/offer flow intact | Full authenticated and role-based E2E green |
| **7 — Lab and Admin visibility** | Trusted links/provenance/operations while preserving run and Proof authority | Run isolation, governance, notifications and Lab regression green |
| **8 — Rollout and cleanup** | Staged shadow comparison, feature-flag cutover, exact-SHA release verification | Production checks/rollback evidence; retire dead code only after stability |

Each phase must have a focused PR, tests, documentation update, security review as appropriate and owner decision **APPROVED / APPROVED WITH CONDITIONS / REWORK / BLOCKED**.

## 7. Copy-ready AI prompts

### Phase 0 — mandatory cold start

> Read and execute AGENTS.md, CONTRIBUTING.md and docs/DEVELOPER-START-HERE.md in Mettelo/mettelo-platform. Verify exact main SHA, CI, protection, open PRs and current relevant risks. Audit public and member project flows, application/admission/run/Lab/Proof dependencies, database relationships, RLS and tests. Inspect Mettelo/project-library README, CATALOGUE_SCHEMA.md, docs/projects.json and representative master repositories. Return an evidence-based Repository Readiness Brief, dependency map, data inventory, stale claims and preservation boundaries. Do not modify files or data.

### Phase 1 — product and experience

> Act as senior product architect, UX director and backend engineer. Produce the approved GitHub-first information architecture and user journeys: public Projects, detail, authenticated Discover, sign-in, qualification, applications, admission, run and Lab. Define field ownership, concise detail content, all state/permission combinations, accessibility/mobile criteria, test cases, and documented exceptions. Preserve existing canonical operational records. Do not code until owner approval.

### Phase 2 — catalogue contract

> In Mettelo/project-library validate the actual docs/projects.json against CATALOGUE_SCHEMA.md. Propose and implement in a focused branch a versioned schema, stable unique ID policy, safe URLs, taxonomy consistency, source-download validation, deterministic fixtures and catalogue CI. Provide broken-link/invalid-entry report and exact-SHA evidence. Do not rewrite master briefs without separate approval.

### Phase 3 — ingestion

> From a verified green platform baseline, implement an approved secure server-only and cached catalogue snapshot ingestion with source SHA, schema validation, URL allowlist, provenance, observability, failure recovery and last-good snapshot. Do not depend on live GitHub rendering for applications. Keep tests/docs in PR, classify RED/AMBER/GREEN risk and provide rollback.

### Phase 4 — reconciliation

> Audit existing project UUIDs and downstream FKs. Produce read-only mappings of external IDs to canonical platform project records, with unambiguous match confidence and exception report. After approval, use only additive, idempotent staging migrations, dry-run checks, orphan prevention and rollback. Never bulk-delete Production projects or silently rewrite historical applications, runs or Proof. Seek separate Production sign-off.

### Phases 5 and 6 — UX and application

> Implement approved accessible responsive public/member discovery from the shared governed catalogue projection, retaining canonical operational application status and APIs. Use business-focused cards, ~150–250 word detail, clear external full GitHub brief and primary Apply action. Protect saved projects, qualification, applications, offers, team formation, Admin queues and notifications. Verify keyboard, WCAG AA, 200% zoom, reduced motion, 320–1440px layouts and authenticated E2E. Split into focused PRs.

### Phases 7 and 8 — operations and release

> Confirm Lab, Admin, run isolation, completion, Proof, kickoff notifications and repository provenance against current product boundaries. Execute exact-head CI, staging/security/browser release gates, shadow compare old/new catalogues and rehearse feature-flag rollback. Obtain owner approval before Production switch; verify resulting main SHA and separately, after owner-managed deployment, manually recorded Production SHA. Do not treat merge alone as proof of deployment.

## 8. Acceptance test checklist

| Code | Acceptance requirement |
| --- | --- |
| CAT-01 | All IDs unique; unsafe/malformed/unapproved records quarantined |
| CAT-02 | Public/member catalogue shares governed identity, filters, sort, pagination and count |
| CAT-03 | Last approved snapshot available through GitHub outage; no silent empty overwrite |
| CAT-04 | Repository status and real application eligibility are distinguished |
| CAT-05 | Performance/UX tested with 200–300 catalogue fixtures |
| OPS-01 | All existing applications, memberships, runs and Proof preserve UUID/FK integrity |
| OPS-02 | Closed/unpublished/private projects cannot accidentally accept applications |
| OPS-03 | Ingest and submission are repeatable/idempotent under concurrent requests |
| SEC-01 | No XSS/SSRF/unsafe redirects, secrets exposure or unauthorised Admin mutation |
| SEC-02 | Public, Member, Admin, Lead and Reviewer permissions; cross-run isolation tested |
| UX-01 | Full responsive, WCAG, keyboard, 200% zoom and all UI state matrix passed |
| REL-01 | Exact SHA CI/Release evidence, real deployed SHA and exercised rollback |

## 9. Operator incident responses

| Signal | Action |
| --- | --- |
| GitHub index unavailable | Keep last approved snapshot; retry/backoff and alert owner |
| Broken/renamed master repository | Quarantine link, keep canonical project identity, notify Admin |
| Unexpected project count or deleted external ID | Pause publication, diff IDs, require editorial review |
| Schema change/invalid taxonomy | Reject changed snapshot, preserve last approved edition |
| Identity mismatch or corrupt mapping | Disable new read path, preserve operational data, verify restoration |
| CI or regression gate red | Do not merge; investigate exact SHA and preserve last green baseline |

## 10. Required handoff per phase

Record: phase and PR; base/head/resulting main SHAs; verified CI links; user problem; acceptance criteria and protected boundaries; changed code/database files; counts before/after; screenshots and test commands; RLS/security evidence; outstanding issues; rollback; and explicit owner approval.

**Immediate action:** execute Phase 0 only. Do not start data deletion or Production catalogue cutover until crosswalk and system dependency assessment are complete.

---

**Reference:** [Platform README](../README.md) · [Features](FEATURES.md) · [Architecture](ARCHITECTURE.md) · [CI/CD](CI-CD.md) · [Open issues](OPEN-ISSUES.md) · [Project Library](https://github.com/Mettelo/project-library) · [Catalogue schema](https://github.com/Mettelo/project-library/blob/main/CATALOGUE_SCHEMA.md).

---

# V1.1 binding scope expansion — 40-project replacement, Lab simplification and repository-only handoff
**Added:** 17 October 2026. **Priority:** This section supersedes any conflicting V1.0 catalogue-scale or UI/delivery assumptions above. **Status:** owner-requested product direction; engineering/data deletion execution still requires evidence and sign-off.

## A. Revised target: 40, not the legacy 300

The target **new discoverable catalogue** is precisely the **40 approved master projects** in `Mettelo/project-library/docs/projects.json`, not the approximately 300 imported projects currently seen in Mettelo. On first release, publish only those 40 validated entries, with a deterministic mapping to governed Mettelo operational project IDs. The source set must be snapshotted at an approved Git SHA and audited for duplicates, broken repository links, incomplete briefs and unsafe datasets. Later expansion is a separate release.

**Legacy retirement:** remove the approximately 300 legacy projects from **public and member discovery** after reconciliation. The owner's longer-term intention includes replacing legacy database structures with a new clean model. This is **not permission to drop the connected Supabase project database or entire Supabase project**: auth, applications, reviews, memberships, runs, Lab and Proof have existing relationships. An engineering-designed new schema/database is allowed and now specifically in scope, but must use a staged parallel model, explicit migration/export, FK audit, access controls and verified rollback. Define which exact tables/data are disposable vs retainable in a signed **data disposition matrix**. Never wipe user accounts, active work, offers, historical proof or personally attributable contributions as collateral damage.

**Required migration recommendation:** new clean catalogue entities and explicit external-id ↔ Mettelo operational-id mapping, either within current Supabase project/schema or a deliberately isolated replacement database with dual-read/compatibility service. Choose based on measured dependency cost/security and documented comparison; do **not** assume a completely new Supabase instance is required. If owner approves full replacement, prove parity and perform controlled cutover before any destructive decommission. Existing 300 project rows can be archived in a read-only legacy area and ultimately purged **only when** there are no protected references, retention concerns or required audit trails and when backup/restore proof and explicit per-class deletion approval exist.

## B. Source-of-truth and new database model

Propose versioned tables/projections (final names determined after schema audit):
- **catalogue_project**: external_project_id (unique), catalogue_sha, title, plain-language brief, track, sector, roles, capabilities, link to master repository, data/source guide URLs, metadata checksum, editorial approval, publication flag, last successful sync and archived timestamp.
- **catalogue_source_revision / sync_run**: source commit/ETag, validated row count, per-entry errors, diff/new/removed IDs, operator, import date, approval, promotion and rollback snapshots.
- **catalogue_to_operational_project**: 1:1 or explicit reviewed mapping from public project ID to existing canonical project UUID; unique constraints and immutability once applications/runs exist.
- **operational projects/runs/applications/proof**: preserve equivalent canonical behaviour in existing protected tables or proven migrated counterparts. Do not copy the 40 briefs into multiple competing editable sources.
- **team_delivery_repository**: project_run_id, submitting member, canonical GitHub repository URL, repository owner/name, validated commit SHA or submission timestamp where feasible, review/approval status, submission history/audit fields, immutable reviewed snapshot reference. **Never confuse** the master GitHub *brief* repo with each team’s *delivery* repo.

Safeguard schema with RLS, explicit role permissions, unique indexes, exact-run access, versioned migrations, data API permissions and safe service-only operations. Preserve support for repeatable Open Project cohorts: **one master brief can have multiple runs, each with its own team delivery repository**.

## C. New page design contract

### Public `/projects` catalogue
- Exactly the approved 40 projects at initial cutover, excluding hidden/unapproved records.
- Search by keyword and filter track, role, sector and capabilities; counts, sort, pagination, loading, empty and failure states.
- Light, readable project cards: title, 2–3 line organisational problem, role/track/sector chips, verified team/commitment values only where provided, honest available/open status and **View project**.
- No legacy 300-project spillover through search, recommendations, homepage, SEO pages, sitemap or static caches; define 301 redirects for old slugs only when genuinely equivalent, else truthful archived/not-found handling.

### Public single project page
- Compact 150–250-word summary (problem, intended outcome, whom it suits and likely deliverable), key metadata, optional source-data link, visible **Read full project brief on GitHub** external CTA.
- Clear distinction between **master project specification** URL and **user/team delivery repository** URL; never imply the master repo is their submitted work.
- Correct sign-in/apply state, deadline/availability and eligibility from operational policy, not GitHub `status` alone.
- Remove duplicated long sections: exhaustive business-context prose, requirement tables, full milestone schedules, lengthy dataset notes and deliverable checklists already held in master GitHub brief.

### Signed-in member Discover and single project page
- Same 40-project identity, brief and external specification; reuse public content contract, but show relevant qualification, saved state, actual member application status and **Apply / Continue application / View team** as appropriate.
- Do not force members to re-read GitHub content already surfaced on a prior screen. Preserve sign-in return path, form inputs, role selection if relevant to existing policy, notifications and Admin review.
- Verify **all** entry points: public /projects, signed-in /member/discover, project detail, recommended, saved, capability paths, homepage cards, search, My Projects, Admin links.

### Initial Mettelo Lab project overview
- Replace the extensive canonical brief display with a **small project-context header**: project title, 2–3 sentence summary, current team/run and state, member role, master brief **Open specification on GitHub** link.
- Put **delivery repo submission** action in a prominent, separate section. Show current repository URL, validation/review state and last submission where available.
- Remove or collapse duplicative master-brief content from the initial Lab viewport: long context, key questions, scope/out-of-scope, standalone capability evidence prompts, canonical milestones/resources/source registers and repeated acceptance criteria; master details live on GitHub.
- Preserve operational Lab functionality unless specifically replaced and regression-tested: authorised team access, chat, team/roles, task execution, support and privacy, activity/audit, notifications, reviews, project completion and member Proof. Removing *displayed brief content* must not silently disable server-side readiness or policy gates.
- Produce before/after inventory of every Lab section/field with classification **remove duplicate / collapse / retain operationally / migrate validation to GitHub repo** and confirm mobile-first information hierarchy.

## D. Repository-link-only project delivery: product contract and existing code finding

**Owner's intended front-end contract:** Team submits **one GitHub delivery repository URL**, without mandatory free-text final summary or separate evidence URL. For successful team delivery, show one primary input **GitHub repository URL**, a Submit/Resubmit action and a simple status timeline. Do not ask for duplicate project brief fields. The submitted URL is the **team's work repository**, not the Mettelo master project repository.

**Verified current implementation (main inspected 17 October 2026):** `app/api/project-final-proof/route.ts` requires a **summary of at least 30 characters**; requires `evidence_url` when `project.final_proof_required`; and requires `github_url` when `project.github_repo_required`. It calls `phase19_submit_final_proof` atomically with all three fields. The RPC owns exact-run readiness/submission and may transition Open projects to completion or Partner projects into independent review. It **does not create or verify individual Proof**. Consequently a UI-only removal of summary/evidence fields is **not** sufficient and would break submissions.

**Migration steps for delivery contract:**
1. Inventory `phase19_submit_final_proof` SQL/RPC constraints, project-level `github_repo_required` and `final_proof_required` policies, phase 19 review, project deliverable approval/readiness RPCs, UI forms, member/admin pages, associated tests and notification payloads.
2. Write an explicit policy decision: one repository URL is the required user-entered final submission; non-input metadata (actor, project/run IDs, timestamp, provenance, status, review feedback and optional commit SHA) is generated server-side.
3. Validate the GitHub repo URL (scheme/owner/name, SSRF-resistant URL handling, visibility/access when feasible, reject link to master brief repo, linked run authorization, reuse/concurrency, existence, and inaccessible/private cases). **A link is submission evidence, not proof of project quality**; a reviewer may need to inspect code/results outside Mettelo.
4. Update API, database/RPC and guards in a coordinated backwards-compatible migration; safely retire the 30-character summary requirement and separate evidence URL requirement for newly governed GitHub-first projects while retaining historical submission reads.
5. For Open vs Partner projects, preserve or explicitly redesign human-review authority. Minimum recommended acceptance: valid accessible repo URL plus exact-run authorised submission, recorded immutable submission version/commit and appropriate review outcome. Do not auto-award verified individual Proof or self-approve simply because a URL exists.
6. Explicitly decide whether milestones, required deliverable approvals, final presentation and team-completion readiness remain mandatory. **Recommended first release:** retain existing independent approvals/readiness where necessary, change only the final submission's input payload and visible duplicate content; consider simplifying deeper readiness in its own approved programme after inspecting dependencies.
7. Test malformed/duplicate/foreign/private/missing/renamed repo URLs, different team submissions to same master project, resubmission, concurrent writes, user exit/revocation, review outcome, partial outage and backwards-compatible historic reads.

**Separate user/member Proof:** Phase 19 project completion and independently reviewed member Proof remain distinct. The team repository can be attached as supporting evidence for attributable contributions; it does not itself establish each member’s work or entitle everyone to Verified Proof. Audit Proof requirements before any policy change.

## E. Revised release-train with 12 gated workstreams

| Gate | Workstream | Outcome / sign-off |
| --- | --- | --- |
| 0 | Live audit, backup and dependency map | Exact-SHA readiness, current row counts, 40 source snapshot, DB graph and risk register |
| 1 | Master business rules and deletion/retention decisions | Approved disposition matrix for approximately 300 legacy projects, operational history and new 40 |
| 2 | Catalogue schema, GitHub source QA and immutable ID contract | Exactly 40 validated approved records; all master URLs legitimate |
| 3 | Target Supabase data design and migration prototype | New catalogue/mapping/sync/delivery schema, safe RLS and dual-read strategy; no Production wipe |
| 4 | Legacy→40 crosswalk, dry-run, archival and rollback | 100% classified; no broken FK, lost active runs or orphaned evidence |
| 5 | Backend snapshot sync and server API contracts | Cached, audited, resilient catalogue feed; safe degradation |
| 6 | Public catalogue and single project pages | 40 only; concise briefs and master GitHub links; full device/SEO QA |
| 7 | Signed-in Discover, detail, recommendations and application flow | Same 40; existing qualification/offer/team formation functional |
| 8 | Mettelo Lab initial screen simplification | Brief + master GitHub link; operational team tooling preserved |
| 9 | Repository-only team delivery submission / Phase 19 RPC changes | One link required; secure exact-run auth, immutable version, review and historical compatibility |
| 10 | Member Proof, completion, Admin and end-to-end regression | Project submission ≠ auto Verified Proof; team/run isolation, notification, existing review rules |
| 11 | Shadow release, controlled 40-only cutover, post-release decommission | Owner sign-off, exact SHA, restore test, no legacy spillover, rollback; destructive purge is later and separately approved |

**Gate rule:** Do not begin a later workstream until previous scope has written acceptance, focused PR/test evidence and human review. The clean-database decision is a separately approved **RED-risk** programme.

## F. Additional copy-ready AI prompts

### PROMPT — Data reset architecture and preservation assessment
> Follow repository AGENTS.md and verify live exact main/CI/deployment. I intend to replace the existing approximately 300 discoverable projects with exactly 40 vetted GitHub master projects and permit a newly designed database/schema. Before any database mutation, inspect Supabase migrations, tables, functions, RLS and FKs for projects, applications, offers, runs, memberships, Lab, submissions and Proof. Return a data disposition matrix, project-ID crosswalk, detailed risks, old/new ERD, two options (additive in-place replatform vs parallel database cutover), safe migration sequence, backup and proved restore strategy, quantitative preservation acceptance checks, owner sign-off points and rollback. Do not delete/alter Production, make an irreversible migration or expose secrets.

### PROMPT — Public and member project pages
> Implement the approved 40-source GitHub catalogue UX in separately reviewable PRs. Public cards and details and signed-in Discover/details must share one audited content projection, use a 150–250-word maximum decision brief, role/track/sector metadata, a prominent approved master GitHub specification link, accurate canonical Apply status and role-appropriate actions. Remove lengthy duplicated master project information, but preserve forms, saved/recommended projects, auth, applications, Admin visibility, lifecycle and responsive WCAG behaviour. Test no legacy 300 records leak into menus, recommendations, search, SEO and cached pages.

### PROMPT — Mettelo Lab first screen
> Inspect the actual Mettelo Lab initial project view, lib/project-lab-canonical-data.ts, its consumers, all operational Lab components and guarded APIs. Produce a field-by-field keep/collapse/remove map. Design a concise intro with project title, 2–3 sentence summary, team/run and role context, master GitHub project brief action, and separate team delivery repository action. Remove repeated project-specification content from the first screen without weakening membership, tasks, review, support, RLS, notifications, run readiness or completion. Implement only after approval with full authenticated mobile/browser regression evidence.

### PROMPT — Repository URL as the only delivery input
> Inspect app/api/project-final-proof/route.ts, phase19_submit_final_proof RPC, project final-proof UI, project completion conditions, GitHub policies, admin/partner review and individual Proof implementation/tests. The new GitHub-first project team should submit only its own delivery GitHub repository URL, not a mandatory summary or separate evidence URL. Design coordinated API/schema/RPC migrations and compatible historical reads. Require exact-run submission authority, validated distinct team repository, verifiable accessibility, idempotent resubmission and server-recorded provenance/review states. Preserve independent member Proof verification and existing security/readiness unless separately approved. Implement in one narrow governed PR after sign-off; test Open/Partner, rejection/review and all malicious/invalid/concurrent cases.

### PROMPT — 40-only cutover acceptance
> Verify the approved source snapshot has exactly 40 GitHub master projects. Stage a shadow comparison of old and new public/member/SEO/recommended catalogues. Confirm only 40 appear after feature-flag switch, all links resolve, old routes safely redirect/archive, applications and active historical runs remain accessible to their members, team delivery submissions and Proof work, and last-good snapshot survives GitHub errors. Execute full exact-head security, migration, browser, CI and release gates. Request explicit owner approval before any Production data mutation or cutover; after the owner performs a manual deployment, separately record deployed exact SHA, rollback and before/after database counts. Do not destroy the old 300-project data without a later explicit audited purge authorisation.

## G. Revised acceptance requirements

- **SRC-40:** all and only 40 approved GitHub master records present in public/member discovery on first cutover; no old legacy records leak through other surfaces.
- **DB-SAFE:** all existing operational history is classified, backed up, migratable/restorable, appropriately retained and referentially consistent.
- **PUBLIC-DETAIL / MEMBER-DETAIL:** brief-first pages with authoritative master GitHub CTA; no repeated long project specification; application status and saved/qualification flow truthful.
- **LAB-CONTEXT:** initial Lab screen shows minimal project context plus master brief link and distinct team delivery repo action; all secured operational tools work.
- **SUBMIT-ONE-URL:** one required team delivery repository URL; summary/evidence fields not mandatory for new cohort final submission; RPC/validation updated, idempotent and auditable.
- **PROOF-INDEPENDENT:** final team repository submission or run completion never automatically grants Verified Proof to individuals.
- **SECURITY:** no cross-run reads/writes, unauthorized final submission, unsafe URLs or non-approved external repository exposure.
- **RELEASE:** current exact-head CI and staging E2E pass; rollback tested; Production deletion requires separate explicit owner authorisation.


## V1.2 mandatory delivery-policy amendment — MANUAL DEPLOYMENT ONLY (17 October 2026)

**Overrides every earlier deployment-gate instruction in this document.** Mettelo's owner performs all Preview/Staging/Production deployments manually. A PR, phase or Release gate must **not** require a successful Vercel deployment, deployment status check, deployment promotion, or deployed SHA to pass. A deployment must not be triggered automatically by CI or merging this playbook. Do not disable quality, security, regression, data-integrity or exact-commit build checks.

**Before code merge / phase sign-off (automated gates):** validate exact-head lint, TypeScript, build, impacted unit/API/RLS/security/data-integrity checks, scope-appropriate browser tests, and source/provenance assertions. Record baseline database counts and frontend regression results; every unexpected change must fail. Documentation-only changes may be permitted an explicitly scoped docs-only gate, but must not silence genuine regression failures without investigation.

**After approved merge (manual operator-only process):** the owner independently chooses if/when to deploy. The owner performs any Preview/Staging/Production deployment, validates actual deployed SHA and smoke tests, and records deployment outcome **outside PR acceptance**. A manual deployment failure creates an operational incident or release hold, not an automatic retroactive PR CI failure. Provide manual rollback instructions and deployment checklists but do not execute the deployment.

**PR #281 observation:** the reported failure on previous head `382bf39d` was **Fast regression gate → Release gate → status bridge**, while **Deployment gate was skipped**. Removing deployment checks alone does not fix the reported browser regression failure. Preserve and investigate that separately; do not mark this PR green until relevant checks pass.
