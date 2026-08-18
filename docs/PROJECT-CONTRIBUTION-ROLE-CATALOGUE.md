# Governed project contribution-role catalogue

Last updated: 18 August 2026

## Decision

Contribution areas used for project matching are governed data, not a frontend-only list. Mettelo keeps project-specific delivery roles in `project_roles` and adds a separate Admin-managed `project_role_catalogue` for reusable contribution areas.

Applications can select more than one catalogue role. The first selected role remains compatible with the existing project-application role field while the full set is persisted in `project_application_roles`.

## Seed catalogue

The initial catalogue contains: Data Analyst, Data Engineer, Data Scientist, ML Engineer, AI/ML Researcher, BI/Analytics Engineer, Product Analyst, Project Manager/Lead, Business Analyst, QA/Testing, Technical Writer/Documentation, UI/UX Designer, Frontend Developer, Backend Developer, DevOps/Infrastructure, Marketing/Content, and Community/Mentorship.

Admins can manage active state and presentation order without redeploying application UI.

## Authorization and data boundaries

- Active catalogue roles are readable where project application UI needs them.
- Authenticated members can persist role links only for their own application through the intended RLS path.
- Admin management remains role-authorized.
- Existing `project_roles` and historical application records are not replaced or rewritten.

## User experience

Project applications expose a labelled multi-select checkbox group with 44px-or-larger targets, keyboard focus visibility, responsive one-column behavior on small screens, and a review step that lists all selected contribution areas before final submission.

Admin application review presents the complete selected role set so matching decisions are not made from a truncated primary role.

## Verification contract

This change requires TypeScript/lint, Phase 2 deterministic audit, migration/RLS application in isolated Supabase, persisted application E2E, browser regression, `Release gate`, and `Deployment gate` before merge.

## Rollback

The catalogue and join table are additive. Application/UI changes can be reverted independently while preserving recorded role links. Do not drop the join table after production applications have used it; retain historical selections for auditability.
