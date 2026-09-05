# Project Experience Phase 5 — Director Sign-Off Review

**Phase:** 5 — Member Project Experience & Qualification  
**PR:** #214  
**Dependency:** Phase 4 / PR #213  
**Decision:** **NOT APPROVED**  

The binding detailed evidence ledger is `docs/PROJECT-EXPERIENCE-PHASE-5-FULL-ACCEPTANCE-REVIEW.md`. It contains all 80 user stories, 50 mandatory test journeys and the required 63-point Director matrix.

## 1. Phase success criteria

Canonical journey:

`UNDERSTAND PROJECT → UNDERSTAND FIT → UNDERSTAND TEAM/CAPACITY → UNDERSTAND ELIGIBILITY → RESOLVE PROFILE READINESS IF NEEDED → SEE EXISTING INTEREST/PARTICIPATION STATE → SUBMIT INTEREST → PHASE 6`

The one dominant conversion action is **Submit Interest**.

Roles are informational **Possible contribution areas**. They are not a mandatory pre-interest choice and no role ID is required to enter Phase 6.

## 2. Related functionality and regression surface

Reviewed/directly affected:

- Phase 4 public project → auth → exact member project continuity;
- canonical Phase 3 project data and participation model;
- Phase 2 profile readiness;
- member project qualification/state;
- current run/team/capacity;
- existing interest/application state;
- prior/current participation;
- `/member/discover/[id]/apply` Phase 6 handoff;
- `/api/project-applications` persistence trust boundary;
- Applications tracker;
- Admin review regression;
- public-safe project resources and Lab authorization boundary;
- mobile/tablet/desktop/accessibility regression.

## 3. Material defects found and remediation

### A. Mandatory role selection contradicted the Phase 5 contract — FIXED

The first implementation required a contribution role before interest. It has been removed. Contribution areas are informational and initial interest persists with no formal role assignment.

### B. Competing CTA model contradicted the contract — FIXED

`Review your fit`, `Continue to submit interest`, and role-choice conversion controls were removed. Eligible members receive one dominant **Submit Interest** action.

### C. Weekly availability was incorrectly made a hard eligibility rule — FIXED

Weekly capacity is now advisory fit context. Phase 5 does not invent a hard rejection from this signal.

### D. Qualification used role capacity instead of project capacity — FIXED

Project-level capacity now uses current team/run membership plus canonical min/target/max. Waiting/reserved places count toward occupied capacity where the current model reserves them.

### E. Team information was incomplete — FIXED IN SOURCE

Member page now explains confirmed members, reserved/offered places, minimum to start, target team, maximum team, participation mode and current capacity state.

### F. Phase 6 route required `?role=` — FIXED

The canonical handoff is `/member/discover/[id]/apply`, with no role parameter.

### G. Phase 6 form forced role selection — FIXED

The interest form now collects availability, contribution statement, professional context/terms and submits `application_kind='interest'` without assigning a project role.

### H. Server qualification was incomplete — FIXED IN SOURCE

The submission API now revalidates authenticated identity, Phase 2 readiness, project/deadline state, active request state, prior participation and project capacity immediately before insert.

### I. Qualification state lacked a reusable structured reason contract — FIXED

`resolveMemberProjectQualification()` now returns `{state, reason, eligible}` with structured reasons such as `ELIGIBLE`, `PROFILE_INCOMPLETE`, `INTEREST_EXISTS`, `PROJECT_CLOSED`, `CAPACITY_FULL`, `ALREADY_PARTICIPATING`, `DEADLINE_PASSED` and `CAPACITY_UNKNOWN`.

### J. Profile return allowed protocol-relative redirect — FIXED

`ProfileReturnAfterSave` now rejects `//`, backslash and foreign-origin targets before navigation.

### K. Focus after profile return was not restored — FIXED IN SOURCE

Profile repair returns to the exact project with `#member-decision-title`; the qualification heading is programmatically focusable and receives focus after return.

### L. Existing regression encoded the wrong role-first journey — FIXED

Blocking/domain/authenticated/persistence tests were rewritten around Submit Interest, project capacity and no mandatory role selection.

### M. PostgreSQL allowed duplicate active role-neutral interests under concurrency — FIXED

The historical `unique(project_id,user_id,project_role_id)` constraint does not protect rows where `project_role_id` is `NULL`, because ordinary PostgreSQL unique constraints treat nulls as distinct. Phase 5 intentionally persists initial interest without a formal role, so concurrent requests could create duplicate active interests even though the API performed a pre-check.

A versioned migration now creates `project_applications_one_active_interest_per_project_user`, a partial unique index on `(project_id,user_id)` for active `application_kind='interest'` rows. An isolated Supabase test now proves a second active role-neutral interest is rejected with PostgreSQL `23505`.

## 4. Frontend / UX review

Source result: **PASS WITH BROWSER EVIDENCE PENDING**.

The member page now prioritizes:

- project state and qualification;
- one Submit Interest action;
- explicit profile-readiness repair;
- team/capacity context;
- transparent advisory fit;
- informational contribution areas;
- existing-interest/participation state;
- clear next-step explanation.

No hidden fit score is rendered and no formal role choice is required.

## 5. Backend / state-transition review

Source result: **PASS WITH RUNTIME EVIDENCE PENDING**.

The shared domain qualification contract handles current request/membership/project/profile/capacity/deadline state. The member page and Phase 6 route consume the same state resolver. The API independently re-reads persisted state immediately before insert to protect against stale browser state and direct requests.

Existing interest and participation override new-interest eligibility. Declined/withdrawn historical requests do not permanently block a new interest journey.

## 6. Supabase / PostgreSQL / schema review

Source result: **PASS WITH MIGRATION/RUNTIME EVIDENCE PENDING**.

Phase 5 reuses versioned:

- `profiles` and preference relations;
- `projects` and Phase 3 participation fields;
- `project_runs`;
- `project_members`;
- `project_applications`;
- canonical project taxonomy/content relations.

Phase 5 adds no fit-score table, duplicate tracker, role-reservation table or dashboard-only field. It does add one required repository-versioned database index migration:

- `20260905170000_project_experience_phase_5_interest_uniqueness.sql`
- `project_applications_one_active_interest_per_project_user`

This migration closes the role-neutral interest uniqueness gap while preserving legacy role-specific application handling.

Clean isolated migrations and hosted-equivalent schema validation remain **PENDING CI**.

## 7. RLS / security / privacy review

Source result: **PASS; RUNTIME SECURITY EVIDENCE PENDING**.

- member profile/preferences remain owner-scoped;
- request/membership state remains user-or-admin scoped;
- authenticated user ID is derived from session, not client member ID;
- public-safe project resource projection strips private URLs/storage/review evidence;
- interest submission does not create project membership or Lab access;
- safe profile return now rejects protocol-relative/external targets;
- isolated cross-user RLS test is part of smoke/staging suites;
- isolated database test now covers duplicate role-neutral interest rejection.

## 8. Form / validation / submission review

Phase 5 does not create an interest record merely by viewing or clicking the member page.

The Phase 6 interest form is now role-neutral and persists only on final Submit Interest. `/api/project-applications` performs authoritative qualification immediately before insert and detects an existing active request. PostgreSQL now independently enforces one active role-neutral interest per member/project, so the final write path is race-safe for Phase 5 interest.

Legacy role-specific `application` handling remains only for regression compatibility and no longer controls initial Phase 5 interest.

## 9. Public / Member / Admin / Discover / Lab review

- **Public:** same canonical project; Phase 4 auth return remains entry path.
- **Member:** owns qualification, team state and Submit Interest decision.
- **Applications:** remains current request tracker.
- **Admin:** remains downstream reviewer of persisted interest/application records.
- **Discover:** continues using same project identity/catalogue.
- **Lab:** remains protected until actual membership; applicant status does not grant team resources.

Exact-head regression evidence remains pending.

## 10. Responsive / accessibility review

Source contract now includes:

- 320/375/390/414 mobile;
- 768/1024 tablet/desktop transition;
- 1440 desktop;
- 200% reflow;
- visible focus;
- non-colour status text;
- semantic project/team/qualification headings;
- no required role radios;
- focus restoration after profile completion;
- sticky mobile Submit Interest only when eligible.

Browser/accessibility execution remains **PENDING**.

## 11. Test / CI review

Updated Phase 5 coverage includes:

- one dominant Submit Interest CTA;
- no mandatory role selection / no role query;
- advisory fit behavior;
- structured qualification reasons;
- project-level team/capacity state;
- exact active-interest detection;
- Phase 2 readiness reuse;
- role-neutral interest persistence with `project_role_id = null`;
- API profile/project/capacity/prior-participation revalidation;
- duplicate active role-neutral interest protection at PostgreSQL level;
- owner-scoped profile/preference RLS;
- cross-user project-request read/update IDOR protection;
- applicant does not receive project membership/Lab access;
- safe profile return source contract;
- responsive member project journey;
- existing legacy application regression.

Final exact-head approval still requires lint, typecheck, build, all blocking regression, clean isolated Supabase/migrations/RLS, authenticated browser, responsive/accessibility, Event Room and protected Release Gate.

## 12. Remaining risks and Director decision

Runtime evidence still required for material acceptance journeys including:

- profile-save failure/value retention;
- full/late-join/race capacity cases;
- cross-user application IDOR execution;
- applicant cannot access Lab/team-private resources;
- username-change request continuity;
- full signup/verification/onboarding return;
- keyboard/screen-reader/focus-after-return execution;
- clean application of the new Phase 5 uniqueness migration;
- exact-head repository regressions and release gates.

No analytics framework/convention was found in the repository to reuse; Phase 5 therefore does not invent a new analytics infrastructure or log sensitive qualification data.

# FINAL DIRECTOR DECISION

**NOT APPROVED**

The source architecture is aligned with the binding Phase 5 contract and the newly discovered database race condition has been fixed with a repository migration plus isolated Supabase coverage. Approval still requires the documentation-inclusive exact head to produce the mandatory runtime, migration, RLS, browser, accessibility and release-gate evidence. Source review or queued workflows are not sufficient for approval.
