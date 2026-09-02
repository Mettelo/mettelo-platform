# Project Experience V2 — Phase 0 Resolution Record

Status: complete architecture audit for schema-affecting unknowns
Branch: `feature/project-experience-v2`
Programme: Phases 1–4 remain in one pull request and merge once after final exact-head validation.

This record closes the schema-affecting `Verify` items from `PROJECT_EXPERIENCE_V2_FIELD_GAP_MATRIX.md`. It records what is authoritative, what Project Experience V2 extends, and what is deliberately not being invented.

## 1. Canonical ownership decisions

| Concern | Authoritative system | Resolution |
| --- | --- | --- |
| Project identity/lifecycle | `projects` + existing lifecycle policy | Preserve IDs, valid slugs, project state, application state and existing history. V2 does not create a second lifecycle. |
| Problem/business context | `project_problem_briefs` | Reuse and extend with `primary_use_case`, `primary_objective`, supporting objectives, key questions and explicit scope arrays. |
| Roles and capacity | `project_roles` + role catalogue/application-role links | Preserve role IDs/openings/capacity logic. V2 adds presentation/configuration fields only. |
| Governed taxonomy | domains/tools/methods/capabilities/role-family relations | Reuse. Do not create parallel vocabularies. |
| Project resources | `project_data_sources` + `project_data_source_versions` | Reuse. `project_run_id IS NULL` is the canonical project resource definition; run-scoped rows remain execution history. |
| Deliverables | `project_deliverables` | Reuse. `project_run_id IS NULL` is the canonical expected-output definition; run-scoped rows remain execution instances. |
| Success criteria | `project_success_criteria` in V2 | Add ordered project-level criteria because the audited base only had free-text success metrics and task/deliverable acceptance criteria. Execution acceptance remains on tasks/deliverables. |
| Timeline | `project_milestones` + `project_workstreams` + `project_tasks` | Reuse. Add only project-planning presentation fields (`week_start`, `week_end`, `expected_output`) to milestones. No parallel phase/task system. |
| Proof configuration | `project_capabilities.evidence_expected` | Reuse as the project-level statement that a capability is expected to generate evidence. Capability Path placements can add progression context. This configuration never awards Proof. |
| Proof authority | reviewed `contributions` + evidence links | Preserve. Proof exists only after completed contribution and existing verification. Visibility remains separate from verification. |
| Application lifecycle | `/api/project-applications`, lifecycle policy, roles/capacity, terms | Preserve. V2 does not create a second application engine. |
| Project creation/governance | `/api/architect-projects` + Architect assignments/governance events | Extend this existing path into the canonical builder. No competing Admin create API. |
| Lab execution | existing Lab brief/resources/deliverables/workstreams/milestones/tasks/discussions/evidence | Reuse. Canonical planning data feeds Lab; operational state remains run-aware. |

## 2. Resource, licence and storage governance

The audited base already provided source URL/type, provenance, format, period, unit of observation, sensitivity, access/quality state, limitations, download policy, publish policy and version history.

The V2 canonical migration adds only missing governance facts to `project_data_sources`:

- provider name and provider URL;
- licence name and licence URL;
- required subset and approximate size;
- retention policy;
- internal storage policy;
- private internal storage URL;
- explicit resource governance status and verification actor/time;
- auditable governance review records.

These fields must never be inferred. `unknown` / `unreviewed` is a valid state and remains a publication/readiness concern rather than fabricated enrichment.

### Public/private boundary

Public Project Detail may expose a resource only when both conditions are true:

- `sensitivity = 'public'`; and
- `publish_policy = 'permitted'`.

Internal storage URLs, SharePoint links, restricted repositories, governance notes, reviewer identities, access/quality controls and other private operational details are not part of the public projection.

Canonical project-level resource/deliverable rows use `project_run_id IS NULL`. Their RLS is hardened so canonical template management does not accidentally inherit permissive run-owner behaviour. Creating/managing Project Architects and Admin retain governance authority; accepted project members receive only the member-authorized read path defined by policy.

## 3. Proof decision

No new `project_proof` table is required.

`project_capabilities` already stores:

- the project-to-capability relationship;
- importance (`core`, `supporting`, `exposure`); and
- `evidence_expected`.

That is the canonical configuration for “what this project can help someone prove”. The public/member experience can describe these as potential evidence signals. The actual Proof record remains a verified project-linked contribution, and its public/member/private visibility remains governed independently.

This prevents a serious semantic failure: configuring a project capability must never imply that a member has earned Proof.

## 4. Application settings decision

The existing application service already owns:

- authentication;
- project lifecycle eligibility;
- `applications_open`;
- application deadline;
- interest vs full application semantics;
- one active application invariant;
- role selection and role capacity;
- prior participation protection;
- participation terms/version acknowledgement;
- statement, portfolio and availability;
- persistence, notifications and Admin queue;
- withdrawal and team-place release behaviour.

Repository audit found no existing opening-date, invite-only or max-application fields. The approved V2 programme says Application Settings must **reuse the current eligibility/lifecycle engines**. Therefore Phase 0 does **not** add speculative opening-date/invite-only/max-application behaviour.

Phase 4 builder will first expose the existing authoritative settings. A new policy field is added only if an approved product requirement needs behaviour the current engine cannot express; if added, it must be enforced server-side in the existing application service rather than only presented in UI.

## 5. Project Architect persistence decision

`/api/architect-projects` remains the single creation/governance path. V2 extends it to persist the canonical project definition:

- project basics;
- structured problem/business context;
- resources and governance metadata;
- canonical deliverables;
- ordered success criteria;
- richer role configuration;
- milestone/timeline planning;
- existing project application settings.

Submission for governance review must check canonical readiness first. A draft that is incomplete or has unresolved publication-critical resource governance cannot silently become a public project.

## 6. Lab mapping decision

Mettelo Lab is not rebuilt.

Canonical project definitions are the planning/input layer; existing run-aware Lab entities remain execution/history authority. Accepted members should receive the canonical brief, authorized resources, expected deliverables, success criteria, timeline, team roles and evidence expectations without Admin re-keying the project.

When execution needs run-specific ownership/status/evidence, it continues to live on the existing run-scoped rows and task/deliverable/event systems.

## 7. Remaining non-schema work

Phase 0 architecture is complete. Remaining work is implementation and validation, not unresolved data ownership:

1. integrate the final Project Catalogue Filters V2 contract after PR #196 merges;
2. wire the advanced public Project Detail to the canonical resolver and timeline;
3. complete public responsive/accessibility/analytics regression coverage;
4. layer authenticated member/application state on the same canonical model;
5. surface canonical planning content inside Lab with existing RLS;
6. complete the Project Architect/Admin multi-step builder and publication-readiness experience;
7. prove one fixture end-to-end across public → member → application → Lab configuration;
8. run final exact-head protected CI and merge once.

## Phase 0 exit decision

**Approved to proceed with implementation.**

The schema-affecting unknowns have an explicit authority/extension decision. No duplicate lifecycle, application, Lab, resource, task, milestone or Proof system is justified. Future schema changes in Phases 1–4 must follow this record or document a new, evidence-backed product requirement.