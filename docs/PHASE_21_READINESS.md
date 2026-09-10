# Project Experience Phase 21 — Continuation, Admin Operations & Future Project Scale

**Status: DRAFT / PRE-IMPLEMENTATION READINESS — NOT APPROVED**

This document is the live readiness register and boundary contract for Phase 21.

Phase 21 is intentionally stacked on Phase 20 and must not merge ahead of the Project Experience dependency chain. Phase 21 must not silently repair or redefine unresolved Phase 19/20 completion or Proof semantics.

## Objective

Make the Mettelo Project Experience scalable beyond one completed project.

## Source-defined Phase 21 scope

Primary affected functionality:

- member continuation after project completion;
- Admin project creation;
- canonical project model;
- publication/completeness gate;
- Admin project list and operations;
- recruitment/interest configuration;
- Offer settings;
- automatic Lab generation from canonical project data;
- safe duplication/templates;
- historical project/run/member/Proof data protection;
- Supabase/PostgreSQL and RLS.

## Member continuation

After completion, surface appropriate next actions using canonical state and existing destinations:

- View Proof;
- Update Profile;
- Find next Project;
- Explore Opportunities;
- Build leadership evidence;
- Advance Capability Path.

Continuation must avoid manipulative engagement patterns and must not imply that project completion automatically created Verified Proof.

## Governed Admin project creation

Admin Create Project must extend the existing canonical project architecture through a governed multi-step flow:

1. Basics;
2. Problem & Business Context;
3. Resources / Data;
4. Deliverables & Success Criteria;
5. Skills & Proof;
6. Responsibilities & Team;
7. Timeline;
8. Recruitment / Interest Settings;
9. Lab Preview;
10. Review & Publish.

This phase must audit and reuse the existing Project Architect/Admin creation and revision architecture before adding any new builder, endpoint, table or lifecycle.

## Admin project operations

The canonical Admin project list should accurately expose, where the existing architecture supports them:

- Project;
- Lifecycle;
- Participation mode;
- Minimum / Target team;
- Recruitment;
- Applications;
- Offers;
- Team;
- Health;
- Lab readiness;
- Replacement;
- Support;
- Updated date.

Required Admin actions are:

- Create;
- Edit;
- Preview;
- Publish;
- Open / Close interest;
- Review interest;
- Offer place;
- Form team;
- Start;
- Monitor;
- Archive;
- Duplicate.

Each action must route through the existing canonical authority for that lifecycle rather than a Phase 21-specific parallel implementation.

## Safe duplication boundary

A duplicated project may copy reusable project-definition content such as:

- project content;
- responsibilities;
- governed resources;
- milestones;
- skills/capability configuration;
- success criteria.

A duplicated project must never copy operational or historical records, including:

- applications;
- Offers;
- project members;
- project runs or run activity;
- Chat;
- submissions;
- contribution/Proof records;
- completion records/history.

The database/backend must enforce this boundary; client-side hiding alone is not sufficient.

## Templates

Optional templates may cover domains such as:

- Data Analytics;
- Data Science;
- Data Engineering;
- AI / ML;
- Software;
- Cybersecurity;
- Research;
- Product / UX.

Templates may suggest governed structure but must never fabricate project-specific business context, resources, licence/reuse decisions, deliverables, success criteria or other evidence-sensitive content.

## Mandatory architecture audit before implementation

Do not mark any area PASS until exact repository evidence has been inspected.

| Area | Initial state | Required action |
| --- | --- | --- |
| Admin project creation | AUDIT REQUIRED | Trace current Admin + Project Architect creation/revision flow and canonical persistence. |
| Canonical project model | AUDIT REQUIRED | Confirm all Phase 3 structured project fields and child relations used by public/member/Lab. |
| Publication/completeness gate | AUDIT REQUIRED | Reuse current project readiness/publication authority; do not create another gate. |
| Resource governance | AUDIT REQUIRED | Confirm licence/reuse/storage/publication rules and protected-resource boundaries. |
| Participation/team configuration | AUDIT REQUIRED | Reuse Team/Solo/Flexible + min/target/max architecture. |
| Recruitment configuration | AUDIT REQUIRED | Reuse canonical admission/recruitment/joining/cutoff architecture from Phases 6–18. |
| Offer settings | AUDIT REQUIRED | Reuse canonical Phase 8 Offer architecture and capacity reservations. |
| Lab generation | AUDIT REQUIRED | Confirm Lab is a projection of canonical project/run data, not copied project content. |
| Admin project list | AUDIT REQUIRED | Trace existing Admin Operations/Governance surfaces and their canonical read models. |
| Project duplication | AUDIT REQUIRED | Locate any existing duplicate/template implementation before adding one. |
| Historical-data isolation | AUDIT REQUIRED | Prove duplicate/create operations cannot copy applications/offers/members/runs/chat/submissions/Proof/completion. |
| Member continuation | AUDIT REQUIRED | Map completed-project, Proof, Profile, Discover, Opportunities, leadership evidence and Capability Path surfaces. |
| RLS/IDOR | AUDIT REQUIRED | Confirm Admin/member/public boundaries for project definition, history and protected resources. |
| Supabase/PostgreSQL | AUDIT REQUIRED | All schema/function/RLS/index changes must be repository-versioned and reproducible. |
| Analytics | AUDIT REQUIRED | Reuse privacy-safe event architecture; no sensitive project content in event payloads. |
| Notifications/email | AUDIT REQUIRED | Determine whether any Phase 21 state changes require existing notification policy; no bespoke delivery path. |
| Responsive/accessibility | AUDIT REQUIRED | Validate Admin create/list/preview and member continuation at mobile/tablet/desktop/200%/keyboard/AT. |
| Regression/E2E | AUDIT REQUIRED | Cover future-project journey end-to-end with zero developer-created project-specific page. |

## Non-negotiable implementation rules

1. Extend the canonical project model; do not create a Phase 21 project model.
2. Reuse existing Admin/Project Architect creation and revision authorities where compatible.
3. Public Project, Member Discover and Lab must consume canonical project data automatically after governed publication/start.
4. No project-specific JSX may be required for a newly created project.
5. Publication must remain blocked when canonical completeness/resource-governance requirements fail.
6. Team/Solo/Flexible and min/target/max must reuse existing participation authority.
7. Recruitment/interest settings must reuse existing admission/recruitment architecture.
8. Offer configuration/behaviour must reuse canonical Offer architecture.
9. Duplication must create a new project identity and never copy historical operational state.
10. Applications, Offers, memberships, runs, Chat, submissions, contribution/Proof and completion records must never be duplicated.
11. Lab must be generated as a canonical projection, not a copied parallel workspace.
12. Templates may suggest structure only; they must not invent project-specific evidence-sensitive content.
13. Completed-project continuation must not imply Verified Proof where Phase 20 verification has not occurred.
14. Phase 21 must not reopen or mutate historical Phase 18/19 recruitment/completion state merely to create a future project.
15. Admin and member/public surfaces must read/write the same canonical project definition.
16. No service-role workaround may conceal broken RLS on normal project-definition or member/public read paths.
17. Cross-project/run IDOR must fail at the database/server boundary.
18. All database changes must be migration-driven; no hosted-only DDL.
19. Exact-head lint/typecheck/build/migrations/RLS/CRUD/E2E/responsive/accessibility/regression evidence is mandatory before sign-off.
20. Phase 21 remains DRAFT / NOT APPROVED until all success criteria have exact-head evidence.

## Source-defined Phase 21 success criteria

1. Admin can create project without developer.
2. Project appears Public automatically after governed publication.
3. Project appears Member Discover automatically after governed publication.
4. Lab is generated automatically from canonical data when the project/run is eligible.
5. Completeness gate works.
6. Resource governance works.
7. Team configuration works.
8. Recruitment configuration works.
9. Offer settings work.
10. Preview works.
11. Duplicate works safely.
12. Historical data is never copied.
13. Admin dashboard is accurate.
14. Member continuation works.
15. No project-specific JSX is required.
16. Documentation is updated.

## Mandatory release evidence

Before Phase 21 sign-off, execute and record at the exact final head:

- lint;
- typecheck;
- production build;
- relevant unit/integration tests;
- clean isolated Supabase migration reconstruction;
- schema/FK/constraint/index/function validation;
- direct RLS/security/IDOR tests;
- database CRUD for create/edit/preview/publish/duplicate;
- public project and Member Discover propagation;
- future-project Lab generation/integration;
- recruitment and Offer regressions;
- historical-data duplication-negative tests;
- Admin create/list/operations E2E;
- member continuation E2E;
- mobile/tablet/desktop/200% reflow;
- keyboard/focus/screen-reader/accessibility checks;
- full affected regression suite;
- Event Room and protected Release Gate where repository policy requires them.

## Approval state

**PHASE 21: NOT APPROVED**

No implementation is considered approved merely because this readiness contract exists. The current repository architecture must first be audited, then the smallest compatible extension implemented and validated against the exact reviewed head.
