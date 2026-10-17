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
5. Record source SHAs, CI/deployment references, before/after counts, screenshots, RLS evidence and owner sign-off in every handoff.

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
| **0 — Evidence/bootstrapping** | Repository Readiness Brief; exact source SHAs; CI/deployment; dependency graph; UI baseline; data counts | No edits; current risks and preservation approved |
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

> Read and execute AGENTS.md, CONTRIBUTING.md and docs/DEVELOPER-START-HERE.md in Mettelo/mettelo-platform. Verify exact main SHA, CI, deployment, protection, open PRs and current relevant risks. Audit public and member project flows, application/admission/run/Lab/Proof dependencies, database relationships, RLS and tests. Inspect Mettelo/project-library README, CATALOGUE_SCHEMA.md, docs/projects.json and representative master repositories. Return an evidence-based Repository Readiness Brief, dependency map, data inventory, stale claims and preservation boundaries. Do not modify files or data.

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

> Confirm Lab, Admin, run isolation, completion, Proof, kickoff notifications and repository provenance against current product boundaries. Execute exact-head CI, staging/security/browser release gates, shadow compare old/new catalogues and rehearse feature-flag rollback. Obtain owner approval before Production switch; verify resulting main SHA and deployed Production SHA. Do not treat merge alone as proof of deployment.

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
| REL-01 | Exact SHA CI/Release/Deployment evidence, real deployed SHA and exercised rollback |

## 9. Operator incident responses

| Signal | Action |
| --- | --- |
| GitHub index unavailable | Keep last approved snapshot; retry/backoff and alert owner |
| Broken/renamed master repository | Quarantine link, keep canonical project identity, notify Admin |
| Unexpected project count or deleted external ID | Pause publication, diff IDs, require editorial review |
| Schema change/invalid taxonomy | Reject changed snapshot, preserve last approved edition |
| Identity mismatch or corrupt mapping | Disable new read path, preserve operational data, verify restoration |
| CI or deployment gate red | Do not merge/deploy; investigate exact SHA and preserve last green baseline |

## 10. Required handoff per phase

Record: phase and PR; base/head/resulting main SHAs; verified CI/deployment links; user problem; acceptance criteria and protected boundaries; changed code/database files; counts before/after; screenshots and test commands; RLS/security evidence; outstanding issues; rollback; and explicit owner approval.

**Immediate action:** execute Phase 0 only. Do not start data deletion or Production catalogue cutover until crosswalk and system dependency assessment are complete.

---

**Reference:** [Platform README](../README.md) · [Features](FEATURES.md) · [Architecture](ARCHITECTURE.md) · [CI/CD](CI-CD.md) · [Open issues](OPEN-ISSUES.md) · [Project Library](https://github.com/Mettelo/project-library) · [Catalogue schema](https://github.com/Mettelo/project-library/blob/main/CATALOGUE_SCHEMA.md).
