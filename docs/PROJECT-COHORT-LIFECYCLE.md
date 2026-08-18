# Open and Partner project lifecycle

Last updated: 18 August 2026

## Decision

Mettelo uses the existing `project_runs` model as the team/cohort boundary. We do not introduce a parallel team table.

- **Open Project:** a public project can have multiple independent runs/cohorts. Applications continue while `applications_open` is true. Accepted members fill the oldest eligible forming run first. A run starts automatically when its own `required_team_size` is reached. Starting or completing one run does not close the parent Open Project or another run.
- **Partner Project:** one forming delivery team is expected. Reaching the team-size threshold never auto-starts delivery. An Admin, assigned Project Architect, or active Project Leader must explicitly start the team through the server lifecycle action.

This distinction is enforced in APIs and persisted state, not inferred from UI labels.

## Data model

`20260818174500_project_cohort_lifecycle.sql` adds the project/run fields needed to make lifecycle state explicit, including application availability, project-type review state, per-run required team size, start state/timestamps, and project activity logging.

Existing project/run records remain authoritative. Legacy rows are not silently reclassified from historical behavior; project type can be marked for Admin review.

## Authorization and invariants

- Project type and required team size are explicit Admin inputs for new projects.
- Partner name/context is required when creating a Partner Project.
- Open-run assignment is server-owned and oldest-eligible-run first.
- Open auto-start applies to one run only.
- Partner start is server-authorized and audited.
- Closing applications prevents new joins without mutating already formed/active teams.
- Project history is archived rather than destructively rewritten when dependent activity exists.

## Admin experience

The Projects workspace provides a real Create Project action rather than routing through content publishing. The create form has no default project type. Project detail shows run/cohort fill and lifecycle state, and Partner start appears only when the current team is full and still forming.

Controls meet the repository accessibility baseline: labelled controls, keyboard-operable actions, visible focus treatment, non-colour status text, and responsive single-column behavior on small screens.

## Verification contract

This is a runtime/database lifecycle change and therefore requires the full release path:

1. lint and TypeScript;
2. deterministic Phase 2 and Admin audits;
3. browser regression suite;
4. isolated local Supabase migrations and disposable fixtures;
5. authenticated/persisted staging E2E;
6. aggregate `Release gate` followed by `Deployment gate`.

The isolated E2E fixture explicitly declares `project_type: open` so CI exercises the same non-null schema contract as production code.

## Rollback

Application/API/UI commits can be reverted normally. The migration is additive and should not be destructively rolled back after production data begins using run-level lifecycle fields. If rollout must stop, disable new lifecycle actions and preserve the added columns/activity history for forward repair.
