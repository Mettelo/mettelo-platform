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

No new table or hosted-only database field is required for the first Phase 5 implementation. Fit is calculated from canonical server-read data and is not persisted as a hidden score.

## Product rules

1. Fit guidance must be transparent. Do not create an opaque percentage/ranking that implies Mettelo has objectively scored a person's suitability.
2. A member can see why a signal is aligned, needs review, or represents a capacity gap.
3. Soft mismatch does not automatically reject a member.
4. Profile readiness remains a structured prerequisite for the downstream submission journey.
5. Role capacity remains server-authoritative and separate from personal fit.
6. Role selection is explicit and happens after fit review.
7. Phase 5 must not perform the final application insert/update owned by Phase 6.
8. Existing application/membership states remain authoritative for members who already applied or joined.
9. Project/member/Admin continue to read the same canonical project identity and state.
10. Lab remains out of scope until accepted membership/delivery state.

## Fit signals

The initial transparent evaluator uses only structured data already present in the product:

- domain preference overlap;
- tool preference overlap;
- saved weekly capacity compared with published project commitment where safely parseable;
- recorded experience level compared with governed project difficulty where safely normalisable;
- per-role skill overlap;
- per-role preferred-role overlap.

Signals are labelled `match`, `review`, or `gap`. They are guidance, not an acceptance decision or guarantee.

Free-text experience/application requirements are shown for manual member review and are not converted into a hidden automated rejection rule.

## Supabase / PostgreSQL review

### Schema

No Phase 5 schema addition is currently required. The necessary canonical fields and relationships already exist.

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

### RLS/security expectations

- profile/preferences must remain scoped to the authenticated user;
- project reads must remain restricted to public/member-visible projects;
- application/membership reads must remain scoped to the authenticated user;
- Phase 5 must not require service-role access for member fit;
- role capacity remains derived through the existing protected backend contract;
- no fit result is exposed publicly.

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
- no premature hero-level `Apply now` action;
- Phase 6 handoff only after the member selects an available role and is otherwise application-ready.

Copy must avoid presenting fit guidance as a guarantee or rejection decision.

## Accessibility / responsive contract

Phase 5 must preserve:

- semantic section headings and navigation;
- text labels for every fit state (not colour-only);
- keyboard-accessible role selection;
- visible focus;
- mobile/desktop action parity;
- 320px and 200% reflow without horizontal page overflow;
- actionable profile-readiness links with safe return to the same project.

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
10. Soft fit mismatches do not create an automatic rejection.
11. Hero no longer bypasses Phase 5 with `Apply now`.
12. Role selection is explicit.
13. Phase 6 application route remains the only submission destination.
14. Existing application/membership states still route correctly.
15. No service-role workaround is introduced for member reads.
16. No new Supabase schema is added unless a demonstrated data-contract need is found.
17. RLS/security regression passes.
18. Lint/typecheck/build pass.
19. Blocking regression passes.
20. Authenticated browser journey passes on mobile/tablet/desktop and 200% reflow.
21. Existing Public/Admin/Lab/project/application journeys remain regression-safe.
22. Director sign-off includes an explicit Supabase/schema/RLS result.

## Current implementation status

Implemented in the first Phase 5 slice:

- stacked Phase 5 branch based on the frozen Phase 4 candidate;
- `lib/member-project-fit.ts` transparent evaluator;
- canonical member preference/domain/tool reads on `/member/discover/[id]`;
- dedicated member fit/readiness UI;
- hero `Review your fit` action instead of premature `Apply now`;
- role-level fit signals and explicit role selection;
- profile-readiness repair link preserving project context;
- Phase 6 handoff remains `/member/discover/[id]/apply?role=...`;
- blocking `project-experience-phase5-member-fit.spec.ts` coverage.

This document is an implementation contract, not a Director approval. Phase 5 remains in development until exact-head validation and formal sign-off are complete.
