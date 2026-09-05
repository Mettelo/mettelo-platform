# Project Experience Phase 6 — Interest Submission & Persistence

**Status:** IN PROGRESS  
**Dependency:** Phase 5 Member Project Experience & Qualification  
**Branch:** `feature/project-experience-phase-6-interest-submission`

## Phase purpose

Phase 6 owns the actual member **Submit Interest** form, authoritative submission validation, persistence, confirmation, tracker continuity and downstream Admin notification/review handoff.

It begins only after Phase 5 has decided that the member may enter the submission journey. Phase 6 must still revalidate authoritative server/database state at final submit because browser qualification can become stale.

Canonical journey:

`MEMBER PROJECT → SUBMIT INTEREST → COMPLETE INTEREST FORM → REVIEW → ACCEPT TERMS → SERVER REVALIDATION → PERSIST INTEREST → MEMBER CONFIRMATION → APPLICATIONS TRACKER → ADMIN REVIEW → TEAM FORMATION → LATER ROLE ASSIGNMENT`

## Binding boundaries

Phase 6 MUST:

- use the canonical `/member/discover/[id]/apply` route;
- use the canonical `/api/project-applications` endpoint;
- create `application_kind='interest'` for initial project interest;
- keep `project_role_id = null` for the initial interest;
- not require a formal role selection before interest;
- revalidate authenticated identity, profile readiness, lifecycle/deadline, existing active request, prior/current participation and current project capacity immediately before insert;
- persist only after explicit final submission;
- preserve entered values after validation/network failure;
- show clear validation, submitting, error and success states;
- route successful members to the existing Applications tracker;
- notify the member and Admin after successful persistence without making notification delivery a prerequisite for database success;
- keep Admin and member tracker views on the same canonical `project_applications` record;
- preserve legacy role-specific `application` handling only where existing product flows still require it;
- never create `project_members` or grant Lab access merely because interest was submitted.

Phase 6 MUST NOT:

- create a second application/interest table;
- create a new tracker parallel to `/member/applications`;
- reserve or assign a formal project role during initial interest;
- trust project/member/status/capacity values supplied by the browser;
- use service role as a workaround for broken member insert/read RLS;
- expose another member's request;
- grant Lab/team-private resource access before approved membership;
- silently create hosted-only database changes.

## Form contract

The initial interest form should collect only information appropriate before formal team assignment:

1. availability/context for this project;
2. how the member could contribute;
3. optional professional evidence link;
4. optional willingness to be considered for team leadership;
5. Project Participation Terms acceptance;
6. final review before submission.

Formal contribution role selection belongs to later review/team-formation workflow, not initial interest.

## Server/API contract

At final POST the server must independently verify:

- authenticated Supabase user;
- canonical project exists and is visible to the member;
- project lifecycle permits new interest;
- deadline has not passed;
- Phase 2 profile readiness is still satisfied;
- no active exact-user/exact-project request already exists;
- the member is not already waiting/active/completed on the project;
- canonical project-level capacity is known and available;
- contribution statement validation;
- optional professional URL normalization/validation;
- current participation terms version and explicit acceptance.

Successful persistence must return the canonical application/request identifier and status.

Known product-state failures must use stable error codes such as:

- `AUTH_REQUIRED`
- `PROFILE_INCOMPLETE`
- `PROJECT_CLOSED`
- `DEADLINE_PASSED`
- `CAPACITY_UNKNOWN`
- `CAPACITY_FULL`
- `ALREADY_PARTICIPATING`
- `DUPLICATE_APPLICATION`
- `TERMS_REQUIRED`
- `TERMS_VERSION_CHANGED`
- `VALIDATION_ERROR`

## Supabase/PostgreSQL contract

Canonical tables/relations:

- `auth.users`
- `profiles`
- `projects`
- `project_applications`
- `project_members`
- `project_runs`
- profile domain/tool preference relations
- notification records used by existing Mettelo notification infrastructure

Required database guarantees:

- `project_applications.user_id` remains tied to authenticated user identity;
- `project_applications.project_id` remains tied to canonical project identity;
- `project_role_id` remains nullable for interest;
- `application_kind` permits `interest` and `application` only;
- active role-neutral interest is unique per `(project_id,user_id)` through the repository-versioned Phase 5 partial unique index;
- RLS permits members to create/read their own request and blocks cross-user access;
- Admin reads the same canonical record under existing Admin authorization;
- failed/duplicate insert cannot create partial membership or Lab state;
- all required schema/index/constraint changes are versioned under `supabase/migrations`.

## Downstream role/team contract

Phase 6 interest is deliberately role-neutral. The downstream rules are:

1. Admin may move an `interest` through review/shortlist/approval without fabricating a role.
2. Approval creates the existing `project_members` waiting place with `project_role_id = null` for an interest.
3. Legacy `application` rows continue to require their existing valid role and role-capacity checks before approval.
4. The existing Team Formation surface owns later formal role assignment.
5. `assign_role` writes the chosen role to both `project_members.project_role_id` and the linked `project_applications.project_role_id`.
6. `assessProjectTeamReadiness()` requires responsibility coverage (`project_role_id` present for every selected member) before the project can start.
7. Therefore role-neutral interest does not bypass the responsibility/readiness gate; it only moves role assignment to the approved later stage.

## Integration defects found and fixed during Phase 6

### A. Member tracker described every request as an application — FIXED

`/member/applications` remains the canonical route, but the UI now distinguishes project `interest` from legacy `application` records. New interest cards/dialog/withdrawal copy use interest/request language without creating a second tracker.

### B. Admin discarded `application_kind` before rendering — FIXED

Admin now carries `application_kind` into the queue, labels project interests truthfully and generates member communication using the correct interest/application noun.

### C. Role-neutral interest could never be approved — FIXED

The existing Admin approval API previously rejected every row with `project_role_id = null`. Phase 6 interests necessarily have `project_role_id = null`, creating a dead-end after successful submission. The approval path now permits role-neutral interests to create a waiting team place; legacy applications retain role validation/capacity checks.

### D. Later responsibility gate verified — PASS IN SOURCE

Team Formation already supports explicit role assignment and persists that assignment back to membership and request state. Project readiness does not allow a team to start until every selected member has a formal project role, so the corrected Phase 6 flow preserves downstream governance.

## UI/UX requirements

The form must be usable at 320px through desktop and at 200% text size.

Required states:

- default;
- validation error;
- field-level URL error;
- terms-not-accepted;
- submitting/disabled;
- backend product-state error;
- network/server failure with values preserved;
- duplicate/already-submitted handling;
- success confirmation.

Accessibility requirements:

- logical heading structure;
- visible keyboard focus;
- minimum practical touch targets;
- programmatic focus after moving between form steps where appropriate;
- status/error messages announced;
- labels associated with all inputs;
- no state communicated by colour alone;
- dialog focus/keyboard behavior for participation terms;
- no horizontal clipping at 200% reflow.

## Downstream integration review

Phase 6 must explicitly review and protect:

- `/member/applications` tracker;
- Admin project application/interest review;
- notifications/email;
- project capacity/team formation behavior;
- withdrawal behavior;
- accepted/waiting membership conversion;
- later formal role assignment;
- responsibility coverage/readiness gate;
- Mettelo Lab authorization boundary;
- Public/Discover regression;
- existing legacy role-specific application flow.

## Test coverage added

`tests/project-experience-phase6-interest-submission.spec.ts` is included in blocking `test:regression` and protects:

- role-neutral final interest submission;
- authoritative server revalidation;
- PostgreSQL active-interest uniqueness invariant;
- interest-aware member tracker semantics;
- interest-aware Admin semantics;
- role-neutral Admin approval;
- preserved legacy application role checks;
- later Team Formation role assignment;
- responsibility coverage requirement before project start.

## Success criteria

Phase 6 is complete only when all are true:

1. Eligible Phase 5 member can enter the interest form without selecting a role.
2. No request exists before final submission.
3. Required fields and terms are validated.
4. Optional professional URL is normalized and safely validated.
5. Final submit revalidates all authoritative qualification state server-side.
6. Role-neutral interest persists to canonical `project_applications`.
7. Duplicate/race submission cannot create a second active interest.
8. Failed submissions preserve member-entered data.
9. Successful submission shows a clear confirmation.
10. Successful submission appears in the existing member Applications tracker with truthful interest semantics.
11. Successful submission is visible to existing Admin review on the same canonical row and is labelled as interest.
12. Member/Admin notifications are attempted after persistence and failures are observable without rolling back a valid request.
13. Interest submission does not create project membership or Lab access.
14. Admin can approve a role-neutral interest into team formation without fabricating a role.
15. Later role assignment remains explicit and required before readiness/start.
16. Member A cannot read/update Member B's request.
17. RLS insert/read/update behavior matches the frontend/backend contract.
18. Migrations reconstruct cleanly from repository state.
19. Schema constraints/indexes/FKs match the role-neutral interest model and legacy role-specific applications remain compatible.
20. Mobile/tablet/desktop/200%/keyboard/accessibility checks plus lint, typecheck, build, regression, isolated Supabase, authenticated E2E, Event Room and protected Release Gate are green on the final exact head.

## Sign-off rule

Phase 6 remains **NOT APPROVED** until implementation, database review, RLS/security review, full form/submission persistence testing and exact-head release evidence are all complete.
