# Project Experience V2 — Canonical Field-Gap Matrix

Status: Phase 0 audit baseline
Branch: `feature/project-experience-v2`
Base audited: `d17888a3ccfbc8c8617e942ace437132afdb74fd`
Programme rule: Phases 1–4 remain in one pull request and merge once after final exact-head validation.

## Why this document exists

The Project Experience V2 programme must move public Project Detail, authenticated Member Project Detail, Mettelo Lab and Admin / Project Architect creation onto one canonical project information model. This matrix is the required pre-migration audit. It is intentionally written before any new Project Experience V2 schema migration.

The rule for every row is:

- **Preserve** working lifecycle behaviour and existing identifiers.
- **Extend** existing tables and services when they are already authoritative.
- **Normalize** information that currently exists only as derived/fallback copy or an overloaded blob.
- **Do not invent** missing business context, sources, licences, reuse rights, retention rights, deliverables or resource facts.
- **Block publication** where a critical canonical field is required but cannot be verified.

## Confirmed current architecture

| Surface / concern | Current implementation | Audit result | V2 direction |
| --- | --- | --- | --- |
| Public project detail | `app/projects/[id]/page.tsx` | Uses `projects`, `project_roles`, taxonomy and public visibility; current richer decision sections are resolved separately | Preserve route and public visibility policy; replace fragmented/derived detail copy with canonical structured content and reusable V2 presentation components |
| Member project detail | `app/member/discover/[id]/page.tsx` + `components/MemberProjectDetailClient.tsx` | Auth required; reads project, applications, membership, save state, profile readiness, taxonomies and role capacity | Preserve eligibility/application state engine; consume the same canonical project detail model as public with member-only extensions |
| Application API | `app/api/project-applications/route.ts` | Enforces auth, lifecycle policy, duplicate protection, role validity/capacity, prior membership, current terms, persistence and notifications | Preserve as canonical application lifecycle; extend only for structured application configuration/questions where required |
| Project Architect API | `app/api/architect-projects/route.ts` | Existing create/lint/submit workflow and readiness checks; already captures many structured project fields | Extend rather than create a competing project-creation API; Phase 4 must build on this workflow |
| Rich project decision copy | `lib/project-detail-content.ts` | Mix of project-derived fallback and manually maintained title-keyed overrides | Transitional compatibility only; canonical database-backed project detail becomes authoritative |
| Roles | `project_roles`, `project_role_catalogue`, `project_application_roles` | Existing role/application relationships are active and capacity-sensitive | Preserve IDs and application semantics; add missing role-detail structure without replacing the role lifecycle |
| Taxonomy | project domain/tool/method/capability/role-family relationships | Governed catalogue work is already in the platform | Reuse governed taxonomy; do not duplicate domain/tool/skill vocabularies |
| Profile eligibility | member readiness + member project journey services | Existing completion/readiness rules already gate member application behaviour | Preserve exactly; V2 only improves explanation, return journey and presentation |
| Project membership | `project_members` + project runs | Current member detail resolves waiting/active/completed participation | Preserve canonical membership authority; Lab private access must derive from this/RLS, not UI hiding |
| Saved project | `saved_projects` | Private bookmark state separate from application | Preserve unchanged |

## Canonical project field matrix

Legend:
- **Available** — confirmed as structured current data.
- **Partial** — some current data exists but is incomplete/overloaded/derived.
- **Gap** — no authoritative structured V2 field confirmed in the audited surface yet.
- **Verify** — repository/database audit must locate authoritative storage before a migration decision.

| Canonical area | Required information | Current state | Current source / evidence | V2 action |
| --- | --- | --- | --- | --- |
| Identity | id | Available | `projects.id` | Preserve |
| Identity | slug | Available on public catalogue/project model | `projects.slug` | Preserve where valid; uniqueness remains enforced |
| Identity | title | Available | `projects.title` | Preserve |
| Identity | short summary | Available | `projects.summary` | Preserve |
| Identity | domain/category | Available | governed domain relations | Reuse taxonomy |
| Identity | project type | Available | `projects.project_type` | Preserve |
| Identity | difficulty/level | Available | `projects.difficulty_level` | Preserve |
| Identity | lifecycle status | Available | `projects.status` | Preserve and map V2 completeness/recruitment concepts rather than replacing blindly |
| Identity | recruitment status | Partial | applications/status/lifecycle fields | Define canonical derived/explicit contract without breaking lifecycle policy |
| Identity | duration | Available | `duration_weeks` | Preserve |
| Identity | weekly commitment | Available | `weekly_commitment` | Preserve |
| Identity | team size | Partial | role openings/capacity | Prefer derived total when appropriate; only add explicit field if product semantics differ |
| Identity | delivery format | Partial | project type/location model | Normalize only if not equivalent to existing fields |
| Identity | remote/location | Available | `location`, `location_type` | Preserve |
| Identity | project owner | Verify | architect/admin model audit pending | Locate existing ownership authority before schema change |
| Identity | project architect | Available in creation/governance workflow concept | architect role/API | Preserve existing actor relationship; verify storage shape |
| Identity | planned start/end | Available on member detail | `starts_at`, `ends_at` | Preserve |
| Identity | published date | Verify | audit schema/history | Reuse existing publication timestamp if present |
| Identity | last updated | Verify | audit schema/history | Reuse existing timestamp if present |
| Problem | problem statement | Partial | member project selects `problem_statement`; public richer content can also be derived | Make canonical `problem_statement` authoritative and migration-safe |
| Problem | business context | Gap/Verify | richer decision copy currently separate | Add structured canonical storage only after DB audit confirms absence |
| Problem | organisational context | Gap/Verify | not confirmed | Add only when applicable |
| Problem | primary use case | Gap/Verify | not confirmed as canonical structured field | Add structured canonical storage |
| Problem | primary objective | Gap/Verify | architect readiness includes intent-related inputs but canonical field not confirmed | Normalize |
| Problem | supporting objectives | Gap/Verify | not confirmed | Structured ordered items |
| Problem | key questions | Gap/Verify | not confirmed | Structured ordered items |
| Problem | in scope / out of scope | Gap/Verify | not confirmed | Structured scope items, typed in/out |
| Resources | one/many resources | Verify | full resource storage audit pending | Prefer dedicated project resource entities; do not overload project row |
| Resources | provider/source/source URL | Gap/Verify | no authoritative structure confirmed in public/member detail | Create/reuse provider + resource structure after audit |
| Resources | licence/licence URL | Gap/Verify | not confirmed | Required for governed external-resource publication where applicable |
| Resources | reuse/download/retention/internal-storage permissions | Gap/Verify | not confirmed | Admin-only governance fields; never expose blindly to public |
| Resources | exact file/table/date range/sample | Gap/Verify | not confirmed | Structured resource requirement metadata |
| Resources | format/size/data classification | Gap/Verify | not confirmed | Structured metadata |
| Resources | last verification/reviewer/notes | Gap/Verify | not confirmed | Governance audit trail |
| Resources | internal stored copy / Lab link | Gap/Verify | Lab audit pending | Private visibility + RLS; never public |
| Resources | visibility | Gap/Verify | project visibility exists, resource-level visibility not confirmed | Add resource-level access contract if absent |
| Deliverables | required/optional deliverables | Gap/Verify | no canonical project-deliverable entity confirmed in initial code search | Structured ordered entities; map to existing Lab task model instead of duplicating execution tracking |
| Deliverables | review/assessment/docs/presentation/repository/quality expectations | Gap/Verify | not confirmed | Structured expectations or typed criteria; avoid giant text blob |
| Success | success criteria | Partial | Project Architect accepts success criteria/readiness inputs; authoritative storage shape still to verify | Preserve existing content if stored; normalize to ordered criteria if needed |
| Skills | technical/professional skills | Partial/Available | project skills + governed capabilities/taxonomies | Reuse governed capability system; classify only where needed |
| Proof | Proof eligibility/categories | Verify | existing Proof system exists but project configuration link not yet audited | Link configuration to existing Proof review; never auto-award Proof |
| Roles | role id/title/openings | Available | `project_roles` | Preserve IDs and capacity behaviour |
| Roles | description/skills | Available/Partial | current member project role shape | Preserve and extend missing details |
| Roles | responsibilities/recommended skills/experience/commitment/status/application requirements/questions | Partial/Gap | not all fields confirmed | Add structured extensions without globally hardcoding project roles |
| Timeline | project phases/milestones | Partial/Verify | Project Architect already has `workflowStages`; Lab mapping audit pending | Reuse existing stage/task model when semantics match |
| Application | open/closed/deadline | Available | `applications_open`, `application_deadline`, lifecycle policy | Preserve |
| Application | opening date | Verify | not confirmed in current detail/API | Reuse if existing; otherwise add |
| Application | profile requirement/eligibility | Available as engine | member readiness/journey | Preserve engine rather than storing duplicate rules |
| Application | available roles | Available | roles + capacity service | Preserve |
| Application | evidence/application questions/selection process/invite-only/max participants | Partial/Verify | current application captures statement/portfolio/availability and role; wider config audit pending | Extend canonical application settings only where absent |
| Application | Interest vs Apply semantics | Available | application kind + lifecycle rules | Preserve distinction |
| Application | existing status | Available | `project_applications` | Preserve |
| Lab | project membership/access | Available conceptually | `project_members`/runs + authenticated member state | Keep server/RLS authoritative |
| Lab | canonical brief/resources/deliverables/success/timeline/roles/Proof | Verify | Lab route/component storage audit still open | Phase 3 consumes canonical project detail; no manual copy |
| Admin | create/lint/submit governance | Available | Project Architect API | Extend |
| Admin | completeness review | Partial | current readiness/lint model | Expand into canonical V2 completeness/readiness contract |
| Admin | resource governance approval | Gap/Verify | not confirmed | Add Green/Amber/Red/Unreviewed/Verification Required workflow if absent |

## Public vs private boundary

The canonical model must not mean every field is globally readable.

### Public-safe candidates
- published brief and summary
- public problem/business/use-case content
- approved public provenance/source attribution
- public licence information
- roles/openings
- public deliverables and success criteria
- potential Proof categories (not private review evidence)

### Member-only candidates
- eligibility/readiness state
- member application/status
- authenticated-member project notes explicitly marked for members

### Accepted-project-member candidates
- internal stored resource links
- approved SharePoint/internal-storage links
- private repository links
- working documents/data dictionaries where restricted
- team-only operational resources

### Admin-only candidates
- licence verification evidence when internal
- reuse/retention/storage review notes
- governance reviewer and internal notes
- private assessment notes
- unpublished/incomplete project configuration

All private access must be enforced by server authorization/RLS, never by CSS or client-side hiding alone.

## Migration invariants

Before the first Project Experience V2 migration is committed:

1. Finish the remaining schema/RLS/Lab/admin storage audit for every **Verify** row that affects schema design.
2. Preserve all current project IDs and valid slugs.
3. Preserve `project_applications`, application status/history and application-kind semantics.
4. Preserve `project_roles`, catalogue role relationships and capacity behaviour.
5. Preserve `project_members`, runs and team history.
6. Preserve Save/bookmark semantics.
7. Preserve profile-readiness rules.
8. Preserve current project status/lifecycle policy unless an explicit compatibility mapping is documented and tested.
9. Use idempotent normal Supabase migrations only; no manual production database mutation.
10. Never populate unverifiable content with fabricated values. Missing enrichment stays explicitly missing/blocked until sourced.

## Workbook enrichment rule

The repository/database remains the first source of truth for existing system state. If a required project fact is absent, it may be enriched only from the approved Mettelo Project Library workbook supplied for this programme. Until that workbook is supplied, missing source URLs, licences, providers, business context, deliverables, reuse rights and retention rights remain gaps — not guesses.

## Audit exit criteria

The field-gap audit is ready to unlock schema design when:

- all schema-affecting **Verify** rows have been resolved to Available / Partial / Gap;
- existing RLS and Lab access authority is mapped;
- Project Architect create/edit storage is mapped end to end;
- current success-criteria/workflow-stage persistence is mapped;
- project resource/private-link storage is mapped or confirmed absent;
- Proof-project linkage is mapped;
- proposed schema extensions have an explicit compatibility/migration path for every existing project.
