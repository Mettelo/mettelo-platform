# Phase 4 — Director Sign-off Review

## Review authority

This Director review now uses `docs/PROJECT-EXPERIENCE-PHASE-4-FULL-ACCEPTANCE-REVIEW.md` as the detailed evidence ledger for all 83 user stories, 58 mandatory test journeys and the 63-point Director checklist.

The previous Phase 4 review was not sufficient because it treated the earlier public discovery implementation as materially complete before reconciling every user story in the stricter acceptance authority supplied on 5 September 2026.

## Decision state

**NOT APPROVED — final documentation-inclusive exact-head release evidence pending.**

Phase 5 remains held.

## Additional defects found by the strict acceptance review

The stricter review found material Phase 4 gaps beyond the original A–H remediation:

I. `/projects` still contained an actual public `SubmissionForm` / `project_application` flow, violating the Phase 4→6 boundary.

J. Public project detail used `Continue to apply` semantics instead of the required `Submit interest` CTA and allowed contribution areas to read like public application choices.

K. New-user signup/onboarding did not reliably preserve the exact originating project through email/social signup, verification and Phase 2 onboarding.

L. Rich canonical public detail fields existed in the Phase 3 model but several were not surfaced: supporting objectives, key questions, scope, public resource provenance, timeline, Proof potential and team/basic eligibility context.

M. Public project detail lacked project-specific canonical/share metadata and hidden/nonexistent project noindex handling.

N. `/projects` had no route-level loading state.

O. Catalogue cards did not explicitly expose the full comparison metadata required by the acceptance contract, notably experience level and capability tags.

## Remediation result

**Implementation remediation: PASS for I–O. Runtime/visual sign-off: PENDING.**

- Removed the public submission form entirely. Phase 4 now hands the canonical project ID to `/member/discover/[id]`; Phase 6 remains the submission owner.
- Open public opportunities use the exact `Submit interest` CTA. Closed projects expose a truthful `Interest closed` state.
- Public contribution areas are informational. Detailed eligibility/role selection remains an authenticated Phase 5 concern.
- Existing Phase 1 authentication and Phase 2 onboarding now carry a sanitised internal project return target through email signup, social signup, verification, onboarding completion and back to the exact project.
- Public detail now renders canonical challenge/context/use case/objectives/questions/scope/resources/deliverables/success standards/capabilities/timeline/Proof potential/team structure without creating a duplicate data model.
- Proof copy explicitly states that completing a project does not automatically create verified Mettelo Proof.
- Public detail metadata now uses visibility-gated canonical title/summary/canonical URL/OpenGraph/Twitter metadata; hidden/nonexistent projects are noindex.
- `/projects/loading.tsx` provides a route-level accessible loading state.
- Project cards now show canonical domain/experience, participation, duration/weekly commitment, bounded capability tags, contribution areas, tools/methods and canonical availability.
- `tests/project-experience-phase4-acceptance-contract.spec.ts` protects the new Phase 4 boundary and is part of `test:regression`.

## Architecture result

**PASS implementation.**

Phase 4 still uses one canonical Phase 3 project architecture. No duplicate project table, public-only project model, parallel lifecycle, new qualification engine or parallel application endpoint was introduced.

The public catalogue remains sourced through the anon/public Supabase client and governed canonical relations. The public detail continues through the versioned read-only `get_public_project_experience_detail(uuid)` projection. Member qualification/application remains owned by `/member/discover/[id]` and later phases.

The catalogue loader uses bounded server batches and only the current 12-item page is rendered to the browser. Database-side filter push-down is a future scale optimisation to monitor as catalogue volume grows materially; it is not implemented as a second catalogue/filter engine because duplicating the canonical TypeScript filtering/availability logic would violate the one-engine contract.

## Supabase / security result

**PASS implementation. Exact-head runtime security evidence pending.**

The Phase 4 public-detail migration remains versioned in:

`supabase/migrations/20260905143000_project_experience_phase_4_public_detail_projection.sql`

The read function is visibility/status gated, read-only, fixed-search-path, filters resources to public/publish-permitted/green metadata, excludes protected URLs/storage/access/review/run-scoped data, and grants execution only to intended browser roles.

Public catalogue/detail reads do not introduce a service-role dependency.

## Public journey result

The intended public journey is now:

`/projects` → search/filter/compare → `View project` → public decision surface → `Submit interest` → existing sign in/sign up when required → username/verification/onboarding when required → exact `/member/discover/[projectId]` continuation.

There is no actual Phase 4 public interest form.

## UI / UX / accessibility result

**Source implementation: PASS. Final browser evidence: PENDING.**

The accepted Mettelo catalogue/detail design system is preserved. The strict review added missing content within existing layout primitives rather than introducing a parallel redesign.

Required final browser evidence still includes mobile/tablet/desktop, 320px, 200% reflow, long-card/detail content, filter focus/Escape/return, keyboard discovery, screen-reader semantics, touch targets and visible focus.

## Test evidence required on the final exact head

The final documentation-inclusive SHA must pass, without exception:

- lint;
- typecheck;
- interaction/content/regression audits;
- `tests/project-experience-phase4-acceptance-contract.spec.ts` through the blocking regression command;
- public catalogue filtering/browser regression;
- clean isolated Supabase migration startup;
- Phase 4 public RPC/RLS/leakage security coverage;
- authenticated/member safe-return regression;
- signup → verification → onboarding → exact-project return journey;
- persistence/form regressions outside the removed Phase 4 public form;
- mobile/tablet/desktop/200% accessibility evidence;
- production build;
- Event Room Phase 1–12 Contract;
- protected Release Gate Status Bridge.

Previous green runs from older SHAs are supporting evidence only and cannot approve the final Phase 4 head.

## Remaining risks

1. Exact-head runtime/browser/release evidence is still pending and can reveal defects that must be fixed before approval.
2. PR #213 remains intentionally stacked on Phase 3 / PR #212; the merge owner must preserve the Phase 1–3 contracts when dependency ordering changes.
3. Catalogue database-side filter push-down should be reconsidered at materially larger catalogue scale; the current bounded-batch server strategy avoids browser-wide catalogue transfer and preserves one canonical filter/availability engine.

## SIGN-OFF

**NOT APPROVED.**

All currently known strict Phase 4 implementation gaps have been remediated, but approval is prohibited until the final documentation-inclusive exact head completes the full mandatory runtime, security, responsive/accessibility and protected release evidence. Phase 5 must remain on hold until then.