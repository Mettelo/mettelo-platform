# Project Experience Phase 7 — Admin Review, AUTO-Start Oversight & Governed Selection

Status: **IN PROGRESS / NOT APPROVED**

## Non-negotiable product rules

1. **Partner Project = REVIEW_REQUIRED. Always.** Partner + AUTO cannot persist, cannot be selected in Admin, cannot be forced through review/start APIs, and cannot be auto-started by scheduled processing.
2. **Mettelo Open Project** may be `AUTO` or `REVIEW_REQUIRED` according to canonical project configuration.
3. A legitimate Open AUTO project follows:
   `AUTO QUALIFY → START CONDITIONS MET → START SCHEDULED +6 HOURS → OPTIONAL ADMIN INTERVENTION → FINAL READINESS CHECK → AUTO START`.
4. The six-hour window is **not waiting for Admin approval**. Healthy scheduled AUTO runs show **No action required** and start automatically if Admin does nothing and readiness remains valid.
5. REVIEW_REQUIRED follows:
   `SUBMIT → REVIEW → CLARIFICATION/SHORTLIST/DECLINE/OFFER → MEMBER ACCEPTS → MEMBERSHIP/TEAM FORMATION`.
   Selection/Offer alone creates no membership and opens no Lab/private workspace access.
6. Target team size never blocks AUTO start once the configured minimum is satisfied.
7. No start path may bypass lifecycle, capacity, membership validity, readiness, Lab/resources, permissions, RLS or security.

## Canonical admission policy

`effectiveProjectAdmissionMode(project_type, admission_mode)` is the application-layer policy helper. The database also enforces Partner mandatory review with `projects_partner_requires_review_check`, and exposes the equivalent `effective_project_admission_mode()` SQL helper.

Phase 7 safely normalizes any unreleased Partner/AUTO configuration back to REVIEW_REQUIRED. Unstarted invalid waiting memberships/runs are unwound; already-started historical anomalies are not silently rewritten.

## AUTO oversight

AUTO remains the Phase 6 server-authoritative admission/run architecture. Phase 7 adds operational oversight, not an approval queue.

Durable state includes:

- `auto_start_delay_minutes` — programme default 360;
- `start_ready_at`;
- `start_scheduled_at` / `scheduled_start_at`;
- run pause fields and actor/reason;
- run block fields and actor/reason;
- start failure state;
- canonical activity audit.

Because Phase 6 and Phase 7 are still an unreleased stacked migration train, migration `20260905178100_project_experience_phase_7_default_window_normalization.sql` converts the inherited Phase 6 120-minute programme default to 360. Explicit Open Project overrides created after the migration train remain authoritative.

Healthy AUTO state:

`AUTO QUALIFIED → TEAM FORMING if below minimum → START SCHEDULED when minimum/readiness conditions are met → six-hour window → final readiness → STARTED`.

Admin exception controls:

- **Start now** — optional early start through canonical `startProjectRun()`;
- **Pause** — stores actor/reason and prevents auto-start;
- **Block start** — explicit stronger stop requiring a reason;
- **Resume** — clears pause and establishes a new valid window;
- **Unblock** — clears block and establishes a new valid window;
- **Retry start** — canonical readiness/start retry after failure;
- **Convert to review required** — only for an unstarted Open AUTO project, with audit and safe unwind of waiting AUTO state.

The formation cron rechecks effective admission policy and will clear a stale due schedule rather than auto-start Partner or REVIEW_REQUIRED work. `startProjectRun()` independently rechecks policy for scheduler starts, lifecycle, pause/block, minimum/readiness, maximum capacity and idempotent activation.

## Human review

The actionable review queue contains only:

- all Partner Project submissions needing human selection;
- Open Projects configured REVIEW_REQUIRED.

Successful AUTO-qualified submissions are excluded from approval work and instead appear in AUTO oversight.

Canonical review transitions:

- `submitted → in_review | declined`
- `in_review → clarification_requested | shortlisted | offered | declined`
- `clarification_requested → in_review | declined`
- `shortlisted → offered | declined`

The transition is performed through `phase7_transition_review_request()`, which:

- requires authenticated Mettelo Admin authority;
- locks the application/project and uses a per-project advisory lock;
- enforces effective REVIEW_REQUIRED policy;
- rejects stale/illegal transitions;
- rechecks capacity before Offer;
- counts waiting/active membership plus outstanding Offers;
- prevents concurrent over-offering;
- never creates `project_members` or a run.

## Clarification round trip

Admin may request clarification from an in-review request. The request becomes `clarification_requested`, with request timestamp and review note.

The member sees a **Needs you** action in My Mettelo and responds through `/api/project-applications/clarification`. The owner-scoped `phase7_respond_to_clarification()` function validates ownership/current state, stores the response, records the member actor through the existing status audit trigger, and returns the same request to `in_review`.

No second application/review datastore is created.

## Review data and UX

Admin review exposes, where available:

- member identity, username/member ID and privileged email;
- self-declared profile headline, skills, experience and availability;
- verified Mettelo Proof in a visually distinct section;
- interest/contribution statement and submitted evidence;
- participation mode/preference and leadership interest;
- Project type, Partner organisation, difficulty, commitment and recruitment state;
- confirmed members, outstanding Offers, open places, minimum, target and maximum;
- submitted timestamp and current review state.

Self-declared profile claims must never be presented as verified Proof.

The AUTO dashboard separately reports Partner/Open review counts, AUTO forming, scheduled/starting soon, paused/blocked/needs attention, and started states. Healthy scheduled runs are labelled **No action required**.

## Offer boundary

`OFFERED ≠ ACCEPTED ≠ ACTIVE MEMBER`.

Phase 7 Offer communication explicitly says selection does not enrol the member. Phase 8 owns durable Offer acceptance/decline, expiry, reserved-capacity lifecycle and the final conversion from accepted Offer to membership/team formation.

## Audit, analytics and communication

Canonical review audit remains `project_application_events`, extended with immutable review-note snapshots. The existing trigger captures actor, timestamp, previous state and new state.

`project_activity_log` records operational/analytics events including review started, clarification requested/responded, shortlisted, offered, declined, AUTO pause/block/resume/unblock/conversion/failure/start.

Notification/outbox failure after an already-audited decision does not make the API falsely report that the lifecycle mutation failed. Project-start email/notification is emitted only after actual successful `startProjectRun()` activation.

## Security / RLS

- members cannot configure admission policy, start schedules, pause/block state or project activation;
- Partner + AUTO is rejected by canonical DB constraint;
- Admin review RPC validates `app_metadata.role='admin'`;
- clarification response is owner-scoped to `auth.uid()`;
- service-role AUTO admission remains server-only;
- no partner-review privileges are fabricated in Phase 7; until a scoped partner-review authorization model exists, Mettelo Admin is the reviewer;
- review notes/decision reasoning are not exposed as ordinary public/member data beyond the explicit clarification request intended for the owning member.

## Migrations

- `20260905178000_project_experience_phase_7_review_offer_boundary.sql`
  - Partner hard-lock;
  - effective admission SQL policy;
  - durable AUTO ready/pause/block fields;
  - clarification state/data;
  - canonical review/audit extensions;
  - capacity-safe review transition RPC;
  - member clarification response RPC;
  - safe Open AUTO → REVIEW_REQUIRED conversion RPC.
- `20260905178100_project_experience_phase_7_default_window_normalization.sql`
  - converts the unreleased Phase 6 120-minute programme default to 360.

No hosted-only DDL is permitted. Production remains pre-Phase6/7 until the stacked PR train is approved and merged.

## Executable evidence

Phase 7 test coverage includes:

- `tests/project-experience-phase7-admin-review.spec.ts` — source/architecture contract;
- `tests/project-experience-phase7-admin-review-e2e.spec.ts` — isolated Supabase Partner policy, review audit, clarification, no-membership Offer, invalid transition, AUTO-review rejection and concurrent Offer capacity;
- `tests/project-experience-phase7-admin-review-browser.spec.ts` — mobile/tablet/desktop/landscape/200%/keyboard/dialog acceptance;
- Phase 6 AUTO security, journey, concurrency, withdrawal, recruitment and analytics suites remain mandatory regressions;
- Event Room and protected Release Gate remain mandatory exact-head gates.

The uploaded Phase 7 acceptance review defines 58 mandatory end-to-end journeys and a 62-point Director sign-off. A criterion is not PASS merely because code exists; final approval requires exact-head executable evidence, including clean isolated Supabase reconstruction/RLS, lint, typecheck, build, browser/accessibility, Phase 6 regressions, Event Room and Release Gate.

## Merge boundary

PR #216 is intentionally stacked on Phase 6 / PR #215 and must not merge first. If Phase 6 is merged and PR #216 is retargeted/rebased, the resulting SHA becomes the only valid release candidate and all mandatory validation must run again.

Do not start Phase 8 from this implementation branch. Do not treat queued, running, cancelled or superseded workflows as approval.
