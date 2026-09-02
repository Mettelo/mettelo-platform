# Project Experience V2 — Canonical Field-Gap Matrix

Status: Phase 0 audit baseline — reconciled after Lab / Project Architect schema audit
Branch: `feature/project-experience-v2`
Base audited: `d17888a3ccfbc8c8617e942ace437132afdb74fd`
Programme rule: Phases 1–4 remain in one pull request and merge once after final exact-head validation.

## Why this document exists

Project Experience V2 must move Public Project Detail, authenticated Member Project Detail, Mettelo Lab and Admin / Project Architect creation onto one canonical project information model. This is the required pre-migration audit. No Project Experience V2 migration is finalised until the schema-affecting gaps below are resolved.

Rules:

- **Preserve** working lifecycle behaviour, identifiers, applications, membership/team history and Proof validation.
- **Extend** existing tables and services when they are already authoritative.
- **Normalize** only information that is currently fragmented, derived, overloaded or absent.
- **Do not invent** business context, source URLs, providers, licences, reuse rights, retention rights or deliverables.
- **Block publication** when critical canonical content or resource governance cannot be verified.
- **Do not create a second Lab/project-management/resource system.** Existing Lab entities are the Phase 3 execution backbone.

## Confirmed current architecture

| Surface / concern | Current implementation | Audit result | V2 direction |
| --- | --- | --- | --- |
| Public Project Detail | `app/projects/[id]/page.tsx` | Reads `projects`, roles/runs/taxonomy and public visibility; richer decision copy is separately resolved | Preserve route/public visibility; replace fragmented decision copy with canonical structured resolver + reusable advanced-detail components |
| Member Project Detail | `app/member/discover/[id]/page.tsx` + `components/MemberProjectDetailClient.tsx` | Authenticated; combines project, application, membership, save, readiness, taxonomy and role-capacity state | Preserve member lifecycle engine; consume same canonical project detail resolver with member-only state layered on top |
| Application | `app/api/project-applications/route.ts` | Existing auth, lifecycle, duplicate, role-capacity, participation, persistence and notification authority | Preserve; extend only where canonical application configuration genuinely adds missing behaviour |
| Project Architect creation | `app/api/architect-projects/route.ts` | Already creates `projects`, `project_problem_briefs`, roles and architect assignments and drives governance state | Extend this path in Phase 4; no competing create-project API |
| Project Architect governance | `project_architect_assignments`, `project_governance_events`, project governance/risk fields | Existing creating/reviewing/managing Architect model and independent-review rules | Preserve authorization/governance lifecycle; add completeness/resource-governance inputs into it |
| Problem brief | `project_problem_briefs` | Existing structured context, stakeholder, primary question, expected outcome, success metrics, constraints and ethics fields | Reuse as canonical problem/business foundation; add only missing V2 concepts |
| Lab data/resources | `project_data_sources` + versions | Existing source metadata, external URL, source type, owner, version, period, unit, format, sensitivity, access/quality state, limitations, provenance and download/publish policy | Extend this table instead of creating `project_resources`; add only source/licence/governance metadata not already represented |
| Lab workstreams | `project_workstreams` | Existing project/run workstream structure | Reuse for delivery structure where appropriate |
| Lab deliverables | `project_deliverables` | Existing typed deliverables, owner/reviewer, acceptance criteria, evidence, status, required flag and review fields | Reuse as canonical deliverable execution entity; add public/configuration-safe presentation fields only if required |
| Lab tasks | `project_tasks`, task events | Existing task execution model with priority/blocker/acceptance/review behaviour | Reuse; do not create duplicate project-task system |
| Milestones | `project_milestones` | Existing ordered project milestones with due date/status | Reuse; extend display/configuration fields minimally where needed |
| Lab access | membership helper functions + RLS | `project_problem_briefs`, data sources, deliverables, milestones, tasks and related workspace entities are membership/lead/admin protected | Preserve server/RLS authority; never rely on client hiding for private resources |
| Project discussions | project discussions/read state with links to tasks/data sources/deliverables/events | Existing collaboration graph | Preserve |
| Proof evidence | `contributions` + verification state and project membership guards | Project-linked contribution evidence already requires review; no automatic Proof award | Preserve; Project Experience V2 may expose potential evidence categories but must not bypass contribution verification |
| Rich project decision copy | `lib/project-detail-content.ts` | DB-derived fallback plus title-keyed manual overrides | Transitional compatibility only; retire manual authority once canonical DB coverage is sufficient |
| Roles | `project_roles`, role catalogue/application-role relationships | Existing capacity-sensitive application relationships | Preserve IDs, capacity and lifecycle; extend missing role configuration only |
| Governed taxonomy | project domain/tool/method/capability/role-family relations | Existing governed catalogue taxonomy | Reuse; no duplicate vocabularies |
| Profile eligibility | member readiness/project journey services | Existing application readiness rules | Preserve exactly; V2 improves clarity/return path, not eligibility policy |
| Project membership | `project_members` + runs | Existing participation authority and run/member history | Preserve |
| Saved project | `saved_projects` | Private bookmark, distinct from application | Preserve unchanged |

## Canonical project field matrix

Legend:
- **Available** — authoritative structured data exists.
- **Partial** — current structure covers part of the V2 concept or needs a presentation/governance extension.
- **Gap** — authoritative field/entity not confirmed and likely needs an extension.
- **Verify** — must be resolved before schema design for that row.

| Canonical area | Required information | Current state | Current authority | V2 action |
| --- | --- | --- | --- | --- |
| Identity | id, slug, title, summary | Available | `projects` | Preserve IDs and valid slugs |
| Identity | domain/category | Available | governed project domain relations | Reuse taxonomy |
| Identity | project type | Available | `projects.project_type` | Preserve |
| Identity | difficulty | Available | `projects.difficulty_level` | Preserve |
| Identity | lifecycle status | Available | `projects.status` | Preserve; map new completeness concepts around it rather than replacing blindly |
| Identity | governance status/risk | Available | project governance fields + governance events | Preserve |
| Identity | recruitment status | Partial | status/applications-open/deadline/lifecycle policy | Define one derived/explicit display contract without weakening current lifecycle semantics |
| Identity | duration | Available | `duration_weeks` | Preserve |
| Identity | weekly commitment | Available | `weekly_commitment` | Preserve |
| Identity | team size | Available/Partial | `team_size_threshold` + role openings | Preserve threshold; derive open capacity separately |
| Identity | delivery/location model | Partial | `location`, `location_type`, project type | Normalize labels only if V2 needs a distinct delivery-format concept |
| Identity | creator/owner | Available/Partial | `created_by_user_id`, Architect assignments | Define display/ownership semantics; do not create duplicate owner authority |
| Identity | Project Architect | Available | `project_architect_assignments` | Reuse creating/reviewing/managing roles |
| Identity | planned start/end | Available | project start/end fields used by member detail | Preserve |
| Identity | published date | Verify | publication/governance history needs exact authoritative timestamp mapping | Reuse existing timestamp/event if possible |
| Identity | last updated | Available | `projects.updated_at` | Preserve |
| Problem | problem statement | Available/Partial | `projects.problem_statement`, `project_problem_briefs.primary_question` | Establish one canonical resolver rule; avoid divergent copies |
| Problem | business context | Available/Partial | `project_problem_briefs.context` | Use as canonical context; add separate organisational/business field only if product semantics require it |
| Problem | stakeholder / who is affected | Available | `project_problem_briefs.stakeholder` | Reuse |
| Problem | primary use case | Gap/Verify | not yet confirmed as a dedicated field on audited base | Prefer a small extension to problem brief if absent |
| Problem | primary objective / expected outcome | Available/Partial | `project_problem_briefs.expected_outcome` | Reuse for outcome; add objective entity only if multiple ordered objectives are required |
| Problem | supporting objectives | Gap/Verify | not confirmed | Add structured ordered objectives only if absent |
| Problem | key questions | Partial | primary question exists; multiple ordered questions not confirmed | Preserve primary question; add ordered supporting questions if needed |
| Problem | in-scope / out-of-scope | Partial | constraints exists but is not equivalent | Add typed scope items if absent; do not overload constraints |
| Problem | ethics considerations | Available | `project_problem_briefs.ethics_considerations` | Preserve; generally member/admin detail, public only where appropriate |
| Resources | one/many resources | Available | `project_data_sources` | Reuse as canonical resource entity |
| Resources | resource title/description/type | Available/Partial | name/description/source_type | Reuse |
| Resources | source URL | Available | `external_url` HTTPS constraint | Preserve |
| Resources | source organisation/platform/original provider | Partial/Gap | source name/type/provenance exist but provider identity is not normalized | Add reusable provider relation only if audit confirms no equivalent registry |
| Resources | source logo/provider reference | Gap/Verify | not confirmed | Prefer reusable provider entity; never duplicate logos per project |
| Resources | licence + licence URL/evidence | Gap/Verify | not confirmed on `project_data_sources` | Add governed licence fields if absent; required before claiming approved reuse |
| Resources | provenance | Available | `project_data_sources.provenance` | Reuse |
| Resources | reuse/download policy | Available/Partial | `download_policy`, `publish_policy`, provenance | Map V2 governance language to existing policy first; add only non-equivalent rights fields |
| Resources | retention permission | Gap/Verify | not confirmed | Add explicit governance field only if current policy cannot represent it |
| Resources | internal/SharePoint storage permission | Gap/Verify | not confirmed | Add explicit governance field if needed; keep admin-only |
| Resources | internal stored-copy/member Lab link | Partial/Verify | data source version/workspace model exists; exact storage-link field needs mapping | Reuse existing source/version model and protect through membership RLS |
| Resources | format | Available | `data_format` | Reuse |
| Resources | size | Gap/Verify | not confirmed | Optional structured metadata if operationally useful |
| Resources | exact required file/table | Gap/Verify | not confirmed | Add requirement metadata if absent |
| Resources | date range/sample | Partial | `data_period` exists; sample/range semantics may need extension | Reuse `data_period`; add exact subset metadata only where needed |
| Resources | unit of observation | Available | `unit_of_observation` | Reuse |
| Resources | sensitivity / classification | Available/Partial | sensitivity + risk classification | Map to V2 data-classification language |
| Resources | access/quality status | Available | `access_status`, `quality_status` | Reuse |
| Resources | known limitations | Available | `known_limitations` | Reuse |
| Resources | last verified | Available/Partial | `last_checked_on` | Reuse; reviewer/audit actor still needs mapping |
| Resources | governance reviewer/notes | Partial/Verify | project governance events exist, resource-level reviewer/notes not confirmed | Extend minimally if resource decisions require auditable reviewer evidence |
| Resources | visibility | Available/Partial | sensitivity + membership RLS + publish policy | Add explicit public/member/team/admin visibility only if current policy cannot deterministically express it |
| Deliverables | required/optional deliverables | Available | `project_deliverables.required` | Reuse |
| Deliverables | title/type/owner/reviewer/status | Available | `project_deliverables` | Reuse |
| Deliverables | acceptance/review expectation | Available | acceptance criteria/review notes/review state | Reuse |
| Deliverables | linked evidence/artifact | Available | `evidence_url` + link tables | Reuse |
| Deliverables | expected public description/format/order | Partial/Verify | type/content exist; public configuration/order semantics need exact mapping | Extend only presentation/configuration fields if absent |
| Success | success metrics | Available | problem brief `success_metrics` | Reuse |
| Success | success criteria | Verify | explicit ordered criteria storage still needs exact mapping on audited base | Resolve before migration; do not duplicate if existing table is found |
| Success | acceptance criteria | Available/Partial | deliverable/task acceptance criteria | Reuse at execution level; project-level acceptance configuration may still need normalized representation |
| Skills | technical/professional capability | Available/Partial | governed capabilities/skills/taxonomy | Reuse governed capability system; classify evidence categories only where necessary |
| Proof | project-linked evidence submission | Available | `contributions.project_id` + verification rules | Preserve |
| Proof | potential Proof categories | Verify | project-level configuration relation not yet fully mapped | Add configuration link only if absent; never auto-award Proof |
| Roles | id/title/description/openings | Available | `project_roles` | Preserve IDs and capacity |
| Roles | discipline/skills | Available/Partial | role shape | Reuse |
| Roles | responsibilities/recommended skills/experience/commitment/status | Partial/Gap | not all V2 role details confirmed | Extend role table/configuration minimally |
| Roles | role-specific application questions | Gap/Verify | not confirmed | Add structured questions only if absent; keep project-specific |
| Timeline | milestones | Available | `project_milestones` | Reuse |
| Timeline | workstreams | Available | `project_workstreams` | Reuse |
| Timeline | tasks/activities | Available | `project_tasks` | Reuse operational execution model |
| Timeline | phase description/week range/expected output | Partial | milestones/workstreams cover most but not all presentation semantics | Extend milestones/workstreams rather than create a duplicate phase table unless semantics cannot map |
| Application | open/closed/deadline | Available | project application fields/lifecycle policy | Preserve |
| Application | opening date | Verify | not confirmed | Reuse existing field if present; otherwise add |
| Application | profile requirement/eligibility | Available as engine | member readiness/project journey | Preserve engine; do not duplicate as free-form rules |
| Application | available roles/capacity | Available | roles + role capacity | Preserve |
| Application | existing application/status | Available | `project_applications` | Preserve |
| Application | interest vs role application | Available | application kind + lifecycle policy | Preserve distinction |
| Application | statement/portfolio/availability | Available | existing application endpoint/model | Preserve |
| Application | role-specific questions/evidence requirements/selection process/invite-only/max applications | Partial/Verify | wider application configuration not fully mapped | Extend only genuinely missing settings |
| Lab | private project brief | Available | `project_problem_briefs` with member/admin RLS | Reuse |
| Lab | resources | Available | `project_data_sources` + versions + RLS | Reuse |
| Lab | deliverables | Available | `project_deliverables` + RLS | Reuse |
| Lab | milestones/tasks/workstreams | Available | existing Lab delivery tables | Reuse |
| Lab | team/role access | Available | `project_members`, lead/member helpers and RLS | Preserve |
| Lab | collaboration/discussion links | Available | project discussions/read state | Preserve |
| Lab | Proof/evidence workflow | Available/Partial | contributions + evidence links | Preserve validation; improve canonical context only |
| Admin | Architect create/edit authority | Available/Partial | Project Architect API + assignments | Extend existing flow into multi-step V2 builder |
| Admin | independent governance/review | Available | governance events/status/risk | Preserve |
| Admin | completeness review | Partial | current create validation/readiness; #196 contains additional catalogue-readiness work pending merge | Integrate latest main after #196 merges; expand into V2 completeness without creating parallel readiness engines |
| Admin | resource governance | Partial | data-source access/quality/download/publish policies + project risk governance | Add V2 Green/Amber/Red/Unreviewed presentation/mapping only where current policies do not cover legal/reuse decision state |

## Existing Lab architecture that V2 must reuse

The audited migrations already establish the core Phase 3 infrastructure:

### `project_problem_briefs`
Structured brief fields plus member/admin RLS. This becomes a canonical source for Project Challenge / Business Context / Stakeholder / Key Question / Expected Outcome rather than a new V2 brief table.

### `project_data_sources`
Data/resource metadata already includes source URL, description, type, version, period, unit, format, sensitivity, access/quality status, limitations and verification date. Later delivery-workspace migrations add provenance and download/publish policy. V2 will **extend this entity** for missing licence/provider/retention/storage concepts instead of creating `project_resources`.

### `project_deliverables`
Already supports required deliverables, owner/reviewer, acceptance criteria, evidence, review and execution status. V2 public/member pages should derive presentation-safe deliverable information from this canonical source, while Lab retains execution state.

### `project_workstreams`, `project_milestones`, `project_tasks`
These are the delivery lifecycle. The V2 timeline maps into them. A new parallel `project_phases` system is not justified unless the remaining mapping audit proves a non-equivalent requirement.

### Membership/RLS
Existing helpers and policies restrict briefs/resources/deliverables/tasks/milestones to project members/leads/admins. Later Lab grant migrations intentionally grant route access while retaining those row-level checks. Private resource visibility must continue to rely on these policies.

### Contribution/Proof evidence
Project-linked contributions are constrained by project membership and reviewed through existing verification states. V2 may describe what a member *can prove*, but configuration never constitutes a Proof award.

## Public vs private boundary

One canonical model does **not** mean one visibility level.

### Public-safe only when project/resource is approved for public presentation
- published project identity/brief
- approved problem/business/use-case content
- approved provenance/source attribution
- public licence information
- public-safe resource description
- roles/openings
- public deliverable expectations
- success criteria
- potential evidence categories

### Authenticated-member additions
- profile readiness/eligibility
- application status/role
- member-only content explicitly configured for authenticated users

### Accepted-project-member additions
- internal stored copies
- authorised SharePoint links
- private repositories
- data dictionaries/working documents where restricted
- team-only data source versions
- operational tasks/deliverable status/ownership

### Admin/Architect-only
- internal licence evidence/review notes
- reuse/retention/storage decisions and reviewer notes
- governance/risk reasoning where not intended for publication
- incomplete/unpublished configuration
- private assessment notes

Authorization remains server/RLS enforced, never CSS/client hiding.

## Confirmed migration invariants

Before the first Project Experience V2 migration is committed:

1. Resolve the remaining schema-affecting **Verify** rows.
2. Preserve all current project IDs and valid slugs.
3. Preserve `project_applications`, status/history and application-kind semantics.
4. Preserve `project_roles`, role catalogue links and capacity behaviour.
5. Preserve `project_members`, project runs and team history.
6. Preserve `saved_projects` semantics.
7. Preserve profile-readiness/eligibility rules.
8. Preserve existing project/governance lifecycle rules unless an explicit compatibility mapping is documented and tested.
9. Reuse `project_problem_briefs`, `project_data_sources`, `project_deliverables`, `project_workstreams`, `project_milestones` and `project_tasks` rather than creating duplicate V2 equivalents.
10. Keep Lab/private resource access under existing or stronger RLS/server authorization.
11. Use idempotent normal Supabase migrations only; no manual production mutation.
12. Never backfill unverifiable content with fabricated values.
13. Rebase/integrate the final merged state of PR #196 before final schema/Phase 1 validation so catalogue-readiness/governance work is preserved rather than forked.

## Workbook enrichment rule

The repository/database remains the first source for existing system state. If a required project fact is absent, it may be enriched only from the approved Mettelo Project Library workbook supplied for this programme. Until that workbook is supplied, missing source licences/provider facts/business context/deliverables/reuse or retention rights remain explicit gaps, not guesses.

## Remaining audit work before schema lock

- resolve exact project-level success-criteria persistence on the audited base;
- resolve reusable source/provider registry existence;
- resolve licence/licence-evidence storage;
- resolve retention/internal-storage permission storage;
- resolve exact file/table/sample requirement storage;
- resolve project-level Proof category configuration linkage;
- resolve wider application-setting persistence (opening date, invite-only, max applications, role-specific questions);
- resolve whether supporting objectives/questions/scope already have structured entities;
- map public-safe projection of `project_data_sources` separately from private Lab rows;
- integrate relevant #196 catalogue-readiness changes once #196 is merged.

## Audit exit criteria

Schema design unlocks only when:

- every schema-affecting Verify row is resolved to Available / Partial / Gap;
- proposed extensions are demonstrably additive to existing Lab/Architect architecture;
- public vs member vs accepted-member vs admin projections are defined;
- resource/licence/governance publication rules are explicit;
- Project Architect create/edit persistence is mapped end to end;
- Proof configuration does not conflict with existing evidence verification;
- #196's final merged catalogue-governance model has been integrated;
- every existing project has a compatibility/migration path that does not fabricate missing content.
