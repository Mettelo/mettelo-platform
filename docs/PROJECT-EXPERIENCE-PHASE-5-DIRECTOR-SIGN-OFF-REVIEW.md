# Project Experience Phase 5 — Director Sign-Off Review

**Phase:** 5 — Authenticated Member Fit & Readiness  
**PR:** #214  
**Dependency:** Phase 4 / PR #213  
**Decision:** **NOT APPROVED**  

This review is the formal Director-level acceptance ledger for Phase 5. Source review can establish architectural correctness, but it cannot replace exact-head runtime evidence. Phase 5 remains Draft until every material gate below is evidenced on the final documentation-inclusive commit.

## 1. Phase success criteria

Canonical journey:

`PUBLIC PROJECT → AUTH → SAME MEMBER PROJECT → UNDERSTAND PERSONAL FIT → REVIEW PROFILE READINESS → REVIEW ROLE FIT/CAPACITY → SELECT CONTRIBUTION AREA → CONTINUE TO PHASE 6 SUBMISSION`

Phase 5 succeeds only when the authenticated member can make an informed, transparent fit/readiness decision without creating a second project model, second application engine, hidden suitability score, premature application write, role reservation, or Lab workflow.

Current source-review result: **PASS WITH RUNTIME EVIDENCE PENDING**.

## 2. Related functionality and regression surface

Reviewed direct and adjacent functionality:

- public Phase 4 project detail and exact-project authentication handoff;
- `/member/discover/[id]` authenticated project detail;
- canonical project lifecycle and participation model;
- member profile readiness;
- domain/tool profile preferences;
- project role metadata and capacity;
- existing application and membership lifecycle state;
- `/member/discover/[id]/apply` downstream Phase 6 entry;
- `/api/project-applications` final submission trust boundary;
- saved projects;
- member Discover catalogue;
- Admin/project governance as an unchanged upstream authority;
- Mettelo Lab as an unchanged downstream accepted-member workspace;
- public, authenticated, persistence and informational regression suites.

No Phase 5 change should redefine the canonical project identity, publication lifecycle, application persistence contract, Admin governance, or Lab authorization model.

## 3. Issues found during Director review

### A. Premature application CTA bypassed fit review — FIXED

The member hero previously exposed `Apply now` before the member reviewed fit or selected a contribution area. Phase 5 now routes eligible members to `#fit` using `Review your fit` / `Review fit` semantics.

### B. Direct application URL bypassed explicit role decision — FIXED

`/member/discover/[id]/apply` previously accepted entry without a selected role. It now requires a currently available `role` query parameter and redirects invalid/missing role entry back to `#roles`.

### C. Weekly commitment comparison produced false gaps — FIXED

The initial Phase 5 implementation compared maximum member capacity with maximum project commitment. This could incorrectly reject overlapping ranges. The canonical comparison now tests whether the member's maximum saved weekly capacity can meet the project's minimum published commitment.

Example: `4–6 hours/week` vs `5–8 hours/week` is aligned because 6 >= 5.

### D. Genuine capacity gaps did not block downstream submission — FIXED

A genuine capacity shortfall now blocks the Phase 6 handoff in both the Phase 5 UI and the Phase 6 entry route. Unparseable/flexible values degrade to `review` rather than a false rejection.

### E. Submission API could bypass Phase 5 hard capacity fit — FIXED

The existing application API already revalidated project lifecycle and server-authoritative role capacity, but a crafted direct POST could bypass the new Phase 5 weekly-capacity rule. `/api/project-applications` now reads the authenticated member's own `weekly_capacity` through RLS, reads the canonical project's `weekly_commitment`, runs the same `compareWeeklyCapacity()` contract, and rejects a genuine shortfall with `409 FIT_CAPACITY_GAP` before any application insert.

The persisted submission E2E now forces an under-capacity profile, submits directly to the API, requires the explicit error, and verifies that zero application rows are inserted.

### F. Advisory fit signals risked becoming automated eligibility rules — FIXED

Domain, tool and experience mismatches remain advisory. Only the defensible structured weekly-capacity minimum is currently treated as a hard fit gap. Copy explicitly states that fit signals are not an acceptance guarantee.

### G. Saved role preference labels could miss canonical role matches — FIXED

Saved profile labels such as `Data Analyst / BI` may be broader than the project role title `Data Analyst`. Deterministic normalized phrase containment now recognizes these cases without introducing fuzzy or AI-based ranking.

### H. Member preference/profile privacy required runtime proof — COVERAGE ADDED

Existing migrations already owner-scope profiles, domain preferences and tool preferences. A new isolated Supabase test now proves one disposable authenticated member cannot read another disposable user's corresponding records.

### I. Existing regression expected the retired direct-apply journey — FIXED

Member Discover browser/domain tests were updated from `Apply now` to the Phase 5 fit-first journey and explicit role selection.

### J. Role expectation disclosure lacked visible keyboard focus — FIXED

The role-level `<summary>` control was keyboard-operable but did not inherit the visible focus treatment used by the main project disclosures. The shared Phase 5 detail stylesheet now includes `.role details summary:focus-visible` in the explicit focus outline contract.

## 4. Frontend / UX review

Source result: **PASS, browser evidence pending**.

The authenticated detail now provides:

- project context before personal evaluation;
- `Your fit & readiness` section;
- profile readiness status;
- transparent fit signals;
- hard capacity-gap action where applicable;
- advisory signals that do not falsely reject;
- per-role fit context;
- backend-authoritative capacity;
- explicit role-selection buttons;
- Phase 6 CTA only after readiness + available role selection;
- mobile action parity;
- safe profile repair links returning to the same project.

No hidden percentage suitability score is rendered.

## 5. Backend / state-transition review

Source result: **PASS, exact runtime pending**.

Phase 5 introduces no new lifecycle state. Existing `resolveMemberProjectState()` remains authoritative for project/application/membership lifecycle. `memberProjectPrimaryAction(open_eligible)` now points to same-project fit review rather than directly to the application route.

The Phase 6 entry route independently validates:

- authenticated user;
- canonical visible project;
- application/membership state;
- generic application profile readiness;
- role-capacity availability;
- weekly-capacity hard-gap contract;
- explicit selected role.

The final application API independently revalidates the hard weekly-capacity gate and server-authoritative role capacity immediately before persistence. This prevents route/UI bypass and handles stale state between fit review and submission.

Existing application persistence contract and notifications remain otherwise unchanged.

## 6. Supabase / PostgreSQL / schema review

Source result: **PASS — no new schema required**.

Phase 5 reuses existing versioned schema:

- `profiles`;
- `profile_domain_preferences`;
- `profile_tool_preferences`;
- `projects`;
- `project_roles`;
- canonical project taxonomy relations;
- `project_applications`;
- `project_members` / project runs.

No Phase 5 table, column, trigger, function, index, or hosted-only schema dependency has been introduced because there is no demonstrated persistence requirement for fit results.

Fit results are derived request-time data and are not persisted. The final application API reads only the authenticated member's own weekly-capacity value through the existing owner-scoped RLS contract.

Clean isolated migration execution: **PENDING CI**.

## 7. RLS / security / privacy review

Source result: **PASS; isolated runtime result pending**.

Repository migrations establish:

- profile owner-only authenticated read/write policy;
- domain-preference owner-only SELECT/INSERT/DELETE policy;
- tool-preference owner-only SELECT/INSERT/DELETE policy;
- application owner-or-admin read policy;
- membership owner-or-admin read policy;
- canonical visibility policy for project reads.

Phase 5 profile/preferences reads use the authenticated Supabase client and explicit current-user filters. Service role is not used to fetch member profile/preferences or fit results.

The final submission API also reads `profiles.weekly_capacity` with the authenticated client and `id = user.id`; the new hard-fit enforcement does not create a service-role member-data bypass.

The existing protected server-side role-capacity helper remains the only privileged data dependency in the member detail/application boundary and is used for aggregate availability, not member-data authorization bypass.

`tests/project-experience-phase5-member-fit-security.spec.ts` must pass against the disposable local Supabase stack before approval.

## 8. Form / validation / submission review

Source result: **PASS for Phase 5 boundary; runtime pending**.

Phase 5 does not own the application form itself. It hands the member to the existing Phase 6 application form only after explicit role selection and readiness checks.

However, the downstream application API is a direct Phase 5 trust boundary because clients can call it without traversing the UI. It now enforces the Phase 5 hard weekly-capacity rule before insert, alongside existing lifecycle, terms, duplicate, prior-membership and role-capacity checks.

No new notification/email side effect is introduced by Phase 5. Rejected fit submissions occur before persistence and therefore before application notification side effects.

Existing final application persistence and Admin review must remain green as regression evidence.

## 9. Public / Member / Admin / Discover / Lab review

### Public

Phase 4 public discovery remains the entry surface. No public fit result or private member profile data is exposed.

### Member

Member detail is the owner of fit/readiness and role decision. Existing Applications and Projects continue to own post-submission and accepted-project states.

### Admin

No Admin workflow/schema is changed. Admin remains downstream reviewer of actual Phase 6 submissions. A blocked Phase 5 hard-fit request creates no application row and therefore no phantom Admin queue item.

### Discover

Member Discover continues to link to the same canonical project identity. Existing filtering/catalogue behavior is not replaced.

### Lab

No Lab route or authorization is added by Phase 5. Lab remains downstream of accepted project membership.

Regression evidence for all areas: **PENDING exact-head suites**.

## 10. Responsive / accessibility review

Source contract result: **PASS; browser evidence pending**.

Required evidence:

- 320px mobile reflow;
- 375/390/414px mobile coverage;
- tablet and desktop coverage;
- 200% text reflow without horizontal page overflow;
- keyboard-accessible role selection;
- visible focus including role expectation disclosures;
- fit state communicated with text, not colour alone;
- semantic section headings and in-page navigation;
- mobile/desktop CTA parity;
- safe return from profile-readiness actions.

The updated authenticated Member Discover visual suite covers the main widths and reflow journey, but it must execute successfully on the final exact head.

## 11. Test / CI review

Blocking/static Phase 5 coverage now includes:

- transparent fit-evaluator contract;
- capacity min/max comparison;
- broad saved-role preference matching;
- no premature hero application CTA;
- explicit available-role selection;
- Phase 6 direct-route selected-role enforcement;
- Phase 6 direct-route hard-capacity enforcement;
- profile readiness / fit / role-capacity separation;
- updated member journey domain contract.

Isolated authenticated Supabase coverage includes:

- own profile readable;
- other user's profile hidden;
- own domain preferences readable;
- other user's domain preferences hidden;
- own tool preferences readable;
- other user's tool preferences hidden;
- source contract prevents service-role profile/preferences reads.

Persisted submission coverage now additionally requires:

- valid fit-capable member can submit normally;
- direct API POST with a hard weekly-capacity gap returns `FIT_CAPACITY_GAP`;
- hard-gap POST creates zero `project_applications` rows;
- role-capacity, terms, URL validation, duplicate and Admin visibility regressions remain green.

Final exact-head approval requires:

- change-scope classification success;
- lint success;
- TypeScript success;
- all repository audits success;
- build success;
- blocking regression success;
- clean disposable Supabase startup/migrations;
- public regression staging shard success;
- authenticated QA staging shard success;
- persistence staging shard success;
- informational journeys reviewed for any Phase 5/direct-consequence failure;
- Event Room contract success;
- protected Release Gate success.

Current exact-head runtime result: **PENDING / NOT YET EVIDENCED**.

## 12. Remaining risks and Director decision

Known non-blocking design considerations:

- fit is intentionally deterministic and conservative; it should not evolve into hidden ranking without a separate product/privacy/fairness decision;
- free-text role/application requirements remain manual review because they are not structured enough for defensible automated eligibility;
- unparseable weekly-capacity/commitment values degrade to manual review rather than rejection;
- no fit persistence means results always reflect current canonical member/project data, which is desirable for Phase 5 but should remain explicit if future analytics are proposed.

Current material blocker:

- final documentation-inclusive exact-head runtime evidence has not completed.

# FINAL DIRECTOR DECISION

**NOT APPROVED**

Reason: the implemented Phase 5 architecture and source-level security review are currently acceptable, including server-authoritative enforcement of the only hard fit gate, but exact-head lint/typecheck/build, isolated Supabase/RLS execution, authenticated browser/responsive evidence, full regression, Event Room and protected Release Gate are mandatory and have not yet completed successfully on the final candidate.

Do not mark Phase 5 approved solely from source review or queued workflows.
