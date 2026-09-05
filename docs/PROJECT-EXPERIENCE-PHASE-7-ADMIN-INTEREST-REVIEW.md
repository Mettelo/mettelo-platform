# Project Experience Phase 7 — Admin Interest Review & Selection

Status: **IN PROGRESS / NOT APPROVED**

## Objective

Give Mettelo Admin a structured, auditable review workflow for `REVIEW_REQUIRED` project interests while preserving the separate Phase 6 `AUTO` admission architecture.

Phase 7 does not replace AUTO qualification, project runs, project membership, the durable project-start scheduler, or the canonical `project_applications` model.

## Admission boundary

### AUTO

AUTO remains server-authoritative:

`SUBMIT INTEREST → SERVER QUALIFICATION → AUTO QUALIFIED → CANONICAL RUN/MEMBERSHIP → READY → SCHEDULED START → AUTO START`

The programme default start delay is now **360 minutes (6 hours)**. The six-hour period is an Admin oversight window, not a required approval gate. Once a run is scheduled and still passes canonical readiness, Admin may explicitly **Start now** during the window. Admin may also pause/block the run. If Admin takes no start or blocking action and the run remains ready, the existing scheduler starts it automatically at the durable `scheduled_start_at` time.

Per-project delay configuration remains supported and explicit project overrides remain authoritative.

AUTO-qualified records do not enter the human review queue.

### REVIEW_REQUIRED

The governed review path is:

`SUBMITTED → IN REVIEW → SHORTLISTED → OFFERED`

or a valid decline transition:

`SUBMITTED / IN REVIEW / SHORTLISTED → DECLINED`

`OFFERED` is a selection boundary only. It does **not** create `project_members`, create/start a run, activate Lab access, or confirm participation. Explicit member acceptance is owned by the Phase 8 offer lifecycle.

## Server transition contract

The Admin review API permits only:

- `submitted → in_review`
- `submitted → declined`
- `in_review → shortlisted`
- `in_review → declined`
- `shortlisted → offered`
- `shortlisted → declined`

Terminal/compatibility states are not silently reopened by this endpoint.

The endpoint rejects AUTO projects/`auto_qualified` requests. AUTO operational intervention remains in the admission/start policy controls.

## Audit contract

The existing `project_application_event_audit` trigger remains the canonical state-transition audit mechanism. The actual status update is executed through the authenticated Admin Supabase client so `auth.uid()` records the Admin actor in the same database transaction as the status mutation.

Phase 7 extends `project_application_events` with a `reviewer_notes` snapshot so the canonical immutable history retains the note/reason that accompanied each review transition. No Phase 7-specific history table is introduced.

The broader `project_activity_log` receives a compatible operational/analytics event using `actor_type='user'` and Admin actor metadata. Failure of this secondary log does not falsely roll back or misreport a transition that was already atomically audited by `project_application_events`.

Audit history preserves:

- actor;
- timestamp;
- previous status;
- new status;
- application identity;
- project identity;
- review notes where applicable.

## Admin review context

The canonical Admin review surface exposes, where available:

- member name;
- username and member ID;
- email for privileged Admin operation;
- professional headline;
- skills;
- experience level;
- availability/capacity profile;
- verified Proof/contributions;
- interest/application statement;
- submitted evidence link;
- participation preference;
- leadership interest;
- project role context for legacy applications;
- confirmed members;
- minimum team size;
- target team size;
- maximum team size;
- request status.

No second review datastore is introduced.

## Admin actions

For REVIEW_REQUIRED requests, available actions depend on current state:

- Submitted: **Start review**, **Decline**
- In review: **Shortlist**, **Decline**
- Shortlisted: **Offer project place**, **Decline**
- Offered: read-only in Phase 7 pending the Phase 8 member-acceptance contract
- Declined: retained history

Bulk actions are only offered when every selected request can legally make the same transition.

The retired `Approve → team` action must not exist for REVIEW_REQUIRED requests.

For AUTO scheduled-start oversight, Admin may:

- **Start now** — explicitly start a ready scheduled run before the six-hour fallback time;
- **Pause** — block the scheduled automatic start;
- **Resume** — restore the schedule after a run-level pause;
- **Retry start** — re-run canonical readiness/start processing after an automation failure.

Every start path reuses `startProjectRun()` and revalidates readiness; Phase 7 does not create a second start engine.

## Member communication

Phase 7 reuses the current Mettelo notification infrastructure.

- In review: calm in-app status communication.
- Shortlisted: progress communication with no false promise of a confirmed place.
- Offered: communicates that Mettelo is offering a place while explicitly stating that selection does not auto-enrol the member.
- Declined: clear, non-accusatory closure.

Notification/outbox failure after an already-audited state transition must not cause the API to report that the lifecycle decision itself failed. Communication delivery status is treated separately from canonical request state.

The Phase 8 offer lifecycle owns explicit acceptance/decline, expiry, reserved capacity and any bounded offer reminders.

## Security and RLS

- Authentication is required.
- `app_metadata.role='admin'` is required before any review or explicit early-start operation.
- The authenticated Admin client performs the REVIEW_REQUIRED status mutation, preserving canonical RLS and audit actor identity.
- Service-role access remains limited to privileged server-side supporting operations after Admin authentication.
- AUTO requests cannot be forced through the human review endpoint.
- Server-side transition validation prevents forged lifecycle jumps.
- Compare-and-set status mutation protects against stale concurrent review decisions.
- `Start now` calls the same server-authoritative readiness/start service as existing manual/Admin start processing.
- No REVIEW_REQUIRED offer action inserts project membership.

## Responsive and accessibility contract

The Admin review surface must support desktop, tablet and mobile. It preserves a mobile-card alternative to the wide desktop table and uses 44px minimum interactive targets for primary review controls. Dialogs require accessible names, status messages use live-region semantics, controls have visible keyboard focus, and content must remain usable under text reflow/zoom.

## Database changes

Phase 7 migration:

`20260905178000_project_experience_phase_7_review_offer_boundary.sql`

It:

1. changes the canonical AUTO delay default to 360 minutes for new/unconfigured projects;
2. preserves explicit per-project AUTO delay overrides;
3. adds `offered` to the canonical project-application status constraint;
4. extends canonical `project_application_events` with immutable review-note snapshots and keeps the existing trigger as the one transition-audit architecture;
5. documents that `offered` is not membership.

Phase 7 intentionally does not introduce a temporary offer table. Phase 8 owns the durable offer entity, acceptance, expiry and capacity-reservation contract.

## Regression requirements

Phase 7 must prove:

- AUTO admission still qualifies without human review;
- ready AUTO runs retain durable scheduled start and Admin Start now/pause/resume/retry controls;
- Admin may start a ready AUTO run before the six-hour fallback time through the canonical start service;
- default AUTO start delay is six hours;
- if Admin does not start/pause/block a ready run, the durable scheduler remains the fallback automatic start path;
- AUTO requests are excluded from human review actions;
- valid REVIEW_REQUIRED transitions succeed;
- invalid transitions fail server-side;
- audit records capture the Admin actor, state change and review note;
- offering creates no membership and starts no run;
- decline works;
- shortlist works;
- member tracker displays `Place offered` truthfully without exposing Phase 8 acceptance controls early;
- communication failure cannot convert an already-audited decision into false API failure;
- complete review context renders;
- verified Proof is displayed safely;
- mobile/tablet/desktop layouts remain usable;
- keyboard/focus/dialog semantics remain accessible;
- Phase 6 application, withdrawal, AUTO scheduling, recruitment, concurrency, analytics and Event Room regressions remain green.

## Phase 7 success criteria ledger

1. Admin sees complete interest context — **IMPLEMENTED / VALIDATION PENDING**
2. Existing history preserved — **IMPLEMENTED / VALIDATION PENDING**
3. Review state transitions validated server-side — **IMPLEMENTED / VALIDATION PENDING**
4. Audit events recorded — **IMPLEMENTED / VALIDATION PENDING**
5. Selection does not auto-enrol member — **IMPLEMENTED / VALIDATION PENDING**
6. Decline works — **IMPLEMENTED / VALIDATION PENDING**
7. Shortlist works — **IMPLEMENTED / VALIDATION PENDING**
8. Offer action works — **IMPLEMENTED / VALIDATION PENDING**
9. Permissions correct — **IMPLEMENTED / VALIDATION PENDING**
10. Admin mobile works — **IMPLEMENTED / VALIDATION PENDING**
11. Accessibility passes — **VALIDATION PENDING**
12. Admin regression passes — **VALIDATION PENDING**
13. Docs updated — **IMPLEMENTED / VALIDATION PENDING**

No criterion is considered PASS until exact-head executable evidence is green.

## Merge boundary

This Phase 7 branch is stacked on Phase 6 and must not merge ahead of its dependencies. A separate merge/release chat owns final retarget/rebase, exact-head validation, protected Release Gate and merge.
