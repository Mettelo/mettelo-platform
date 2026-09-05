# Project Experience Phase 4 — Public Project Discovery Experience

## Status

Implementation complete; Director exact-head release evidence pending.

Phase 4 extends the existing public Projects catalogue and public project-detail architecture. It does not create a second discovery service, project table, lifecycle, interest flow, or privileged public read path.

## Objective

Make the canonical project definition created in Phases 1–3 understandable and trustworthy before a visitor enters the member qualification/application journey.

Public users must be able to:

- discover only public projects;
- search and filter the complete public catalogue without artificial row ceilings;
- distinguish Solo, Team and Flexible participation;
- understand minimum, target and maximum project capacity;
- understand status, availability, roles, commitment, working model, problem, deliverables, quality expectations and governed source metadata;
- open project detail without authentication;
- enter sign-in/member continuation only when they choose to continue;
- see a Submit interest action only where the canonical availability contract allows interest;
- never receive protected resource URLs, storage paths or internal governance evidence.

## Preservation boundaries

Phase 4 preserves:

- canonical `public.projects` UUIDs and slugs;
- Phase 3 `participation_mode`, `min_team_size`, `target_team_size`, `max_team_size`;
- `team_size_threshold` as the existing runtime minimum-formation compatibility field;
- existing Public Projects IA, pagination, capability paths, filters, CMS copy and card design;
- existing member `/member/discover/[id]` qualification/application continuation;
- existing `projectAcceptsApplications` and `resolveProjectPublicAvailability` lifecycle authority;
- Phase 6 ownership of actual project-interest submission semantics;
- Admin/Project Architect privileged project-governance helpers;
- Lab/private stored-resource access controls;
- Proof verification architecture.

## Canonical participation propagation

Before Phase 4, public discovery inferred only Solo versus Team from `team_size_threshold`. That made the Phase 3 canonical Flexible model invisible.

Phase 4 now propagates through the public stack:

- `participation_mode`;
- `min_team_size`;
- `target_team_size`;
- `max_team_size`;
- legacy `team_size_threshold` fallback.

The public catalogue filter now exposes:

- Solo;
- Team;
- Flexible.

Canonical mode wins. Legacy projects without Phase 3 fields continue to derive Solo/Team from the historical threshold.

Project cards now show a participation summary and public project detail shows separate Participation and Capacity information.

## Public catalogue data contract

`lib/public-project-catalogue-loader.ts` continues to use `createPublicSupabaseClient()` and queries only projects with:

- an allowed public lifecycle status; and
- `visibility = 'public'`.

The loader remains batched rather than imposing a fixed 500-row catalogue ceiling.

The canonical select includes Phase 3 participation fields. A legacy select fallback remains temporarily available so a preview running against an older hosted schema fails soft rather than hiding the catalogue.

## Filtering and URL state

The existing live filter architecture is preserved.

Phase 4 retains:

- immediate filter preview;
- combined filters without waiting for full navigation after each selection;
- live result count;
- Show N projects button;
- removable active-filter chips;
- clear-all action;
- URL-driven state;
- browser back/forward restoration;
- search, sort, role, experience, participation, capability, domain, tool, commitment, working model, source, availability, duration and Capability Path filters;
- aggregate privacy-safe catalogue analytics.

Terminology was updated from the obsolete `Solo / Team` label to `Participation` because Flexible is now canonical.

## Availability and CTA integrity

Project cards use the shared `resolveProjectPublicAvailability` contract.

`Submit interest` is rendered only when `availability.acceptingInterest` is true.

Projects that are closed, active, in review, completed, deadline-passed or otherwise non-interest-bearing remain discoverable and readable, but cannot be selected into the public interest form.

The interest-form project list is built from the same availability decision, so a crafted `?interest=<id>` URL cannot select a project the page considers unavailable for interest.

This does not redefine Phase 6 submission state or eligibility. It makes Phase 4 discovery truthful to the existing canonical lifecycle contract.

## Public project-detail security architecture

### Problem found during Director review

The base public project row was already read through the anon/public Supabase client and `visibility='public'`, but richer public detail was assembled through helpers backed by `serviceDb()`:

- project detail content;
- project planning;
- rich role details.

Although the application projection removed protected URLs before rendering, that still meant public detail depended on a privileged service-role read path.

That did not satisfy the Phase 4 Supabase sign-off requirement.

### Fix

Migration:

`supabase/migrations/20260905143000_project_experience_phase_4_public_detail_projection.sql`

adds:

`public.get_public_project_experience_detail(p_project_id uuid)`

The function is a narrow `SECURITY DEFINER` public projection with a fixed `search_path`.

It returns data only when the project:

- exists;
- has `visibility='public'`; and
- is in an approved public lifecycle state.

It returns only public presentation fields for:

- deliverables;
- governed public data-source metadata;
- public success criteria;
- capabilities;
- published Capability Path context;
- canonical import-normalized taxonomy context;
- project problem brief;
- definition-level milestones;
- public-safe role detail.

For data sources the database additionally requires:

- `sensitivity='public'`;
- `publish_policy='permitted'`;
- `governance_status='green'`.

The function deliberately does not project:

- external resource URLs;
- provider URLs;
- licence URLs;
- storage paths;
- content pointers;
- preview/sample rows;
- download/query flags;
- access notes;
- review agreement evidence;
- run-scoped execution data.

Default function access is revoked and execution is granted only to `anon` and `authenticated`.

`lib/public-project-experience-data.ts` calls this RPC with `createPublicSupabaseClient()` and maps the public-safe JSON into the existing `ProjectExperienceModel` inputs.

`app/projects/[id]/page.tsx` no longer calls the privileged rich-detail helpers.

Internal Member/Admin/Lab helpers remain unchanged because their trusted/private use cases are outside the public Phase 4 projection.

## Supabase / PostgreSQL result

Phase 4 introduces no duplicate project storage.

The only new database contract is the versioned public-safe projection function.

The function:

- does not accept or trust a user ID;
- does not mutate data;
- does not grant base-table write access;
- does not weaken existing RLS policies;
- does not expose protected resource columns;
- returns `null` for non-public projects;
- leaves internal/Admin/member write authority unchanged.

No hosted-only Phase 4 database change is permitted.

## Public detail continuation

The public project page remains readable without authentication.

When a user chooses to continue:

- authenticated users go to `/member/discover/[projectId]`;
- anonymous users go to `/signin?next=/member/discover/[projectId]`.

Member readiness, qualification, role selection and application state remain owned by the member journey rather than duplicated on the public page.

## UI / UX result

Changed/affected public surfaces:

- Projects catalogue;
- public filter bar/drawer;
- project cards;
- public project detail hero/decision panel.

The existing Mettelo design system and layout are preserved.

Phase 4 adds only information required to make the new canonical project definition understandable:

- Participation mode;
- capacity range/target;
- availability-accurate secondary CTA.

Existing loading/update status uses `aria-live`; result count and zero-result state remain present; service failure retains an explicit unavailable state; filters retain focus-visible behaviour and native labelled controls.

## Responsive and accessibility contract

Existing public discovery browser coverage continues to validate:

- 320px;
- 375px;
- 390px;
- 414px;
- 768px;
- 1024px;
- 1440px;
- 200% text sizing;
- no page-level horizontal overflow;
- filter dialog Escape close;
- focus return to trigger;
- labelled native selects;
- keyboard-operable capability combobox;
- live result count.

Phase 4 terminology is reflected in the accessible labels: `Project participation` / `Any participation`.

## Tests

Phase 4 extends existing blocking coverage rather than creating a parallel release system.

Updated:

- `tests/project-catalogue-filtering.spec.ts`
  - Solo/Team/Flexible canonical projection;
  - Flexible independently filters from Team and Solo;
  - legacy threshold fallback.

- `tests/public-project-discovery-filter-contract.spec.ts`
  - canonical public field propagation;
  - Flexible terminology;
  - creator-independent public filtering;
  - public detail Participation/Capacity markers;
  - existing desktop/mobile/URL/analytics/200% coverage.

Added:

- `tests/project-experience-phase4-public-security.spec.ts`
  - public route does not use privileged rich-detail helpers;
  - public loader uses the anon client and guarded RPC;
  - migration excludes protected resource fields;
  - anon can read rich projection for a public project;
  - the same project returns no rich data after visibility is changed to private in isolated Supabase;
  - test restores fixture visibility after the negative check.

The security spec is part of both authenticated smoke and staging isolated-Supabase suites.

The repository regression audit was updated so the frozen V2 contract now accepts the Phase 4 secure public loader while continuing to require the privileged rich helpers on the member page where they remain appropriate.

## Known review fixes

1. Flexible participation invisible publicly — fixed.
2. Public detail showed legacy minimum only — fixed.
3. Public filter terminology still said Solo/Team — fixed.
4. Public rich-detail path depended on `serviceDb()` — fixed with guarded PostgreSQL RPC.
5. Public cards offered Submit interest when canonical availability rejected interest — fixed.
6. Frozen regression audit required obsolete privileged public helper names — fixed to require the new security architecture.

## Rollback

The change is additive and backward compatible.

Application rollback can restore the previous public loader/detail code while leaving the function in place.

If the function itself must be retired, use a forward compensating migration that revokes execute and drops the function only after no deployed application depends on it. Do not rewrite project IDs or remove Phase 3 participation fields.

## Release evidence required

The final documentation-inclusive exact head must pass:

- lint;
- typecheck;
- interaction audit;
- regression coverage;
- public catalogue filtering tests;
- build;
- clean isolated Supabase migration startup;
- Phase 4 anon/RPC security test;
- public browser regression;
- mobile/tablet/desktop/200% reflow;
- auth-return/member continuation regression;
- persistence/form regression;
- Event Room contract;
- protected Release Gate.

## Decision

Implementation is complete for Phase 4 scope.

**NOT APPROVED until the final documentation-inclusive exact head completes all required release evidence.**
