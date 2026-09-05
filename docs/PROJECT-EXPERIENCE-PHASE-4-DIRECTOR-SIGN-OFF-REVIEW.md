# PHASE 4 — DIRECTOR SIGN-OFF REVIEW

## Review authority

This is the formal Director review for **Project Experience Phase 4 — Public Project Discovery Experience**. It uses `PROJECT-EXPERIENCE-PHASE-4-FULL-ACCEPTANCE-REVIEW.md` as the detailed acceptance authority for all 83 user stories, 58 mandatory test journeys and the 63-point Director checklist.

The review covers frontend, backend/server contracts, Supabase/PostgreSQL, migrations, RLS/public-read boundaries, Auth return relationships, canonical project/member/Admin continuity, forms, state/CTA transitions, notifications side effects, Public/Discover/Lab separation, UI/UX, mobile/tablet/desktop, accessibility, analytics, tests and documentation.

## Decision state

**NOT APPROVED — final documentation-inclusive exact-head release evidence pending.**

Phase 5 remains held.

---

## 1. Success criteria

**Implementation review: PASS after remediation. Final release success criteria: PENDING exact-head runtime evidence.**

The Phase 4 architecture and user journey have been reconciled against the stricter acceptance authority. Approval remains prohibited until the final exact SHA completes the protected test, migration, security, browser, responsive/accessibility and release gates.

---

## 2. Related functionality reviewed

The review inspected or traced:

- `/projects` public catalogue, cards, search, filters, sorting, counts, URL/history state, pagination, loading/error/empty states;
- `/projects/[id]` public detail, canonical content, availability, SEO/share metadata and safe public resource projection;
- `/signin`, Auth callback, verification and social completion;
- `/onboarding` and onboarding completion return contract;
- `/member/discover/[id]` authenticated project continuation and canonical participation fields;
- Phase 3 canonical project schema/participation constraints and legacy compatibility;
- Admin project-governance publication path and publication-readiness checks;
- canonical project roles, role capacity, domains, tools, methods, capabilities and capability paths;
- public resource governance and private/Lab/run-scoped separation;
- public safe RPC and anonymous Supabase execution boundary;
- catalogue relation RLS inheritance and public-only project visibility;
- service-role usage boundaries;
- form/application ownership and Phase 4→Phase 5→Phase 6 separation;
- public discovery analytics payloads;
- production/read-path indexes;
- browser regression and public-detail design tests;
- repository migrations and isolated-Supabase CI contract;
- documentation and PR handoff.

No Phase 4 code path was added to Lab and no Lab/private execution-resource contract was weakened.

---

## 3. Issues found

### Earlier strict-acceptance defects

I. `/projects` still contained an actual public `SubmissionForm` / `project_application` flow, violating the Phase 4→6 boundary.

J. Public project detail used `Continue to apply` semantics instead of the required `Submit interest` CTA and allowed contribution areas to read like public application choices.

K. New-user signup/onboarding did not reliably preserve the exact originating project through email/social signup, verification and Phase 2 onboarding.

L. Several canonical Phase 3 detail fields were not surfaced publicly: supporting objectives, key questions, scope, public resource provenance, timeline, Proof potential and team/basic eligibility context.

M. Public project detail lacked project-specific canonical/share metadata and hidden/nonexistent project noindex handling.

N. `/projects` had no route-level loading state.

O. Catalogue cards did not explicitly expose the required comparison metadata, notably experience level and capability tags.

### Director sign-off defects found in this review

P. The anonymous public-detail RPC returned internal governance/retention fields (`governance_status`, `governance_verified_at`, `retention_policy`) and role `application_requirements`. Hiding them in JSX was not an acceptable security boundary.

Q. The same RPC returned the import row's complete `normalized` JSON plus internal `source_project_key` and role workflow `role_status`, creating an overfetch/future-leakage risk.

R. `/member/discover/[id]` still consumed only legacy `team_size_threshold`, so a user could see canonical Solo/Team/Flexible + min/target/max participation publicly and then lose that meaning immediately after authentication.

S. Public catalogue availability used `resolveProjectPublicAvailability`, while public detail used separate `projectAcceptsApplications(...) && roles.length > 0` logic. Card and detail CTA state could diverge.

T. The blocking public-detail browser suite still asserted the retired `Continue to apply` CTA and old four-section information architecture, meaning correct Phase 4 UI would fail regression.

U. A rich public-detail RPC/config failure was silently converted to empty arrays, causing the UI to present infrastructure failure as if project content was simply "being finalised".

V. The public detail component retained a dormant render branch for `applicationRequirements`, leaving a future path for authenticated/Phase 5 application requirements to leak into the public surface.

W. The public catalogue's primary read path had no Phase 4-specific repository-versioned composite index matching public visibility/lifecycle/newest-first ranged reads. This risked relying on hosted/incidental indexing.

---

## 4. Issues fixed

**PASS for all currently known Phase 4/direct-consequence defects I–W.**

- Removed the public submission form. Phase 4 now hands the canonical project ID to `/member/discover/[id]`; Phase 6 remains the actual submission owner.
- Standardised public conversion wording to **Submit interest**; closed/non-joinable projects expose a truthful non-actionable state.
- Kept contribution areas informational; detailed qualification/role selection remains Phase 5.
- Preserved exact project context through email/social signup → verification → onboarding → exact member project.
- Surfaced canonical challenge/context/use case/objectives/questions/scope/resources/deliverables/success criteria/capabilities/timeline/team/Proof-potential information without introducing a duplicate project model.
- Added explicit Proof wording: completing a project does not automatically produce verified Mettelo Proof.
- Added canonical/OpenGraph/Twitter metadata and noindex handling for hidden/nonexistent projects.
- Added accessible `/projects/loading.tsx`.
- Expanded cards with canonical domain/experience, participation, duration/commitment, bounded capability tags, contribution areas, tools/methods and canonical availability.
- Narrowed `get_public_project_experience_detail(uuid)` to a strict public whitelist. Internal governance, retention, protected resource URLs/storage/access/review evidence, application requirements, role workflow state, internal source keys and run-scoped execution data are not returned.
- Replaced wholesale imported `normalized` JSON projection with an explicit whitelist: technical skills, professional skills, tools, methods and domain only.
- Updated the public TypeScript loader to match the safe projection and return internal-only model fields as null.
- Added/expanded anonymous security tests to fail if protected fields reappear.
- Wired `/member/discover/[id]` to canonical `participation_mode`, `min_team_size`, `target_team_size`, `max_team_size` with legacy fallback retained.
- Unified public detail availability with the same `resolveProjectPublicAvailability` contract used by catalogue cards.
- Updated the blocking browser regression to the six-section Phase 4 decision surface and `Submit interest` semantics, including responsive/reflow checks.
- Added an explicit rich-detail load-error signal and public `role="alert"` state while preserving the core project page.
- Removed the public component's dormant `applicationRequirements` rendering branch.
- Added versioned public-catalogue indexes in `20260905154500_project_experience_phase_4_public_catalogue_indexes.sql`.
- Expanded the Phase 4 acceptance contract test to protect these boundaries.

---

## 5. Supabase/schema/migration result

**Implementation: PASS. Clean exact-head migration execution: PENDING.**

### Canonical schema

Phase 4 continues to consume the Phase 3 canonical project schema. It does not create a duplicate project table or public-only project record.

Phase 3 versioned schema includes canonical participation fields:

- `participation_mode`;
- `min_team_size`;
- `target_team_size`;
- `max_team_size`;
- legacy `team_size_threshold` compatibility.

Phase 3 constraints/backfill remain the source of truth for valid team-size relationships and existing-data compatibility.

### Phase 4 migrations

`supabase/migrations/20260905143000_project_experience_phase_4_public_detail_projection.sql`

- creates/replaces the read-only public detail RPC;
- is `SECURITY DEFINER` with fixed `search_path`;
- visibility/status gates the project;
- returns only whitelisted public-safe fields;
- filters resources to public + publish-permitted + GREEN;
- revokes default PUBLIC execute and grants only `anon` and `authenticated`.

`supabase/migrations/20260905154500_project_experience_phase_4_public_catalogue_indexes.sql`

- adds `(visibility, status, created_at desc, id desc)` catalogue read-path index;
- adds a partial public deadline index;
- is versioned and reproducible.

No hosted-only Phase 4 database change is intentionally relied upon.

### CRUD applicability

Phase 4 introduces no public project mutation or submission endpoint. The new RPC is read-only. Existing Admin/Project Architect canonical project mutations remain owned by their existing governed routes/functions and are covered by the release regression/migration suite.

---

## 6. RLS/security result

**Source/security design: PASS. Exact-head isolated RLS/security execution: PENDING.**

- Public catalogue uses the anon/public client and `visibility='public'`.
- Public detail uses the anon-safe RPC rather than service-role-backed rich-detail helpers.
- Related public taxonomy relation policies inherit project visibility through the protected `projects` read contract.
- Draft/private direct project detail is rejected by both the base public project query and the rich-detail RPC.
- Protected resource URLs/storage/access/review evidence and internal governance fields are absent from the anonymous RPC projection.
- Member personal data, applications and memberships are not part of the public projection.
- Public UI no longer contains a render path for `applicationRequirements`.
- `get_public_project_experience_detail` grants execute only to `anon`/`authenticated` after revoking PUBLIC.
- Admin service-role use remains behind explicit authenticated admin authorization and is not used to compensate for broken anonymous/member RLS.
- `/member/discover/[id]` uses authenticated user identity (`auth.getUser()`) and canonical `user.id` relationships for profile/application/membership reads.

Final PASS requires the exact-head isolated Supabase security tests to execute successfully.

---

## 7. Backend/API integrity result

**Implementation: PASS. Runtime integration evidence: PENDING.**

- No Phase 4 mutation API or parallel application engine exists.
- Public catalogue/detail read the same canonical project identity/state used by Admin and authenticated member surfaces.
- Public card and detail availability share `resolveProjectPublicAvailability`.
- Member continuation consumes the same Phase 3 canonical participation fields as public discovery.
- Admin publication continues to validate project-experience and catalogue readiness before publishing/recruiting.
- The public rich-detail loader distinguishes database failure from legitimate optional-field absence and logs only a safe project ID/error code rather than exposing raw SQL/query details to the user.

---

## 8. Form/journey regression result

**Implementation: PASS. Exact-head browser/form execution: PENDING.**

Required journey now is:

`/projects` → search/filter/compare → `View project` → public decision surface → `Submit interest` → existing sign in/sign up → username/verification/onboarding when required → exact `/member/discover/[projectId]` continuation.

- There is no Phase 4 public application form.
- Sign-in preserves the exact project.
- Email and social signup preserve a sanitised internal return target through onboarding.
- malicious external/`//` return targets are rejected by the shared internal-path checks;
- normal authentication failure retains the URL `next` context for retry;
- existing Phase 1 identity and Phase 2 onboarding are reused rather than duplicated.
- No new Phase 4 application-confirmation email/notification side effect exists because Phase 4 no longer submits an application.

---

## 9. UI/UX review result

**Source implementation: PASS. Final visual/browser evidence: PENDING.**

Reviewed catalogue/card/detail/auth-return changes for hierarchy, alignment, consistency, CTA clarity and state handling.

Current implementation includes:

- consistent Mettelo public project hierarchy;
- bounded comparison metadata on cards rather than mini-detail pages;
- exact `View project` primary card action and truthful `Submit interest` secondary conversion action;
- canonical status text in addition to colour;
- public decision hero with duration, commitment, participation, capacity, working model, level and deadline;
- six-section scannable detail information architecture;
- distinct empty optional-content states;
- explicit rich-detail infrastructure error state;
- disabled/non-actionable closed state;
- governed source/provider wording without treating ordinary data provenance as a partnership;
- no public role-application controls.

---

## 10. Mobile/accessibility result

**Source/test contract: PASS. Exact-head browser execution: PENDING.**

Blocking coverage includes or asserts:

- 320, 375, 390, 414, 768, 1024 and 1440 catalogue behaviour;
- public detail checks at 320, 390, 768, 1024 and 1440;
- 200% text reflow/no page overflow;
- mobile filter drawer/bottom sheet;
- visible result count/live status;
- labelled native controls;
- keyboard capability autocomplete;
- Escape close and trigger focus restoration;
- keyboard-accessible project links and Submit interest;
- logical H1/section headings/list semantics;
- visible focus styles and minimum primary-control target sizes.

Final approval requires these exact-head browser checks to complete successfully.

---

## 11. Tests executed and results

### Source/test coverage added or corrected

- `tests/project-experience-phase4-acceptance-contract.spec.ts` — Phase 4 boundaries, CTA/form ownership, canonical card metadata, index/ranged-read contract, public detail content/SEO/error state, auth return, member canonical participation.
- `tests/project-experience-phase4-public-security.spec.ts` — anon projection, private-project rejection and protected-field absence.
- `tests/project-experience-v2-public-design.spec.ts` — corrected Phase 4 six-section UI, Submit interest, desktop/mobile and 200% reflow.
- `tests/public-project-discovery-filter-contract.spec.ts` — shared filters, URL state, rapid interaction, mobile drawer, analytics privacy and responsive filter behaviour.

### Final exact-head required evidence

The final documentation-inclusive SHA must pass:

- lint;
- typecheck;
- content/interaction/regression audits;
- unit/contract catalogue filtering tests;
- production build;
- clean isolated Supabase startup from repository migrations;
- schema/migration validation;
- Phase 3 governance/constraint tests;
- Phase 4 public RPC/RLS/leakage security test;
- authenticated/member browser regressions;
- form/persistence regressions;
- public project catalogue/detail browser regressions;
- signup/onboarding exact-project return regression;
- responsive/200%/accessibility browser evidence;
- Event Room Phase 1–12 contract;
- protected Release Gate Status Bridge.

Previous passes on older SHAs are supporting evidence only and cannot approve the final head.

---

## 12. Remaining risks

1. **Exact-head release evidence remains pending.** Any failure is an active defect and must be fixed/re-run before sign-off.
2. **Stack dependency:** PR #213 remains intentionally based on Phase 3 / PR #212. The merge owner must preserve Phase 1–3 contracts when dependency ordering changes.
3. **Catalogue scale:** current public discovery reads public projects server-side in bounded 200-row PostgREST ranges with no fixed 500-row ceiling, renders only the requested 12-card page to the browser, and now has explicit read-path indexes. Dynamic facets/counts still require linear server work across the public catalogue. This is acceptable for the current catalogue size and is not a correctness/security blocker, but database-side filter/count push-down should be revisited before materially larger catalogue volumes.
4. Final visual/accessibility assessment remains dependent on browser execution; source review alone is not sufficient for approval.

---

## SIGN-OFF

**NOT APPROVED.**

All currently known Phase 4/direct-consequence implementation defects identified by the Director review have been fixed. Approval remains blocked until the final documentation-inclusive exact head completes the full mandatory runtime, Supabase/migration/RLS/security, browser, responsive/accessibility and protected release evidence with no new material defect.

**Phase 5 must remain on hold until this document can truthfully move to APPROVED on the final exact SHA.**
