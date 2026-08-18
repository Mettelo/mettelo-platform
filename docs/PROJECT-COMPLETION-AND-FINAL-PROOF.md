# Project completion and final Proof governance

Last updated: 18 August 2026

## Decision

Project completion is evaluated at the `project_run` boundary. Final Proof is an auditable submission with an actual submitter; authority to submit can be delegated, but delegated authority never changes who performed the action.

Open and Partner Projects deliberately finish differently:

- **Open cohort:** after every configured completion condition is satisfied and an authorised final Proof is submitted, that run completes automatically. The parent Open Project remains available for other cohorts.
- **Partner Project:** satisfying the same conditions moves the run to completion review. Only Admin or the assigned Project Architect can approve completion or request changes. A Project Leader cannot self-approve the team they led.

## Configurable completion conditions

Projects can require a verified final presentation, a published GitHub repository, and/or a final Proof/deliverable link. Required presentations must reach the existing authoritative `verified` state; merely marking a presentation as presented is not sufficient.

The existing completion-readiness function remains responsible for required milestone/task/member-Proof readiness. Final submission adds the project-level configured conditions rather than bypassing readiness.

## Delegated submission

`project_submission_permissions` records who may submit final Proof for a run, who granted that authority, when it was granted, and any later revocation. Admin, assigned Project Architect and active Project Leader can grant/revoke. The submission row records the actual authenticated submitter.

Delegation is run-scoped and does not grant reviewer or completion-approval authority.

## Team experience

The project workspace exposes one run/team at a time. Open Projects can switch between cohorts. Team cards show profile photo where available, initials fallback, project role, membership state and final-Proof delegation state. Status is conveyed with text/badges rather than colour alone.

The final-Proof panel shows configured conditions, current completion state, delegation controls where authorised, and the persisted final submission/reviewer outcome. Controls remain keyboard-operable with visible focus and responsive layouts across mobile, tablet and desktop.

## Audit and notifications

Grant/revoke, final submission, Open auto-completion and Partner review transitions are written to project audit/activity records. Completion notifications are emitted after the authoritative state transition, not before it.

## Verification contract

This is an auth/database/lifecycle change and requires the complete release gate: lint/TypeScript, deterministic project/Admin audits, isolated Supabase migrations and RLS, disposable authenticated fixtures, persisted browser journeys, completion authorization tests, `Release gate`, then `Deployment gate`.

## Rollback

Do not drop submission/delegation/audit tables after production use. UI/API behavior can be disabled or reverted while retaining recorded authority and completion evidence. Completed runs must not be reopened by a rollback script; corrective state changes require an explicit audited operation.
