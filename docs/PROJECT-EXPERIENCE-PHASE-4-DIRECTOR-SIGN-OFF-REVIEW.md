# Phase 4 — Director Sign-off Review

## Review scope

This review covers Project Experience Phase 4 — Public Project Discovery Experience across frontend, backend, Supabase/PostgreSQL, migrations, RLS/public-read boundaries, project catalogue filtering, public project detail, project availability/CTA behaviour, Project Architect/Admin compatibility, member continuation, Public/Discover/Lab dependencies, mobile/tablet/desktop behaviour, accessibility, analytics, regression coverage and documentation.

## Decision state

**NOT APPROVED.**

Phase 4 implementation is substantially complete and the material Supabase/public-read, participation and CTA defects found during Director review have been fixed. One remaining public card status-label inconsistency is still open, and the documentation-inclusive exact head has not yet completed the full protected release evidence.

A phase cannot be approved while either condition remains.

## 1. Success criteria

**Current result: FAIL for final sign-off.**

Implementation criteria are complete except for the remaining availability/status wording issue described below. Exact-head runtime evidence is also still required.

## 2. Related functionality reviewed

The review covered:

- canonical `public.projects` public discovery identity;
- Phase 3 Solo / Team / Flexible participation fields;
- legacy `team_size_threshold` compatibility;
- public catalogue loader and pagination;
- public search/filter/sort engine;
- public filter dialog and URL/history state;
- project cards;
- public project detail;
- role/career/capability/domain/tool/method facets;
- Capability Paths;
- shared project availability/lifecycle contract;
- public interest continuation;
- anonymous sign-in continuation to `/member/discover/[id]`;
- member project qualification/application ownership;
- Project Architect/Admin canonical project data compatibility;
- governed project resources;
- Lab/private resource boundaries;
- Proof/evidence presentation boundaries;
- public catalogue analytics;
- public regression and isolated-Supabase test coverage;
- responsive/accessibility contracts.

## 3. Issues found

### A. Flexible participation was invisible in public discovery

Public catalogue format was derived only from `team_size_threshold`, so a Phase 3 Flexible project could not be represented.

### B. Public project detail exposed only the legacy formation minimum

The detail decision panel could not communicate canonical participation plus minimum/target/maximum capacity.

### C. Public filter terminology was obsolete

The control still said `Solo / Team` even after Flexible became a canonical project mode.

### D. Rich public project detail depended on service-role-backed helpers

The base project row used the public Supabase client, but richer deliverables/resources/planning/role data was assembled through privileged server helpers. Although the application projection stripped sensitive URLs, this did not satisfy the Phase 4 rule that public discovery must not depend on service-role bypass of public data policy.

### E. Project cards offered `Submit interest` when canonical availability rejected interest

Closed, active, in-review, completed or otherwise unavailable projects could still expose a secondary interest CTA.

### F. Crafted public interest query could select an unavailable project

The interest-form project source included every public project rather than only projects whose shared availability decision allows interest.

### G. Frozen regression audit required obsolete privileged public helper names

After the secure public projection replaced those helpers, the repository-wide regression audit still required the old implementation detail and correctly blocked CI until the contract was updated.

### H. Remaining: card status headline can overstate availability

`statusLabel(status, availabilityLabel)` still returns `OPEN — APPLICATIONS AVAILABLE` for `open` / `recruiting` based on lifecycle status alone.

The same card's canonical availability object can simultaneously report a non-joinable condition such as an expired deadline or unavailable role capacity. The CTA/footer is now truthful, but the top status wording can still contradict it.

This is a Phase 4 UI/state consistency defect and remains a sign-off blocker.

## 4. Issues fixed

A–G have been fixed.

- Canonical `participation_mode`, `min_team_size`, `target_team_size`, `max_team_size` now flow through public discovery with legacy fallback.
- Solo / Team / Flexible are first-class public filter options.
- Project cards expose canonical participation summaries.
- Public detail exposes Participation and Capacity separately.
- Public filter wording is now participation-based.
- A versioned PostgreSQL public-safe projection replaces service-role-backed rich public reads.
- `Submit interest` is conditional on the shared `availability.acceptingInterest` result.
- The public interest form can only select projects with `acceptingInterest=true`.
- The frozen regression audit now requires the secure public RPC architecture while preserving authenticated member rich-data contracts.

Issue H remains open.

## 5. Supabase / schema / migration result

**Implementation result: PASS, exact-head clean-migration evidence pending.**

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
- filters project resources to `sensitivity='public'`, `publish_policy='permitted'`, `governance_status='green'`;
- excludes protected resource URLs/storage/access/review fields;
- excludes run-scoped execution resources/milestones;
- revokes default public function access;
- grants execute only to `anon` and `authenticated`;
- does not mutate project data;
- does not change project IDs, foreign keys or Phase 3 constraints.

No hosted-only Phase 4 database change is part of the implementation.

## 6. RLS / security result

**Implementation result: PASS, exact-head isolated security execution pending.**

The public catalogue continues to use the anon/public Supabase client and `visibility='public'`.

The richer public detail now also uses the anon client through the narrow public-safe RPC instead of privileged rich-detail helpers.

Base protected-table policies are not weakened and public clients are not granted project/resource writes.

Dedicated test coverage verifies:

- public project detail no longer imports the privileged rich helpers;
- the RPC returns public rich detail for a public fixture;
- the same RPC returns `null` after the fixture is made private;
- protected resource-field names are absent from the public payload;
- fixture visibility is restored after the negative test.

## 7. Backend / API integrity result

**PASS implementation.**

There is no new Phase 4 mutation API.

Public discovery consumes canonical project state and existing lifecycle/availability rules.

Member qualification/application continues through `/member/discover/[projectId]`; Phase 4 does not duplicate readiness or application-state logic.

## 8. Form / journey regression result

**PASS implementation, exact-head execution pending.**

The public journey now preserves:

Public catalogue → filter/search → project card → public detail → sign-in if needed → exact member project continuation.

The public interest surface is now restricted to projects whose canonical availability accepts interest.

Phase 6 remains the owner of actual submission lifecycle semantics.

## 9. UI / UX review result

**FAIL final sign-off because Issue H remains.**

Positive results:

- accepted catalogue/card design preserved;
- participation is decision-useful and no longer inferred incorrectly;
- Flexible is visible;
- project detail exposes capacity without exposing future Phase 9 runtime semantics;
- unavailable projects remain readable rather than disappearing;
- misleading secondary interest CTA was removed from unavailable projects;
- loading/update, zero-result, database-error and active-filter states remain present;
- URL/back-forward filter behaviour is preserved.

Blocking result:

- card header status copy can still conflict with the canonical availability state for an `open/recruiting` record.

## 10. Mobile / accessibility result

**PASS source/test contract; final browser evidence pending.**

Existing blocking public discovery tests cover:

- 320px;
- 375px;
- 390px;
- 414px;
- 768px;
- 1024px;
- 1440px;
- 200% text reflow;
- no page-level horizontal overflow;
- labelled native selects;
- keyboard capability combobox;
- Escape close;
- focus return to filter trigger;
- live result count.

Phase 4 accessible terminology is `Project participation` / `Any participation`.

## 11. Tests executed and results

On the pre-final Phase 4 head containing the secure public RPC:

- lint: PASS;
- typecheck: PASS;
- interaction audit: PASS;
- regression coverage: FAIL because the frozen V2 audit still required the three removed privileged public helper names.

That failure was reviewed and corrected by changing the regression contract to require:

- `getPublicProjectExperienceData` on the public route;
- the anon/public RPC loader;
- the guarded public projection migration;
- absence of old privileged helper names on the public route;
- continued presence of the canonical rich helpers on the authenticated member route.

The exact head changed after that correction, CTA fixes and documentation; therefore earlier PASS results are supporting evidence only and cannot authorize final approval.

Final exact-head evidence still required:

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

1. Card status headline inconsistency described in Issue H must be fixed.
2. The final documentation-inclusive exact SHA must complete all release gates.
3. PR #213 is intentionally stacked on Phase 3 / PR #212; the merge owner must preserve the Phase 1–3 contracts when retargeting/rebasing after dependencies merge.

## SIGN-OFF

**NOT APPROVED.**

Phase 4 cannot be approved until the remaining status-label defect is fixed and the resulting documentation-inclusive exact head passes the full protected release evidence.
