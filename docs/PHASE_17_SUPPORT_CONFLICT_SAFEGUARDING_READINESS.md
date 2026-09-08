# Phase 17 — Support, Conflict & Safeguarding

Status: DRAFT / readiness approved for implementation, release NOT APPROVED.

## Objective

Provide a secure route for project problems through private support cases attached to the canonical project and run.

## Playbook support categories

- Technical/access
- Resource/data
- Project scope
- Project Lead support
- Team collaboration
- Workload
- Conduct
- Accessibility adjustment
- Other

## Required case record

A Phase 17 support case must retain:

- Case ID
- Reporter
- Project
- Run
- Category
- Description
- Status
- Assigned Admin
- Created at
- Updated at
- Resolution
- Internal notes
- Member-visible updates

## Privacy boundary

- Support cases are private.
- Project Lead membership does not grant automatic support-case access.
- A complaint involving the Project Lead must be creatable without Project Lead permission.
- Confidential case details remain inside the authenticated product surface.
- Email/notification copy must not include the member's description, internal notes, resolution detail, safeguarding detail, or other confidential case content.
- Privacy-safe email copy should tell the recipient only that a secure update is available in Mettelo.

## Admin actions required by the playbook

Authorized Admin handling must support:

- review
- assign
- request information
- record recovery plan
- reassign responsibility
- change Lead
- approve replacement
- pause participation
- remove member
- escalate safeguarding
- resolve
- close

Material Admin actions must be attributable and auditable.

## Canonical architecture to preserve

Phase 17 extends rather than replaces existing Mettelo systems:

- `project_members` remains membership authority.
- `project_runs` remains run/cohort authority.
- Existing Admin capability checks remain the privileged-action boundary.
- Existing notification/outbox infrastructure remains the notification system.
- Existing project activity/audit patterns remain the audit system.
- Existing Phase 16 departure/replacement flows remain the route for authorized removal/replacement consequences.
- Existing project responsibility/leadership mechanisms remain authoritative when recovery actions reassign responsibility or change Lead.
- No duplicate project, membership, run, notification, replacement, invitation, Chat or Proof systems may be introduced.

## Implementation order

1. Versioned Supabase/PostgreSQL schema and RLS.
2. Member case create/read API scoped to exact project/run/reporter.
3. Restricted Admin case-management API with server-side capability checks.
4. Privacy-safe notifications.
5. Auditable state/recovery actions.
6. Member project/Lab support UI.
7. Restricted Admin UI.
8. Static regression and real local-only Supabase/browser E2E.
9. Responsive, accessibility and security validation.
10. Exact-head release gates and documentation review.

## Phase 17 success criteria

1. Member can create case.
2. Correct project/run attached.
3. Case private.
4. Admin access restricted.
5. Lead complaint does not require Lead permission.
6. Sensitive details not emailed.
7. Case states work.
8. Audit works.
9. Recovery plan works.
10. Replacement can follow resolution.
11. Removal authorized.
12. RLS passes.
13. Mobile works.
14. Accessibility passes.
15. Security review passes.
16. Support E2E passes.
17. Docs updated.

## Release rule

Do not approve or merge Phase 17 while any material success criterion, exact-head blocking gate, database reconstruction check, security/RLS check, real support E2E, or upstream Phase 16 dependency remains unresolved.

No hosted Production DDL is authorized by this readiness document.
