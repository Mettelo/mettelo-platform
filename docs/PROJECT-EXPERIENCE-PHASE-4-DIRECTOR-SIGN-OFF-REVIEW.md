# Phase 4 — Director Sign-off Review

## Review scope

This review covers Project Experience Phase 4 — Public Project Discovery Experience across frontend, backend, Supabase/PostgreSQL, migrations, public-read security, project catalogue filtering, public project detail, project availability/CTA behaviour, Project Architect/Admin compatibility, member continuation, Public/Discover/Lab dependencies, mobile/tablet/desktop behaviour, accessibility, analytics, regression coverage and documentation.

## Decision state

**NOT APPROVED — exact-head release evidence pending.**

All material Phase 4 implementation defects found during Director review have now been fixed. No intentionally deferred Phase 4 implementation defect is currently known. Final approval still requires the documentation-inclusive exact head to complete the full protected release evidence.

## 1. Success criteria

**Implementation: PASS. Final release sign-off: PENDING.**

The public discovery implementation now satisfies the defined Phase 4 architecture and product requirements. Runtime/release evidence is still required on the final exact SHA.

## 2. Related functionality reviewed

The review covered:

- canonical `public.projects` discovery identity;
- Phase 3 Solo / Team / Flexible participation fields;
- legacy `team_size_threshold` compatibility;
- public catalogue loader and pagination;
- public search/filter/sort engine;
- filter dialog and URL/history state;
- project cards and availability labels;
- public project detail;
- role/career/capability/domain/tool/method facets;
- Capability Paths;
- shared lifecycle/availability contract;
- public interest continuation;
- anonymous sign-in continuation to `/member/discover/[id]`;
- member qualification/application ownership;
- Project Architect/Admin canonical data compatibility;
- governed project resources;
- Lab/private resource boundaries;
- Proof/evidence presentation boundaries;
- public catalogue analytics;
- responsive/accessibility contracts;
- repository and isolated-Supabase regression coverage.

## 3. Issues found

A. Flexible participation was invisible in public discovery.

B. Public project detail exposed only the legacy formation minimum.

C. Public filter terminology still assumed Solo / Team only.

D. Rich public project detail depended on service-role-backed helpers.

E. Project cards exposed `Submit interest` when canonical availability rejected interest.

F. A crafted public `?interest=<id>` state could select an unavailable project.

G. The frozen regression audit required obsolete privileged public helper names after the secure public projection replaced them.

H. Card header status wording could still say applications were available for an `open/recruiting` lifecycle record even when the canonical availability result reported a deadline/capacity closure.

## 4. Issues fixed

**PASS. A–H are fixed.**

- Canonical `participation_mode`, `min_team_size`, `target_team_size`, `max_team_size` flow through public discovery with legacy fallback.
- Solo / Team / Flexible are first-class public filter options.
- Cards expose canonical participation summaries.
- Public detail exposes Participation and Capacity separately.
- Filter wording is participation-based.
- A versioned PostgreSQL public-safe projection replaces service-role-backed rich public reads.
- `Submit interest` and the public interest-form project set use the same `availability.acceptingInterest` decision.
- The regression audit requires the secure Phase 4 public RPC architecture while preserving authenticated member rich-data contracts.
- `pilot/open/recruiting` card header wording now uses the canonical availability label, so card header, footer and CTA cannot contradict one another.

## 5. Supabase / schema / migration result

**Implementation: PASS. Exact-head clean-migration execution: PENDING.**

Phase 4 introduces no duplicate project table or participation schema.

Versioned migration:

`supabase/migrations/20260905143000_project_experience_phase_4_public_detail_projection.sql`

adds:

`public.get_public_project_experience_detail(uuid)`

The function:

- is read-only;
- is `SECURITY DEFINER` with a fixed `search_path`;
- returns `null` unless the project is public and in an allowed public lifecycle state;
- returns only definition-level/public-safe fields;
- filters resources to `sensitivity='public'`, `publish_policy='permitted'`, `governance_status='green'`;
- excludes protected resource URLs/storage/access/review fields;
- excludes run-scoped execution resources/milestones;
- revokes default public function access;
- grants execute only to `anon` and `authenticated`;
- does not mutate project data;
- does not change project IDs, foreign keys or Phase 3 constraints.

No hosted-only Phase 4 database change is part of the implementation.

## 6. RLS / security result

**Implementation: PASS. Exact-head isolated security execution: PENDING.**

The public catalogue continues to use the anon/public Supabase client and `visibility='public'`.

Richer public detail now also uses the anon client through the narrow public-safe RPC instead of privileged rich-detail helpers. Protected base-table policies are not weakened and browser roles receive no project/resource write authority.

Dedicated security coverage verifies public-only visibility, private-project rejection, protected-field absence and fixture restoration.

## 7. Backend / API integrity result

**PASS implementation.**

Phase 4 adds no mutation API or parallel lifecycle. Public discovery consumes canonical project state and the existing lifecycle/availability rules. Member qualification/application continues through `/member/discover/[projectId]`.

## 8. Form / journey regression result

**PASS implementation. Exact-head execution pending.**

The intended journey is preserved:

Public catalogue → filter/search → project card → public detail → sign-in if needed → exact member-project continuation.

The public interest surface is restricted to projects whose canonical availability accepts interest. Phase 6 remains owner of actual submission lifecycle semantics.

## 9. UI / UX review result

**PASS implementation.**

- accepted catalogue/card design preserved;
- canonical participation is visible and decision-useful;
- Flexible is represented;
- capacity is understandable without inventing Phase 9 runtime behaviour;
- unavailable projects remain readable;
- secondary CTA state is truthful;
- card availability copy is consistent across header/footer/action;
- loading/update, zero-result, database-error and active-filter states remain present;
- URL/back-forward filter behaviour remains intact.

## 10. Mobile / accessibility result

**PASS source/test contract; final browser execution pending.**

Blocking public discovery coverage includes 320, 375, 390, 414, 768, 1024 and 1440 widths, 200% text reflow, horizontal-overflow checks, labelled controls, keyboard capability autocomplete, Escape close, focus return and live result count.

## 11. Tests executed and results

On a pre-final Phase 4 head containing the secure public RPC:

- lint: PASS;
- typecheck: PASS;
- interaction audit: PASS;
- regression coverage: initially FAIL because the frozen V2 audit required obsolete privileged public helper names.

That audit defect was fixed to enforce the new secure public contract. Later CTA/status/documentation changes changed the exact SHA, so previous PASS results are supporting evidence only.

Final exact-head evidence required:

- lint;
- typecheck;
- interaction audit;
- corrected regression coverage;
- public catalogue filtering tests;
- production build;
- clean isolated Supabase migration startup;
- Phase 4 public RPC/security test;
- public browser regression;
- authenticated/member continuation regression;
- persistence/form regression;
- responsive/200% browser evidence;
- Event Room contract;
- protected Release Gate.

## 12. Remaining risks

1. The final documentation-inclusive exact SHA has not yet completed all release gates.
2. PR #213 is intentionally stacked on Phase 3 / PR #212; the merge owner must preserve the Phase 1–3 contracts when retargeting/rebasing after dependencies merge.

No known Phase 4 implementation defect remains intentionally deferred.

## SIGN-OFF

**NOT APPROVED — exact-head release evidence pending.**

Implementation and Director remediation are complete. Approval requires the final exact head to pass the complete protected release evidence without a new Phase 4-related defect.