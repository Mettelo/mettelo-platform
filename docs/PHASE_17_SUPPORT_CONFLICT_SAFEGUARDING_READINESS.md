# Phase 17 — Support, Conflict & Safeguarding

Status: **DIRECTOR SIGN-OFF REVIEW IN PROGRESS / RELEASE NOT APPROVED**.

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

A Phase 17 support case retains:

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
- Permanent safeguarding sensitivity marker when escalated

## Privacy boundary

- Support cases are private.
- Project Lead membership does not grant automatic support-case access.
- A complaint involving the Project Lead can be created without Project Lead permission.
- Confidential case details remain inside the authenticated product surface.
- Email/notification copy must not include the member's description, internal notes, resolution detail, safeguarding detail, or other confidential case content.
- Privacy-safe email copy tells the recipient only that a secure update is available in Mettelo.
- The private `/admin/project-support` workspace is excluded from general Google Analytics initialization so case identifiers in Admin URLs are not sent as general page-view data.
- Phase 17 server logging records operation plus non-sensitive error code/name only; raw database messages and case content are not written by the support routes.

## Notification integration

Phase 17 reuses the canonical Mettelo notification/outbox engine; it does not create a second delivery system. Support notifications use the `project_support_case` event key and therefore pass through the existing `notification_preferences` lookup. When no explicit preference row exists, the current notification engine defaults the channel to enabled, matching its established behaviour. Email/outbox payloads remain generic and contain no private support description, internal note or safeguarding detail.

A separate user-facing preference taxonomy for private project-support notices is not introduced by Phase 17 because no existing approved preference category for that event was identified during this review. Any future preference-control change should be made in the canonical notification-preference model rather than inside the support feature.

## Admin capability boundary

- `projects.support.manage` is required for private support access.
- `projects.safeguarding.manage` is additionally required for safeguarding-escalated cases and remains required after resolution or closure.
- These two Phase 17 capabilities are explicit-only: a legacy `role=admin` account without a configured capability array does not inherit them.
- Governed support-handler reassignment requires `admin.access.manage`; the selected target must already hold `projects.support.manage`, and safeguarding cases require the target to hold `projects.safeguarding.manage`.

## Admin actions implemented

Authorized Admin handling supports:

- review
- assign to self
- governed reassignment to another authorized support Admin
- request information
- record recovery plan
- reassign responsibility through canonical Phase 10 authority
- change Project Lead through canonical Phase 10 authority
- request replacement through canonical Phase 16 authority
- remove member through canonical Phase 16 departure authority using `support_resolution`
- escalate safeguarding
- resolve
- close
- reopen

Material Admin actions are attributable and auditable.

### Participation pause — governance blocker

The original Phase 17 playbook includes **pause participation**, but the repository does not currently contain an approved canonical paused-membership lifecycle or capacity policy. Phase 17 therefore does **not** invent a support-specific pause state. The final Phase 17 schema explicitly removes `participation_paused` from allowed support-case audit actions.

A future implementation of pause requires an approved cross-phase membership policy defining at minimum: canonical membership state, capacity consumption, access rights, task/responsibility behaviour, Proof attribution, notifications, return/resume transitions, time limits and interaction with replacement/recruitment. Until that policy is approved, pause remains a documented product-governance blocker rather than a hidden or duplicated implementation.

## Canonical architecture preserved

Phase 17 extends rather than replaces existing Mettelo systems:

- `project_members` remains membership authority.
- `project_runs` remains run/cohort authority.
- Phase 10 responsibility and Project Lead functions remain authoritative.
- Phase 16 departure/replacement remains authoritative for removal and vacancy recovery.
- Existing Admin capability infrastructure remains the privileged-action boundary.
- Existing notification/outbox infrastructure remains the notification system.
- Existing `project_activity_log` patterns remain the project audit system.
- No duplicate project, membership, run, responsibility, Lead, recruitment, Offer, replacement, invitation, Chat, Proof or notification system is introduced.

## Supabase/PostgreSQL implementation

Versioned migrations:

1. `20260908010000_project_experience_phase_17_support_conflict_safeguarding.sql`
   - creates `project_support_cases` and `project_support_case_updates`;
   - foreign keys to canonical project/run and Auth users;
   - category/status/content constraints;
   - reporter/run/Admin-queue/update indexes;
   - `updated_at` trigger;
   - reporter RLS and restricted authenticated column privileges.
2. `20260908011000_project_experience_phase_17_support_privacy_hardening.sql`
   - adds permanent `safeguarding_escalated_at` sensitivity marker and index;
   - reasserts restricted reporter column privileges.
3. `20260908012000_project_experience_phase_17_canonical_recovery_actions.sql`
   - adds service-role-only transactional recovery coordinator over canonical Phase 10/16 functions;
   - exact case-version concurrency guard;
   - privacy-safe recovery/audit metadata.
4. `20260908013000_project_experience_phase_17_signoff_hardening.sql`
   - removes unsupported `participation_paused` audit action;
   - enforces project/run consistency at the database boundary;
   - enforces active reporter membership on case context creation/change even for privileged server writes.

No hosted Production DDL has been applied by Phase 17. Repository migrations remain the authoritative database change set.

## Direct database/RLS evidence

Blocking local-only tests now prove:

- an authenticated active reporter can directly insert their own case through Supabase RLS;
- forged reporter identity is denied;
- a Project Lead/peer cannot directly read another member's case;
- reporter selection of `internal_notes` is denied by column privileges;
- even service-role writes cannot create a mismatched project/run case;
- even service-role writes cannot create a case for a reporter without active exact-run membership;
- consequential recovery RPC remains unavailable to normal authenticated clients and is invoked only after server capability checks.

## Recovery/concurrency evidence

Blocking local-only tests cover:

- responsibility reassignment;
- Project Lead change;
- governed member removal;
- Phase 16 capacity/replacement handoff;
- deterministic stale-version rejection;
- true simultaneous consequential-action race, with one winner and one `SUPPORT_CASE_STALE` rejection;
- joining-cutoff denial: removal can preserve the vacancy while recruitment remains closed and no replacement-request event is created after the cutoff.

## Form and validation alignment

- Member case description: 20–6000 characters in UI/API/database.
- Member secure response: up to 6000 characters.
- Admin information requests, recovery plans and resolutions: up to 6000 characters in UI/API/database.
- Safeguarding Admin notes: up to the remaining 12000-character secure-note capacity.
- Oversized Admin content is rejected with a validation response; it is not silently truncated.

## UI/UX and accessibility evidence

Member Lab support surface includes loading, error, empty, success, closed/read-only and secure-response states.

Admin support workspace includes loading, error, empty, success, governed-recovery loading/error states, persistent safeguarding-restricted labelling, explicit confirmation for safeguarding and consequential actions, and governed handler selection.

Blocking authenticated browser coverage exercises:

- 320px mobile;
- 768px tablet;
- 1280px desktop;
- 200% text reflow;
- no document-level horizontal overflow;
- minimum 44px primary form/action targets;
- keyboard focus progression and visible focus styles;
- semantic headings, labelled controls, status/alert/note regions;
- hostile HTML/script-shaped case content rendered as inert text in member and Admin views.

A manual assistive-technology/screen-reader pass is still required if the expanded acceptance matrix requires human AT verification beyond automated semantic/browser checks.

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

These criteria are necessary but do not override unresolved material governance, upstream dependency, exact-head CI or expanded acceptance evidence.

## Remaining before release sign-off

- the final exact Phase 17 head must pass lint, typecheck, build, static regression, isolated Supabase reconstruction, direct RLS/database tests, public regression, authenticated QA, persistence, Event Room and protected Release Gate;
- the upstream Phase 16 dependency must be formally resolved before Phase 17 can merge;
- participation pause requires an approved canonical lifecycle policy before it can be treated as implemented;
- if required by the expanded acceptance authority, complete the human assistive-technology evidence and the full 202-user-story / 95-journey / 68-area evidence mapping without inventing unsupported evidence.

## Release rule

Do not approve, mark ready or merge Phase 17 while any material success criterion, database reconstruction check, RLS/security check, real support E2E, protected exact-head release gate, product-governance requirement or upstream Phase 16 dependency remains unresolved.
