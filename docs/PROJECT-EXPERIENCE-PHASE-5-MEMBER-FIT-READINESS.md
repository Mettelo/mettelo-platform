# Project Experience Phase 5 — Member Fit & Readiness

## Purpose

Phase 5 is the authenticated decision layer between Phase 4 public discovery and Phase 6 submission.

Canonical journey:

`PUBLIC PROJECT → AUTH → SAME MEMBER PROJECT → UNDERSTAND PERSONAL FIT → REVIEW PROFILE READINESS → REVIEW ROLE FIT/CAPACITY → SELECT CONTRIBUTION AREA → CONTINUE TO PHASE 6 SUBMISSION`

Phase 5 does **not** submit an application, create a second application endpoint, reserve a role, auto-accept a member, or create a separate project model.

## Architecture boundary

Phase 5 consumes the existing canonical architecture:

- `projects` and Phase 3 participation fields;
- `project_roles` and governed role capacity;
- `project_domains`, `project_tools`, `project_methods`;
- member `profiles`;
- `profile_domain_preferences` and `profile_tool_preferences`;
- existing application/membership state for journey continuity;
- existing Phase 6 application route as the downstream handoff only.

No new table or hosted-only database field is required. Fit is calculated from canonical server-read data and is not persisted as a hidden score.

## Product rules

1. Fit guidance must be transparent. Do not create an opaque percentage/ranking that implies Mettelo has objectively scored a person's suitability.
2. A member can see why a signal is aligned, needs review, or represents a capacity gap.
3. Soft mismatch does not automatically reject a member.
4. A genuine weekly-capacity shortfall is a hard readiness gap because the member cannot currently meet the project's minimum published commitment.
5. Profile readiness remains a structured prerequisite for the downstream submission journey.
6. Role capacity remains server-authoritative and separate from personal fit.
7. Role selection is explicit and happens after fit review.
8. Phase 5 must not perform the final application insert/update owned by Phase 6.
9. Existing application/membership states remain authoritative for members who already applied or joined.
10. Project/member/Admin continue to read the same canonical project identity and state.
11. Lab remains out of scope until accepted membership/delivery state.

## Fit signals

The transparent evaluator uses only structured data already present in the product:

- domain preference overlap;
- tool preference overlap;
- saved weekly capacity compared with published project commitment where safely parseable;
- recorded experience level compared with governed project difficulty where safely normalisable;
- per-role skill overlap;
- per-role preferred-role overlap.

Signals are labelled `match`, `review`, or `gap`.

`review` signals are guidance only and do not automatically reject a member. Experience/domain/tool mismatches remain advisory because the available metadata is not sufficient for a defensible automated rejection rule.

The weekly-capacity signal has one hard rule: compare the member's maximum saved weekly capacity with the project's minimum published weekly commitment. Example: `4–6 hours/week` can meet a `5–8 hours/week` project because 6 >= 5. `Up to 3 hours/week` cannot meet that project's 5-hour minimum and blocks Phase 6 handoff until the member's genuine availability changes or they choose another project. Unparseable/flexible values return `review`, not a false rejection.

Free-text experience/application requirements are shown for manual member review and are not converted into a hidden automated rejection rule.

## Supabase / PostgreSQL review

### Schema

No Phase 5 schema addition is required. The necessary canonical fields and relationships already exist.

### Reads

Authenticated member detail reads:

- the visible canonical project and governed taxonomy relations;
- the authenticated user's own profile;
- the authenticated user's own domain/tool preferences;
- that user's application/membership state;
- role capacity through the existing canonical capacity helper.

### Writes

Phase 5 adds no fit-score write, application write, membership write, role-reservation write or Lab write.

The application form/write path remains Phase 6.

### RLS/security review

Existing versioned migrations already enforce the Phase 5 privacy boundary:

- `profiles` SELECT/INSERT/UPDATE is owner-scoped to `auth.uid()` for authenticated users;
- `profile_domain_preferences` SELECT/INSERT/DELETE is owner-scoped to `auth.uid()`;
- `profile_tool_preferences` SELECT/INSERT/DELETE is owner-scoped to `auth.uid()`;
- project visibility remains authoritative for project reads;
- application/membership reads remain owner-or-admin scoped;
- Phase 5 member fit itself does not use service-role access;
- existing service-role use for aggregate role-capacity calculation remains a protected backend capacity contract, not a profile/preferences bypass;
- no fit result is exposed publicly or persisted.

Runtime proof is now included in `tests/project-experience-phase5-member-fit-security.spec.ts`. On the disposable local Supabase stack it signs in as the member, proves that member can read their own profile/domain/tool preference rows, and proves another disposable user's corresponding rows are invisible under RLS.

## UX contract

The authenticated project detail must provide:

- clear project context;
- a dedicated `Your fit & readiness` section;
- profile-readiness state;
- transparent fit signals and explanations;
- role-level fit signals;
- available capacity;
- explicit contribution-area selection;
- clear action to resolve missing profile requirements;
- clear action to review a genuine weekly-capacity gap;
- no premature hero-level `Apply now` action;
- Phase 6 handoff only after the member selects an available role, meets profile readiness and has no hard capacity gap.

The Phase 6 page independently re-checks both selected-role availability and the same weekly-capacity contract. Direct/manual URLs therefore cannot bypass the Phase 5 decision gate.

Copy must avoid presenting advisory fit guidance as a guarantee or rejection decision.

## Accessibility / responsive contract

Phase 5 must preserve:

- semantic section headings and navigation;
- text labels for every fit state (not colour-only);
- keyboard-accessible role selection;
- visible focus;
- mobile/desktop action parity;
- 320px and 200% reflow without horizontal page overflow;
- actionable profile/capacity links with safe return to the same project.

## Success criteria

Phase 5 cannot be signed off until all of the following are true:

1. Authenticated member returns to the exact Phase 4 project.
2. Fit uses canonical project/member data only.
3. No duplicate eligibility/application architecture exists.
4. Member sees profile-readiness requirements clearly.
5. Member sees transparent domain/tool/commitment/experience signals.
6. Member sees role-specific fit context.
7. Role capacity is server-authoritative.
8. Unavailable roles cannot be selected for submission.
9. Missing profile requirements block the submission handoff without blocking project review.
10. Genuine weekly-capacity shortfall blocks submission and is actionable.
11. Overlapping capacity ranges are not falsely rejected; member maximum is compared with project minimum.
12. Unparseable commitment values degrade to manual review instead of automatic rejection.
13. Soft fit mismatches do not create an automatic rejection.
14. Hero no longer bypasses Phase 5 with `Apply now`.
15. Role selection is explicit.
16. Direct Phase 6 route access cannot bypass selected-role or hard-capacity readiness.
17. Phase 6 application route remains the only submission destination.
18. Existing application/membership states still route correctly.
19. No service-role workaround is introduced for member profile/preferences reads.
20. No new Supabase schema is added unless a demonstrated data-contract need is found.
21. Profile/preferences cross-user RLS regression passes on isolated Supabase.
22. Lint/typecheck/build pass.
23. Blocking regression passes.
24. Authenticated browser journey passes on mobile/tablet/desktop and 200% reflow.
25. Existing Public/Admin/Lab/project/application journeys remain regression-safe.
26. Director sign-off includes an explicit Supabase/schema/RLS result.

## Current implementation status

Implemented:

- stacked Phase 5 branch based on the frozen Phase 4 candidate;
- `lib/member-project-fit.ts` transparent evaluator;
- canonical member preference/domain/tool reads on `/member/discover/[id]`;
- dedicated member fit/readiness UI;
- hero `Review your fit` action instead of premature `Apply now`;
- role-level fit signals and explicit role selection;
- profile-readiness repair link preserving project context;
- minimum-commitment weekly-capacity comparator;
- hard weekly-capacity gap enforcement in both Phase 5 UI handoff and Phase 6 entry route;
- Phase 6 handoff remains `/member/discover/[id]/apply?role=...`;
- blocking `project-experience-phase5-member-fit.spec.ts` coverage;
- isolated `project-experience-phase5-member-fit-security.spec.ts` RLS coverage;
- Phase 5 security test added to authenticated smoke/staging suites.

Current validation state:

- source/architecture review: in progress, no material schema addition identified;
- Supabase/RLS source review: PASS for owner-scoped profile/preferences policies;
- isolated Supabase runtime security: PENDING exact-head CI execution;
- lint/typecheck/build/regression: PENDING exact-head CI execution;
- authenticated responsive/browser evidence: PENDING exact-head CI execution;
- Director sign-off: NOT APPROVED while runtime gates are pending.

This document is an implementation contract and evidence ledger, not a Director approval. Phase 5 remains in development until exact-head validation and formal sign-off are complete.
