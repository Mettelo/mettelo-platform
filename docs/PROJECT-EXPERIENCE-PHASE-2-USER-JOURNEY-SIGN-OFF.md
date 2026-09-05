# Phase 2 — Onboarding, Profile, Account & Preferences — Full User-Journey Sign-Off

Review basis: 60 user stories and 28 mandatory end-to-end journeys supplied for Project Experience Phase 2.

Status at this document commit: implementation review complete; final exact-head CI/release evidence pending. `PASS` below means the repository implementation and applicable deterministic contract are present. Items whose acceptance depends on final isolated-browser/database execution remain called out under release evidence. Final approval is withheld until the documentation-inclusive head is green.

## EPIC A — Onboarding

### US-01 — Start onboarding
**Status: PASS**
- UI: existing five-step authenticated onboarding retained; username is not requested again.
- API/DB: canonical `/api/profile`; same `profiles.id = auth.uid()` member record.
- State: server-persisted step/profile data, not browser-only identity.
- Responsive/a11y: existing responsive onboarding plus touch/status improvements retained.

### US-02 — Resume onboarding
**Status: PASS**
- `onboarding_step` and entered profile values persist in Supabase.
- `app/onboarding/page.tsx` derives initial state from canonical profile data.
- `expected_updated_at` prevents stale session overwrite.
- Logout/login can reconstruct state from Supabase.

### US-03 — About You
**Status: PASS**
- Existing values are prefilled.
- Onboarding now exposes full name, headline, bio, location, professional area, current role, organisation, experience level, employment status and languages.
- Server validates governed enum fields and length limits.
- Atomic save is idempotent by profile primary key.

### US-04 — Skills & Interests
**Status: PASS**
- Domains/tools reuse canonical database taxonomies and owner preference mappings.
- Self-entered skills are case-insensitively de-duplicated; they remain profile signals, not Proof.
- Existing preferences are loaded and preserved.
- No internal/private metadata is added to public profile projection.

### US-05 — Project Goals
**Status: PASS**
- Primary goal remains canonical profile data.
- Preferred roles now load from existing `project_role_catalogue`.
- API rejects newly invented role values while grandfathering existing legacy selections.
- Later Discover can reuse profile values without another role store.

### US-06 — Availability
**Status: PASS**
- Canonical `project_availability` retained.
- Weekly capacity now uses the same governed ranges in onboarding and Profile.
- Availability is editable later and is not an account-access gate.

### US-07 — Review onboarding
**Status: PASS**
- Review summarizes professional context, skills, goals and availability.
- Previous steps remain editable.
- Privacy has been removed from onboarding review to preserve PROFILE/PRIVACY separation.
- Final persistence uses the atomic profile transaction.

### US-08 — Complete onboarding
**Status: PASS**
- Completion remains persisted.
- Database save keeps the first completion timestamp monotonic.
- Existing `/auth/continue-after-onboarding` consumes safe `mettelo_return_to` and falls back to `/member`.
- Readiness recalculates on save.

## EPIC B — Professional Profile

### US-09 — View my professional profile
**Status: PASS**
- Canonical profile and preference data only.
- Phase 1 `@username` and Member ID display on the private member Profile identity summary.
- Private Auth email and Auth UUID are not exposed on public Profile.

### US-10 — Edit professional profile
**Status: PASS**
- Owner-only authenticated API.
- One atomic database transaction saves Profile + domain/tool mappings.
- Loading/success/error states are announced.
- Recoverable errors keep form values.
- Stale writes return HTTP 409 rather than silently corrupting newer data.

### US-11 — Update full name
**Status: PASS**
- Full name is a profile field only.
- Auth UUID, username and Member ID are untouched.
- Applications/contributions/project relationships remain UUID keyed.

### US-12 — Update headline / bio
**Status: PASS**
- Headline 160-character server limit; bio 1000-character server limit.
- React rendering escapes HTML/script content.
- Responsive profile layout and wrap rules remain in place.

### US-13 — Update professional links
**Status: PASS**
- Client prepends `https://` when scheme is missing.
- Server accepts HTTPS only and rejects unsafe schemes.
- Empty optional links remain valid.
- Public links use safe new-tab rel attributes.

### US-14 — Update skills
**Status: PASS**
- Existing canonical profile skill field preserved.
- Case-insensitive duplicate normalization added.
- Skills are removable/editable and remain explicitly unverified profile claims.
- No second skills table was invented in Phase 2 where the repository has no approved canonical member-skill catalogue.

### US-15 — Update preferred roles
**Status: PASS**
- Active `project_role_catalogue` is the governed source.
- Profile and onboarding load it rather than maintaining independent role lists.
- Multiple selection remains supported.
- Existing legacy role values remain visible until changed, preventing migration loss.

## EPIC C — Profile Readiness

### US-16 — See profile readiness
**Status: PASS**
- Existing `calculateMemberReadiness` engine preserved.
- Matching/application/public-profile readiness remain separate states.
- Privacy, notifications and invitation/message preferences are not readiness requirements.
- Username is not added as a new application-readiness lock.

### US-17 — Complete missing profile data
**Status: PASS**
- Existing readiness UI identifies missing requirements and provides Edit Profile actions.
- Save returns recalculated readiness immediately.
- Existing stored values are prefilled.

### US-18 — Existing members are not broken by readiness
**Status: PASS**
- No new mandatory Phase 2 account/privacy field is added to application readiness.
- Existing profile values and legacy preferred-role selections remain valid.
- Phase 2 migrations are additive.

## EPIC D — Account

### US-19 — View Account settings
**Status: PASS**
- New canonical `/member/account` destination.
- Account/security is separated from professional Profile.
- Account is present in desktop navigation and mobile More.

### US-20 — View username
**Status: PASS**
- Username comes from Phase 1 profile identity.
- Member ID is separately labelled and read-only.
- No second username record exists.

### US-21 — Change username
**Status: PASS**
- Account reuses `PATCH /api/member-identity` and Phase 1 database rules.
- Owner authentication, normalization, reserved names, uniqueness, race protection, history reservation and cooldown remain canonical.
- Auth UUID and Member ID stay unchanged.
- Failure restores/displays the existing username.

### US-22 — View email
**Status: PASS**
- Email is read from the authenticated Supabase user.
- It is not copied into public profile data.
- Username/email labels are distinct.

### US-23 — Change email
**Status: PASS — PROVIDER FLOW REQUIRES FINAL E2E EVIDENCE**
- `/api/account-preferences` calls Supabase Auth `updateUser({email})`.
- No fake profile-email update exists.
- Same Auth user relationship is preserved by provider architecture.
- Error copy states current email remains valid if initiation fails.

### US-24 — Change password
**Status: PASS**
- Account uses existing Supabase reset/callback/update-password flow.
- Password is never stored in Profile/preferences.
- OAuth/provider policy remains delegated to Supabase Auth.

### US-25 — Forgot/reset password continuity
**Status: PASS**
- Existing recovery callback, expired-link handling and password-update routes are unchanged and remain under the Phase 1 regression gate.

### US-26 — View Member ID
**Status: PASS**
- Phase 1 immutable Member ID shown read-only.
- Internal Auth UUID is not substituted or displayed.
- Username/email changes do not rewrite Member ID.

## EPIC E — Privacy

### US-27 — Control profile discoverability
**Status: PASS**
- Canonical flag remains `profiles.is_public`.
- Account API writes it server-side for `auth.uid()`.
- Existing People directory and individual public-profile queries filter `is_public=true` server-side and also require public-profile readiness.

### US-28 — Control project invitations
**Status: PASS FOUNDATION**
- `allow_project_invitations` persists in owner-scoped `member_privacy_preferences`.
- It does not alter project application/membership authorization.
- Future invitation service has one server-readable canonical preference to enforce.

### US-29 — Control member messages
**Status: PASS FOUNDATION**
- `allow_member_messages` persists in the same owner-scoped privacy table.
- UI explicitly distinguishes this from project-team Chat authorization.

### US-30 — Private data is not exposed
**Status: PASS**
- Public People projection excludes email, Auth UUID, account preferences and security state.
- Account data stays authenticated.
- No Admin/support data was moved into Profile.

## EPIC F — Notifications

### US-31 — Manage notification preferences
**Status: PASS**
- Existing `notification_event_catalogue` and `notification_preferences` are reused.
- Optional active events can be overridden; unknown/inactive keys fail closed.
- UI groups controls by product area.

### US-32 — Critical notifications cannot be disabled
**Status: PASS**
- Shared server/UI `isRequiredCommunication()` policy classifies critical/account/auth/security/verification/password events.
- Required controls are disabled in UI.
- API rejects modification attempts independently of UI.

### US-33 — Profile save does not spam email
**Status: PASS**
- `/api/profile` does not enqueue communication.
- Privacy/notification saves do not enqueue email.
- Email-change/password-recovery communication remains Auth-owned.

## EPIC G — Future Project Discovery Readiness

### US-34 — Profile data can power Discover
**Status: PASS FOUNDATION**
- Skills, preferred roles, experience, domain/tool preferences, availability and capacity remain canonical reusable profile data.
- Roles/domains/tools no longer require a second discovery taxonomy.

### US-35 — Discoverability can power member search
**Status: PASS**
- Existing People directory already enforces the canonical `is_public` flag server-side.

## EPIC H — Future Project Interest Readiness

### US-36 — Project application can reuse profile
**Status: PASS FOUNDATION**
- Full name, username, skills, links, experience and availability remain on canonical identity/profile records keyed to the same Auth UUID.

### US-37 — Incomplete profile can return from project
**Status: PASS FOUNDATION**
- Existing `mettelo_return_to` + `/auth/continue-after-onboarding` safe-return architecture is preserved.
- Phase 2 does not replace it with local storage or an unsafe arbitrary URL.

## EPIC I — Future Invitation Readiness

### US-38 — Invitation preference can be enforced
**Status: PASS FOUNDATION**
- Canonical owner-scoped preference is server-readable.
- Actual invitation feature enforcement remains the later invitation phase, not duplicated here.

### US-39 — Availability can be used for member discovery
**Status: PASS FOUNDATION**
- `project_availability` and governed weekly-capacity ranges remain canonical Profile fields.

## EPIC J — Future Collaboration Readiness

### US-40 — Username and profile display consistently
**Status: PASS**
- Phase 1 Auth UUID/username/Member-ID contract is preserved.
- Team/Lab/Chat identity integration from Phase 1 remains compatible.

## EPIC K — Profile vs Proof

### US-41 — Profile is not Proof
**Status: PASS**
- Onboarding/Profile copy explicitly identifies self-entered skills/profile data as unverified.
- Existing public Proof query remains independently verified/visibility governed.
- Profile atomic RPC never mutates contributions/Proof.

## EPIC L — Supabase / Database

### US-42 — Profile data persists correctly
**Status: PASS IMPLEMENTATION — CLEAN MIGRATION RUN PENDING**
- Additive versioned migrations exist for privacy preferences and atomic profile save.
- Auth UUID/profile relationship is unchanged.
- Null/default handling is defined.
- Existing rows do not require destructive backfill.

### US-43 — RLS protects Profile data
**Status: PASS IMPLEMENTATION — ISOLATED E2E PENDING**
- Privacy table owner-only RLS.
- Existing notification owner-only RLS reused.
- Atomic profile RPC is security-invoker and derives identity from `auth.uid()`.
- Dedicated authenticated test attempts cross-user privacy, Profile and notification writes.

### US-44 — Account data does not drift from Supabase Auth
**Status: PASS**
- Email/password remain Auth-owned.
- Username/Member ID remain Phase 1 profile identity.
- Auth UUID remains relational authority.

### US-45 — Profile updates are idempotent
**Status: PASS**
- Profile is keyed by Auth UUID.
- Profile + taxonomy mappings save in one transaction.
- `expected_updated_at` rejects stale saves.
- Retries cannot create another Profile row.

## EPIC M — Form Quality

### US-46 — Profile forms handle errors well
**Status: PASS**
- Native field constraints plus server validation.
- Loading/disabled/status states.
- Recoverable failures preserve entered DOM values.
- Stale-state response is actionable.

### US-47 — Account forms handle security failures
**Status: PASS**
- Username/email errors do not partially rewrite Member ID/Auth UUID/history.
- Username failure restores existing handle.
- Email update failure states old email is unchanged.
- Supabase Auth remains provider authority for verification/session failures.

## EPIC N — UI/UX Information Architecture

### US-48 — Clear settings structure
**Status: PASS**
- Professional Profile is separate from Account.
- Account page visually separates ACCOUNT, SECURITY, PRIVACY and NOTIFICATIONS cards.

### US-49 — Profile UI professionally designed
**Status: PASS IMPLEMENTATION — FINAL BROWSER REGRESSION PENDING**
- Existing Mettelo Profile hierarchy retained.
- Privacy duplication removed.
- Canonical project-fit grouping retained.
- Save/error feedback remains explicit.

### US-50 — Account UI clear
**Status: PASS IMPLEMENTATION — FINAL BROWSER REGRESSION PENDING**
- Username, Member ID, email and password/security have distinct labels/explanations.

### US-51 — Privacy UI explains consequences
**Status: PASS**
- Discoverability, invitations and member messages each explain effect and boundaries.

### US-52 — Notification UI understandable
**Status: PASS**
- Grouped by product area/description rather than event-key terminology.
- Required communication is explicitly labelled.

## EPIC O — Accessibility & Responsiveness

### US-53 — Mobile Profile works
**Status: PASS IMPLEMENTATION — EXACT-HEAD BROWSER EVIDENCE PENDING**
- Existing Profile responsive contract retained.
- New Account authenticated test includes 320px overflow check.

### US-54 — Tablet works
**Status: PASS IMPLEMENTATION — EXACT-HEAD BROWSER EVIDENCE PENDING**
- Account CSS has intentional responsive reflow; authenticated test covers 768px.

### US-55 — 200% reflow
**Status: PASS IMPLEMENTATION — EXACT-HEAD BROWSER EVIDENCE PENDING**
- Dedicated test applies 200% root text sizing and asserts no horizontal page overflow.

### US-56 — Keyboard access
**Status: PASS IMPLEMENTATION — EXACT-HEAD BROWSER EVIDENCE PENDING**
- Native form controls/buttons/links retained; focus-visible member-shell treatment remains.

### US-57 — Screen reader support
**Status: PASS IMPLEMENTATION — EXACT-HEAD BROWSER EVIDENCE PENDING**
- Labels/fieldsets/headings are explicit.
- Status regions use `role=status`, `aria-live=polite`, `aria-atomic=true`.
- Required notification controls expose actual disabled state.

## EPIC P — Existing User Regression

### US-58 — Existing Profile data survives
**Status: PASS IMPLEMENTATION — REGRESSION MATRIX PENDING**
- Migrations are additive.
- Existing fields/prefs/onboarding completion are retained.
- Legacy preferred roles are grandfathered rather than deleted.

### US-59 — Existing Auth still works
**Status: PASS IMPLEMENTATION — REGRESSION MATRIX PENDING**
- No Auth replacement; existing Phase 1 signin/OAuth/verification/reset/session tests remain blocking.
- Username signin remains not enabled/NOT APPLICABLE.

### US-60 — Existing project journeys still work
**Status: PASS IMPLEMENTATION — REGRESSION MATRIX PENDING**
- No project/application/membership/Lab/contribution/Proof foreign keys changed.
- Existing repository regression suite remains mandatory on this runtime-impacting PR.

# Mandatory E2E journey mapping

| Test | Journey | Blocking evidence |
| --- | --- | --- |
| 1 | email signup → username → verification → onboarding → member home | existing Auth/onboarding suites + Phase 1 gate |
| 2 | Google OAuth → username → onboarding/Profile | Phase 1 OAuth contract + existing Auth browser tests |
| 3 | GitHub OAuth → username → onboarding/Profile | Phase 1 OAuth contract + existing Auth browser tests |
| 4 | partial onboarding → leave → resume | existing onboarding persistence + Phase 2 stale-save contract |
| 5 | existing member signin/profile intact | authenticated smoke/profile fixtures |
| 6 | edit Profile → refresh persists | Profile/browser + atomic DB contract |
| 7 | professional links valid | Profile validation/regression |
| 8 | skills/preferences persist | atomic profile/domain/tool save |
| 9 | availability updates readiness | existing readiness domain tests |
| 10 | username change same identity/history | Phase 1 identity tests + Account integration |
| 11 | email change + verification | Supabase Auth Account path; exact-head provider/local evidence required |
| 12 | password change/reset | existing Auth recovery tests |
| 13 | discoverability OFF hides public Profile | server `is_public=true` People queries + privacy test |
| 14 | invitations OFF persists | `project-experience-phase2-account.spec.ts` / privacy table |
| 15 | notification prefs persist | canonical notification table + Account API |
| 16 | update another Profile blocked | dedicated authenticated RLS test |
| 17 | update another privacy row blocked | dedicated authenticated RLS test |
| 18 | Profile network failure retains form | Profile client error-state contract |
| 19 | repeated Profile save no duplicates | UUID PK + atomic upsert/RPC |
| 20 | 320px | dedicated Account browser test |
| 21 | tablet | dedicated Account browser test |
| 22 | desktop | dedicated Account browser test |
| 23 | 200% zoom/text sizing | dedicated Account browser test |
| 24 | keyboard only | native controls/focus contract + browser pass |
| 25 | screen reader semantics | deterministic labels/status contract + browser semantics |
| 26 | project/application/history regression | full existing regression matrix |
| 27 | migration reproduction clean schema | CI isolated Supabase startup/migration set |
| 28 | RLS/security regression | dedicated authenticated RLS test + existing suites |

# PHASE 2 — USER JOURNEY SIGN-OFF

1. Onboarding start — **PASS implementation**
2. Onboarding resume — **PASS implementation**
3. Onboarding completion — **PASS implementation**
4. Profile data — **PASS implementation**
5. Profile editing — **PASS implementation**
6. Professional links — **PASS implementation**
7. Skills/preferences — **PASS implementation**
8. Availability — **PASS implementation**
9. Profile readiness — **PASS implementation**
10. Account structure — **PASS implementation**
11. Username management — **PASS implementation**
12. Email management — **PASS implementation; E2E evidence pending**
13. Password/security — **PASS implementation**
14. Member ID — **PASS implementation**
15. Privacy — **PASS implementation**
16. Discoverability — **PASS server contract**
17. Invitation preference — **PASS foundation**
18. Message preference — **PASS foundation**
19. Notification preferences — **PASS implementation**
20. Critical communication protection — **PASS implementation**
21. Profile vs Proof separation — **PASS**
22. Supabase schema — **PASS implementation**
23. Supabase migrations — **PENDING exact-head clean-schema execution**
24. Supabase Auth integrity — **PASS architecture; exact-head regression pending**
25. RLS — **PASS implementation; exact-head authenticated test pending**
26. Forms — **PASS implementation; browser regression pending**
27. UI/UX — **PASS implementation; browser regression pending**
28. Mobile — **PENDING exact-head browser evidence**
29. Tablet — **PENDING exact-head browser evidence**
30. Accessibility — **PENDING exact-head browser evidence**
31. 200% reflow — **PENDING exact-head browser evidence**
32. Existing-member regression — **PENDING exact-head regression matrix**
33. Existing-project regression — **PENDING exact-head regression matrix**
34. Future Discover readiness — **PASS foundation**
35. Future invitation readiness — **PASS foundation**
36. Future project-interest readiness — **PASS foundation**
37. Future collaboration readiness — **PASS foundation**
38. Documentation — **PASS at this commit**
39. Remaining implementation defects identified by this review — **none currently known; release evidence still pending**

## FINAL DECISION

**NOT APPROVED — exact-head release evidence pending.**

The implementation/user-journey review has no intentionally deferred Phase 2 defect. Approval must be changed to APPROVED only after the final documentation-inclusive PR head passes lint, typecheck, deterministic audits, build, clean isolated migrations, authenticated RLS/browser tests, public/persistence regression and the repository Release Gate. A failing gate is a defect to fix, not a waiver condition.
