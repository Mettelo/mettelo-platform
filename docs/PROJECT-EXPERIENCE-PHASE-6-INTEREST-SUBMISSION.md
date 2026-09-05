# Project Experience Phase 6 — Interest Submission, Admission & Start Safety

**Status:** IN PROGRESS / NOT APPROVED  
**Dependency:** Phase 5 Member Project Experience & Qualification  
**Branch:** `feature/project-experience-phase-6-interest-submission`

## Phase purpose

Phase 6 owns the actual member **Submit Interest** form, authoritative final-submit validation, canonical persistence, admission-policy transition, member confirmation/tracker continuity, Admin governance, and safe handoff into team formation/start.

Phase 5 decides whether a member may enter the submission journey. Phase 6 must revalidate authoritative server/database state at final submit because browser qualification can become stale.

Phase 6 supports two explicit project admission modes:

- **REVIEW_REQUIRED** — the canonical interest remains pending human review; no project membership is created by submission.
- **AUTO** — after the canonical interest is successfully persisted, a service-only atomic qualification transition may create the governed waiting/active team place, subject to participation mode, project/run capacity, late-joining policy and all server-authoritative checks. AUTO never fabricates a formal role.

Canonical REVIEW_REQUIRED journey:

`MEMBER PROJECT → SUBMIT INTEREST → FORM → REVIEW → TERMS → SERVER REVALIDATION → PERSIST INTEREST → REVIEW_REQUIRED → MEMBER TRACKER + ADMIN REVIEW → TEAM FORMATION → LATER ROLE ASSIGNMENT`

Canonical AUTO journey:

`MEMBER PROJECT → SUBMIT INTEREST → FORM → REVIEW → TERMS → SERVER REVALIDATION → PERSIST INTEREST → SERVICE-ONLY AUTO QUALIFICATION → CANONICAL RUN/WAITING PLACE → MINIMUM REACHED → DURABLE START WINDOW → READINESS REVALIDATION → ACTIVE RUN`

## Binding boundaries

Phase 6 MUST:

- use `/member/discover/[id]/apply` and `/api/project-applications`;
- create `application_kind='interest'` with `project_role_id = null` for initial interest;
- not require or reserve a formal role before interest;
- revalidate auth, profile readiness, lifecycle/deadline, active request, participation, terms and current project capacity immediately before insert;
- persist only after explicit final submission;
- preserve entered values after validation/network failure;
- keep member and Admin views on the same canonical `project_applications` row;
- default existing projects safely to `admission_mode='review_required'` unless AUTO is explicitly configured;
- make AUTO qualification service-only and concurrency-safe;
- use one canonical start service for scheduled AUTO start, Admin retry and existing governed manual start;
- revalidate team/Lab readiness immediately before activation;
- keep start scheduling durable in PostgreSQL, never browser timers;
- preserve REVIEW_REQUIRED and legacy role-specific `application` compatibility;
- keep notifications after successful persistence/transition and never roll back valid persistence because notification delivery failed;
- keep sharing/invite hooks non-authoritative: a public share path or invite intent never grants membership or private workspace/Lab access.

Phase 6 MUST NOT:

- create a second applications, membership, tracker or start model;
- infer AUTO solely from project type;
- trust browser-supplied project/member/status/capacity/start state;
- permit members to call service-only AUTO admission directly;
- permit members to mutate server-owned application lifecycle fields through broad RLS UPDATE;
- allow a shared URL, invite intent or forged run URL to grant membership/private workspace access;
- create a second active run when a late eligible member should join the current active run;
- start at target size when the configured minimum is already satisfied;
- start while canonical readiness is false;
- create duplicate starts, memberships or schedules under retries/concurrent execution;
- make hosted-only schema changes outside repository migrations.

## Form contract

The role-neutral interest form collects:

1. availability/context;
2. how the member could contribute;
3. optional professional evidence link;
4. optional leadership willingness;
5. participation preference when project mode is Flexible;
6. Project Participation Terms acceptance;
7. final review before submission.

Formal contribution role selection belongs later in team/governance workflow.

## Server/API product-state contract

Stable qualification/submission states include:

- `AUTH_REQUIRED`
- `PROFILE_INCOMPLETE`
- `PROJECT_CLOSED`
- `DEADLINE_PASSED`
- `CAPACITY_UNKNOWN`
- `CAPACITY_FULL`
- `LATE_JOINING_CLOSED`
- `ALREADY_PARTICIPATING`
- `DUPLICATE_APPLICATION`
- `PARTICIPATION_PREFERENCE_REQUIRED`
- `TERMS_REQUIRED`
- `TERMS_VERSION_CHANGED`
- `VALIDATION_ERROR`

Known product-state failures must be truthful and must not be collapsed into generic success or generic 500 responses.

## Admission and team-formation contract

### REVIEW_REQUIRED

- Initial interest persists without membership.
- Member tracker labels it as interest.
- Admin reads the same row and may review/shortlist/approve it without fabricating a role.
- Legacy role-specific applications retain existing role/capacity checks.

### AUTO

- The canonical interest is inserted first.
- `phase6_auto_admit_interest` is service-role only.
- Per-project advisory locking serialises run selection, capacity and schedule creation.
- Solo projects require one member.
- Team projects schedule when configured minimum is reached; target is not a start blocker.
- Flexible participation resolves to the member's explicit allowed preference.
- The AUTO transition may create a role-neutral governed `project_members` place only after successful server qualification.
- Waiting membership is not equivalent to an active Lab/start state.
- A late eligible member joins the same active run when late joining remains open.
- Maximum capacity closes recruitment.
- Optional late-joining cutoff is authoritative.
- Withdrawal before activation releases the waiting place and cancels the durable schedule if the run falls below minimum.

### Start and recovery

- `scheduled_start_at` is durable server state.
- The formation worker invokes the same `startProjectRun()` service used by Admin retry and the governed manual start path.
- `assessProjectTeamReadiness()` remains the start authority.
- Lab readiness is derived from canonical project brief, required deliverable, required success criterion, project-level milestone and resource safety—not a writable browser flag.
- A readiness failure leaves the run forming and members waiting.
- Admin can pause, resume and retry an AUTO run.
- Retry cannot create duplicate start events or memberships.

## Sharing and invitation boundary

- Share returns only canonical `/projects/{projectId}`.
- The public share path contains no run token, private-resource path or membership authority.
- Only waiting/active members or Admin may access recruitment controls.
- A non-member remains blocked from `/member/projects/{projectId}`.
- Phase 6 invitation support is a policy/audit hook only; `collaborator_invite_intent` records `membership_created:false`.
- Full invitation acceptance/membership creation belongs to the later canonical invitation workflow, not this Phase 6 hook.

## Supabase/PostgreSQL contract

Canonical entities remain:

- `auth.users`
- `profiles`
- `projects`
- `project_applications`
- `project_runs`
- `project_members`
- existing readiness/content/team tables
- `project_activity_log`
- existing notification infrastructure

Database guarantees:

- role-neutral initial interest is unique while active per `(project_id,user_id)`;
- declined/withdrawn history does not permanently block a later valid interest;
- member insert/read ownership rules remain compatible with the form/tracker;
- broad owner UPDATE of application lifecycle is removed; withdrawal goes through the authorised server API;
- AUTO admission RPC is revoked from public/anon/authenticated and executable only by service role;
- run selection/capacity/scheduling is atomic under per-project advisory locking;
- late joining reuses the canonical active run;
- all Phase 6 schema changes are repository-versioned migrations.

## UI/UX and accessibility

The form/status surfaces must work at 320px through desktop and at 200% text size, including:

- default, validation, URL, terms, submitting, product-state error, network error, duplicate and success states;
- AUTO team-forming/start-window/late-joining states;
- visible keyboard focus and associated labels;
- announced status/error messages;
- usable touch targets;
- no colour-only status;
- terms dialog keyboard/focus behavior;
- no horizontal clipping at 200% reflow.

## Executable Phase 6 evidence map

Blocking/reconstructed-environment coverage now includes:

- `tests/project-experience-phase6-interest-submission.spec.ts` — source/architecture contract, AUTO + REVIEW_REQUIRED, withdrawal, Admin governance, role-neutral semantics.
- `tests/project-experience-phase6-browser.spec.ts` — real Phase 6 states/form at 320px, phone, landscape, tablet, desktop, 200% reflow, keyboard and accessible naming/status.
- `tests/project-experience-phase6-auto-security.spec.ts` — authenticated member cannot forge admission mode, run schedule/start, membership or service-only AUTO RPC.
- `tests/project-experience-phase6-auto-journeys.spec.ts` — solo/team formation, minimum-not-target scheduling, late joining, maximum/cutoff, readiness failure, safe Admin retry and retry idempotency.
- `tests/project-experience-phase6-auto-concurrency.spec.ts` — concurrent minimum-reaching admissions create one run/schedule; concurrent start execution activates exactly once.
- `tests/project-experience-phase6-recruitment-security.spec.ts` — share URL isolation, invitation non-membership, non-member 403 recruitment control and 404 private workspace boundary.
- `tests/project-experience-phase6-analytics.spec.ts` — canonical non-sensitive REVIEW_REQUIRED and AUTO funnel events.
- `tests/project-application-final-submit.spec.ts` — authenticated final submit, structured validation, REVIEW_REQUIRED no-membership baseline, legacy compatibility, AUTO scheduled-window withdrawal/cancellation.

The Phase 6 backend/security journey suites are included in both isolated Supabase smoke and staging E2E scripts. The responsive/accessibility Phase 6 browser suite is included in blocking regression.

## Acceptance ledger

Implementation acceptance requires all of the following:

1. Role-neutral final submission.
2. No request before explicit submit.
3. Required fields/terms validation.
4. Safe optional URL normalization.
5. Authoritative final server revalidation.
6. Canonical interest persistence.
7. Duplicate/race protection.
8. Retryable client state after failure.
9. Clear success confirmation.
10. Truthful member tracker semantics.
11. Truthful Admin semantics on the same row.
12. Notification failure cannot invalidate successful persistence.
13. REVIEW_REQUIRED submission creates no membership.
14. REVIEW_REQUIRED Admin review supports role-neutral interest.
15. AUTO is explicit configuration, never project-type inference.
16. AUTO qualification is service-only.
17. AUTO solo creates one canonical run/place/schedule.
18. AUTO team schedules at minimum, not target.
19. Concurrent minimum-reaching submissions create one run and one schedule.
20. Waiting place does not falsely activate Lab/start state.
21. Canonical readiness blocks unsafe start.
22. Readiness repair + Admin retry starts safely.
23. Repeated/concurrent start is idempotent.
24. Withdrawal during activation window releases capacity and cancels schedule when below minimum.
25. Late eligible member joins same active run.
26. Maximum capacity closes recruitment.
27. Late-joining cutoff blocks further admission without creating a second run.
28. Admin can pause/resume/retry and inspect failure state.
29. Public share path contains no private authority.
30. Invitation hook creates no membership.
31. Non-member cannot use recruitment controls or private workspace.
32. Member cannot forge application/run/membership lifecycle through RLS/API boundaries.
33. REVIEW_REQUIRED legacy role application remains compatible.
34. Canonical activity log captures submission/admission/start/retry/share lifecycle evidence without a second analytics model.
35. Migrations reconstruct cleanly from repository state.
36. Mobile/tablet/desktop/200%/keyboard/accessibility evidence is green.
37. Lint is green on final exact head.
38. Typecheck is green on final exact head.
39. Build and interaction/regression audits are green on final exact head.
40. Public browser regression is green on final exact head.
41. Authenticated isolated-Supabase QA is green on final exact head.
42. Persistence and informational journeys are green on final exact head.
43. Phase 6 security/concurrency/analytics journeys are green on final exact head.
44. Event Room contract is green on final exact head.
45. Protected Release Gate is green on final exact head.

## Current validation status

Phase 6 remains **NOT APPROVED**. Queued, pending, running, cancelled or superseded workflow results are not accepted as final evidence. Only the final exact PR head may be used for handoff/sign-off.

## Baseline note

This Phase 6 branch was deliberately reset onto final Phase 5 implementation head `6d92896dc1a6da58ebab35b415ff9af4ab2ad444` before continuing. Preliminary Phase 6 work remains preserved at `backup/project-experience-phase-6-pre-phase5-final`; only reviewed pieces were reapplied.

## Sign-off rule

Do not merge from this implementation chat. When all acceptance items and final exact-head gates are green, add a formal handoff comment containing the immutable final SHA, migration/test evidence and merge-owner checklist, then leave PR #215 for the separate merge/release chat.
