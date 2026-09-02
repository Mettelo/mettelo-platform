# Mettelo Project Experience V2 — Single-PR Programme Contract

Status: active implementation programme
Branch: `feature/project-experience-v2`
Target: `main`
Delivery rule: **Phases 1–4 are one programme, one pull request, one final merge.**

## Product outcome

Create one canonical Mettelo project experience from creation through Proof:

`CREATE → DISCOVER → QUALIFY → APPLY → SELECT → START → DELIVER → PROVE`

Admin / Project Architect defines one authoritative project. Public Project Detail, authenticated Member Project Detail, the application journey, Mettelo Lab and future project creation all consume that canonical information with visibility-appropriate access.

This is not a static HTML replacement and not a cosmetic redesign. The supplied advanced Project Detail prototype is the visual and information-architecture reference. The implementation must translate that direction into reusable Mettelo components and real database-backed behaviour.

## Single-PR governance

This branch remains the only implementation branch for all four phases.

- Do not open separate Phase 1/2/3/4 PRs.
- Do not merge intermediate phases into `main`.
- Each phase may produce its own tests and success evidence inside this PR.
- If `main` advances during the programme, integrate current `main` without dropping completed V2 work before final validation.
- Final merge is allowed only when the final exact head is current with `main` and passes the full protected release contract.
- Never bypass repository protection or Release Gate.

## Architecture principles

1. **One canonical source** — no separately maintained public/member/Lab/admin copies of project text.
2. **Extend before replace** — reuse current lifecycle, application, membership, taxonomy, readiness, role-capacity and Proof systems wherever authoritative.
3. **Structured where it matters** — objectives, questions, scope, resources, deliverables, success criteria, roles and milestones should not become one giant text blob.
4. **Visibility is data policy** — public, authenticated-member, accepted-project-member and admin-only access must be server/RLS enforced.
5. **No fabricated enrichment** — unknown sources, licences, business context, deliverables, reuse/retention rights remain missing until supported by repository/database or the approved Project Library workbook.
6. **Migration safety** — preserve project IDs/slugs, applications, membership/team history, role relationships, statuses, Lab links and admin relationships.
7. **Future projects are first-class** — Phase 4 must make the new architecture automatic for the next project rather than requiring another developer-built custom page.

## Phase 0 — required audit before schema migration

Deliverables:

- `docs/PROJECT_EXPERIENCE_V2_FIELD_GAP_MATRIX.md`
- current public/member/application/Admin/Lab/RLS/test inventory
- explicit compatibility decisions for existing data
- proposed canonical schema only after all schema-affecting audit unknowns are resolved

No Project Experience V2 schema migration is finalised before the field-gap audit.

## Phase 1 — Canonical Project Data + Public Project Experience

### Objectives

- establish/extend canonical project detail entities;
- migrate/bridge existing project content without losing IDs, applications, roles, memberships or lifecycle history;
- redesign public Project Detail using the supplied advanced prototype as the design/IA reference;
- make every displayed project value dynamic;
- preserve anonymous authentication routing and authenticated-member routing;
- expose approved provenance while protecting private resources.

### Target reusable UI architecture

- ProjectBreadcrumb
- ProjectHero
- ProjectStatus
- ProjectDecisionCard
- ProjectMetaGrid
- ProjectSourceCard
- ProjectValueStrip
- ProjectSectionNav
- ProjectChallenge
- ProjectBusinessContext
- ProjectUseCase
- ProjectObjectives
- ProjectDataPanel
- ProjectDeliverables
- ProjectSuccessCriteria
- ProjectProofSection
- ProjectTimeline
- ProjectRoles
- ProjectEligibility
- ProjectApplicationCTA

Components may be consolidated where that produces a cleaner design-system API; the implementation must not turn the prototype into a monolithic static component.

### Public content hierarchy

Hero → title/summary/status/meta/CTA/Proof/source → value strip → challenge/problem/business context/use case/objectives/questions/scope → data/resources → deliverables → success criteria → capability/Proof potential → timeline → roles → eligibility → application expectation → final CTA.

### Phase 1 gates

- canonical model exists;
- current projects remain addressable and lifecycle-safe;
- public design is prototype-aligned and reusable;
- all content is dynamic;
- anonymous CTA cannot submit directly and preserves intended project through auth;
- authenticated member routing is correct;
- source attribution is accurate and non-endorsing;
- private resources cannot leak publicly;
- responsive from 320px through desktop and supports 200% text;
- keyboard/focus/semantics/contrast pass accessibility checks;
- existing project lifecycle tests remain green.

## Phase 2 — Member Project Page + Application Journey

### Objectives

Use the same canonical project source while adding member-specific state:

- eligibility/profile readiness;
- missing profile requirements;
- current application and role;
- project/team state;
- clear next action;
- member-only information where authorized.

Preserve the existing member readiness engine, project-state resolver, application endpoint, duplicate protection, role capacity, current participation terms, notifications and admin queue.

### Journey

Project → eligibility check → role selection → application form → review → submit → confirmation → application status.

Known profile data should be prefilled/reused; do not ask the member for data Mettelo already holds unless explicit verification is needed.

### Phase 2 gates

- anonymous application impossible;
- project intent survives signup/login/profile completion;
- eligible users can apply through existing authoritative lifecycle;
- incomplete profiles are clearly guided and returned to the project;
- Submit Interest vs Apply for Role semantics remain distinct where currently distinct;
- duplicate applications behave correctly;
- status/role/next-step clarity is explicit;
- persistence, notifications and admin queue remain correct;
- mobile + keyboard application journeys pass.

## Phase 3 — Mettelo Lab Canonical Project Workspace

### Objectives

Accepted team members must receive the canonical brief and authorised project resources in Lab without Admin manually re-entering content.

Lab should surface, from canonical data:

- Project Brief
- Problem Statement
- Business Context
- Use Case
- Objectives
- Key Questions
- Scope
- Resources
- Deliverables
- Success Criteria
- Timeline / milestones
- Team roles / ownership
- potential Proof / evidence categories

Do not create a second task/project-management system where Lab already has equivalent task, milestone, ownership or artefact functionality. Map canonical definitions into the existing operational model.

### Access boundary

Public provenance may remain visible. Internal stored copies, SharePoint links, private repositories, team working documents and restricted resources are accepted-project-member (or stricter) data and must be authorized server-side/RLS.

### Phase 3 gates

- accepted members see canonical project detail;
- non-members cannot read private resources even by direct request;
- problem/resources/deliverables/success/timeline/roles/Proof configuration render correctly;
- existing Lab interactions remain stable;
- RLS and authenticated E2E pass.

## Phase 4 — Future Project Creation, Governance & Scale

### Objective

The next project created through Mettelo must automatically support the V2 public page, member journey, application flow and Lab workspace without a developer creating a custom page.

Extend the existing Project Architect/Admin architecture into a structured multi-step project builder rather than creating a competing creation flow.

### Builder steps

1. Project Basics
2. Problem & Business Context
3. Data, Sources & Resources
4. Deliverables & Success Criteria
5. Skills & Proof
6. Roles & Team
7. Timeline / Milestones
8. Application Settings
9. Lab Configuration Preview
10. Review & Publish

### Governance

Resource governance supports explicit states such as Unreviewed, Verification Required, Green, Amber and Red. Publication must not silently succeed when critical project content or required resource governance is incomplete.

The review surface must distinguish at minimum:

- complete;
- missing;
- verification required;
- publication blocker;
- Lab readiness.

### Phase 4 gates

- create/edit flow writes canonical entities;
- slug uniqueness and required-field validation work;
- multiple resources/deliverables/criteria/roles/milestones can be managed;
- governed source/provider records can be reused rather than duplicating logos/attribution;
- resource visibility and governance are explicit;
- application settings reuse the current eligibility/lifecycle engines;
- Lab preview is generated from canonical data, not separate entry;
- incomplete critical projects cannot be silently published;
- one created fixture project proves end-to-end automatic public → member → application → Lab configuration behaviour;
- Admin/Architect authorization and RLS are covered by tests.

## Cross-phase quality contract

The final PR must be reviewed through these lenses before release:

- Product management — lifecycle clarity, value, scope integrity
- Product/UX design — information hierarchy, responsive behaviour, interaction states
- Design thinking/research strategy — user decision questions are answered without avoidable cognitive load
- Design systems — reusable primitives and Mettelo token consistency
- Accessibility — WCAG 2.2 AA interaction, focus, keyboard, zoom/reflow and status semantics
- Architecture — canonical ownership, no competing systems, clean boundaries
- Full-stack engineering — robust server/client/data contracts and failure states
- QA/test automation — unit/contract/integration/E2E/regression coverage
- Content/UX writing — precise labels, state copy and provenance language
- Product analytics — privacy-safe measurement of meaningful journey interactions
- Security/privacy — RLS, authorization, URL safety, least exposure and no private-link leakage

## Analytics boundary

Analytics may record privacy-safe interaction types and aggregate state such as project opened, CTA selected, eligibility state, application step reached, application submitted, resource section opened and Lab brief opened where appropriate.

Do not emit raw application answers, raw search text, private resource URLs, private repository/SharePoint links, licence-review notes, profile content, user secrets or unnecessary identifiers into client analytics events.

## Test strategy

Every completed phase adds blocking tests for its contract while preserving existing suites. The final exact head must pass the repository's protected release contract, including at minimum:

- lint
- typecheck
- build
- schema/migration validation in isolated Supabase
- public regression
- authenticated QA
- persistence
- informational journeys
- relevant Mettelo Lab regression
- Event Room contract where required by repository gate
- Deployment gate
- Release Gate

A green earlier phase does not authorize an intermediate merge.

## Final definition of done

The programme is complete only when all four phases coexist on one final exact head and:

- one canonical project definition drives public, member, application, Lab and future Admin/Architect creation;
- existing project/application/team history is preserved;
- private resource boundaries are enforced by RLS/server authorization;
- current projects are migrated/compatible without fabricated content;
- future projects require no custom developer-built Project Detail page;
- the final branch is current with `main`;
- all required CI/release gates are green;
- the programme is merged once into `main`.
