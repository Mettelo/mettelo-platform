# Phase 2 — Director Sign-Off Review

Phase: Project Experience Phase 2 — Onboarding, Profile, Account & Preferences

Review authority: Software Delivery, Product Engineering, UI/UX, QA, Data Architecture, Supabase/PostgreSQL, Security and Release Readiness.

Status: implementation defects found by this review have been fixed. Final release approval remains pending exact-head CI and isolated-Supabase evidence.

## Review scope

The review covered frontend, backend, Supabase schema, PostgreSQL functions, versioned migrations, RLS, Supabase Auth relationships, foreign keys, indexes, API/database contracts, forms, validation, state transitions, notifications/email, Admin boundaries, member journeys, Public People, Discover readiness, Lab compatibility, mobile/tablet/desktop, accessibility, analytics boundaries, tests and documentation.

## Material issue found during Director review

### Privacy settings were not atomic

Root cause:

The first Phase 2 Account API implementation saved `profiles.is_public` and `member_privacy_preferences` as two independent writes in `Promise.all`. Either statement could commit while the other failed. The API could therefore return an error while the member's privacy state had been partially changed.

This violated the Phase 2 requirements for coherent state transitions, database integrity and recoverable form failures.

Fix:

- Added `public.save_member_privacy_preferences(boolean,boolean,boolean)` to the versioned Phase 2 privacy migration.
- The function is `security invoker`, derives identity from `auth.uid()`, updates `profiles.is_public`, upserts `member_privacy_preferences`, and commits/rolls back as one PostgreSQL transaction.
- The API now calls only this canonical RPC for privacy writes.
- No service-role workaround is used.
- Added deterministic audit assertions requiring the atomic RPC path.
- Expanded authenticated isolated-Supabase testing to call the RPC as a normal authenticated member and verify both canonical stores, while continuing to prove cross-user privacy/Profile/notification writes are blocked.

## Supabase/PostgreSQL integrity review

### Canonical relationships

- `profiles.id` remains the primary member/profile identity and references `auth.users(id) ON DELETE CASCADE`.
- Phase 1 `username` and immutable `member_id` remain on that same profile row.
- Project applications, project memberships, contribution history and Proof remain keyed to the immutable Auth UUID; Phase 2 does not rewrite those relationships.
- `member_privacy_preferences.user_id` is a primary key and foreign key to `auth.users(id) ON DELETE CASCADE`.
- Existing `profile_domain_preferences` and `profile_tool_preferences` retain their profile foreign-key relationships and canonical taxonomy ownership.

### RLS and privilege model

- `member_privacy_preferences` has RLS enabled.
- Authenticated members can operate only where `auth.uid() = user_id`.
- Anonymous access is revoked.
- `save_member_privacy_preferences` is `security invoker`, so the caller's RLS privileges remain authoritative.
- `save_member_profile` is also `security invoker` and derives the profile row from `auth.uid()`.
- No Phase 2 member write path uses service role to bypass broken RLS.
- Service role is used only by isolated QA fixture setup where appropriate, not as the product authorization model.

### Constraints and indexes

- `member_privacy_preferences.user_id` primary key prevents duplicate preference rows.
- Boolean fields are `NOT NULL` with explicit defaults for existing/new members.
- Partial indexes exist for future invitation/message discovery queries.
- Phase 1 username/member-ID uniqueness, format and immutability constraints remain untouched.
- Profile optimistic concurrency is enforced through `expected_updated_at` / `PROFILE_STALE` in the atomic profile RPC.

### Versioning/reproducibility

All Phase 2 database changes are repository migrations. There is no known hosted-only Phase 2 schema change. The runtime release matrix must still prove reproduction from a clean isolated Supabase stack before approval.

## Backend/API integrity review

- `/api/profile` validates owned profile fields, canonical domain/tool IDs and governed preferred-role catalogue values.
- Profile + domain/tool preference persistence is one database transaction.
- Profile save preserves `is_public` when privacy is omitted.
- Stale profile requests fail with 409 rather than overwriting newer data.
- `/api/account-preferences` authenticates every operation.
- Privacy saves use the atomic member privacy RPC.
- Notification preferences reuse the existing event catalogue/preferences tables and reject unknown/inactive/required communication keys.
- Email changes use Supabase Auth `updateUser({email})`; no profile email surrogate exists.
- Username changes reuse the Phase 1 identity endpoint and database policy.
- Password recovery reuses the existing Supabase Auth recovery flow.

## Journey/regression review

Preserved and reviewed:

- signup/Phase 1 identity → onboarding;
- resumable onboarding;
- profile readiness;
- safe project return via `mettelo_return_to` and `/auth/continue-after-onboarding`;
- public People discoverability enforced server-side by `profiles.is_public`;
- project/application/membership/Lab/Proof UUID relationships;
- Profile vs verified Proof separation;
- existing notification delivery architecture;
- Admin authorization remains separate from member preference ownership.

## UI/UX review

Account intentionally separates ACCOUNT, SECURITY, PRIVACY and NOTIFICATIONS rather than creating one giant settings form.

Reviewed states include:

- loading/saving disabled states;
- recoverable API errors;
- success announcements;
- notification empty state;
- unchanged username/email controls disabled until there is a change;
- required notification controls visibly disabled;
- explanatory privacy consequences;
- read-only Member ID;
- Profile values preserved on failed saves;
- stale-save error contract.

The Account CSS provides desktop two-column layout, tablet/mobile one-column reflow, narrow-phone notification stacking, wrapping identity values, and 44px-class interaction rows. Final visual approval depends on exact-head browser evidence at 320px, tablet, desktop and 200% text sizing.

## Accessibility review

- semantic headings and native labels are retained;
- Account status uses `role=status`, `aria-live=polite`, `aria-atomic=true`;
- disabled notification state is exposed semantically;
- member shell retains focus-visible treatment;
- controls remain native keyboard-operable;
- dedicated authenticated browser test checks no horizontal overflow at 320px and 200% text sizing.

Final accessibility approval remains contingent on the blocking browser run on the exact final head.

## Notifications/email/cron/analytics

- ordinary Profile saves do not send email;
- privacy/notification preference saves do not send email;
- email verification/change and password recovery remain Supabase Auth-owned;
- no new cron is needed;
- no new analytics payload intentionally emits username, private email, Member ID or Auth UUID.

## Blocking release evidence

The final documentation-inclusive head must pass:

- lint;
- typecheck;
- Project Experience Phase 2 deterministic audit;
- existing repository audits;
- build;
- clean isolated Supabase migration preparation/startup;
- authenticated Supabase/RLS/CRUD tests including the atomic privacy RPC;
- public regression;
- authenticated browser/visual QA;
- persistence/form regression;
- informational journeys;
- Event Room contract;
- protected Release Gate.

## Current sign-off posture

Implementation review: PASS after corrective fixes.

Release evidence: PENDING.

SIGN-OFF: NOT APPROVED until the exact final head completes all mandatory release evidence successfully. No test or migration result may be inherited from a previous head.
