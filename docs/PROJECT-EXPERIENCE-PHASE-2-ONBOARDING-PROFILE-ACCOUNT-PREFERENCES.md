# Project Experience Phase 2 — Onboarding, Profile, Account & Preferences

Status: implementation and Director user-journey review complete; exact-head release evidence pending.

Dependency: Phase 1 member identity contract from PR #210. PR #211 is intentionally stacked on `feature/project-experience-phase-1-identity`. The merge owner must retarget/rebase onto the merged Phase 1 baseline after #210 lands and must preserve the Phase 1 username/Member-ID migrations and APIs.

## Phase objective

Phase 2 creates one coherent member information architecture:

- **Onboarding** collects professional context and project-fit information and persists resume state.
- **Profile** owns self-managed professional identity, career context, skills, links, project-fit signals and availability.
- **Account** owns username management entry, Supabase Auth email/password entry points and read-only Member ID.
- **Privacy** owns discoverability, project-invitation and future member-message choices.
- **Notifications** owns optional communication preferences while required account/security communication remains non-configurable.
- **Proof** remains separate reviewed evidence and is never inferred from self-entered Profile data.

Supabase Auth remains the authority for authentication, sessions, email and password. Phase 2 does not introduce a second identity/profile/settings architecture.

## Canonical ownership

| Concern | Canonical owner |
| --- | --- |
| Authentication/session/email/password | Supabase Auth |
| Username + immutable Member ID | Phase 1 identity contract |
| Professional profile | `profiles` |
| Public/member discoverability | existing `profiles.is_public` |
| Domain preferences | `profile_domain_preferences` → `domains` |
| Tool preferences | `profile_tool_preferences` → `tools` |
| Preferred project roles | active `project_role_catalogue` titles; existing legacy profile roles are grandfathered until changed |
| Self-entered skill signals | `profiles.skills`, normalized case-insensitively; not verified Proof |
| Project invitations/member messages privacy | `member_privacy_preferences` |
| Notification definitions | `notification_event_catalogue` |
| Optional member notification overrides | `notification_preferences` |
| Reviewed evidence | existing contribution/Proof architecture |

No `profiles_v2`, `accounts_v2`, duplicate discoverability flag, duplicate notification store or username authority was introduced.

## Director review findings and fixes

### 1. Profile/Account privacy duplication

**Finding:** Profile and onboarding exposed discoverability controls even though Phase 2 requires a distinct Privacy information architecture. Also, the historic Profile API coerced an omitted `is_public` field to `false`, so simply removing the checkbox would have silently changed privacy on the next profile save.

**Fix:**
- Discoverability is managed in Account → Privacy only.
- Profile and onboarding no longer edit discoverability.
- `/api/profile` preserves current `profiles.is_public` unless the field is explicitly supplied by a trusted legacy caller.
- Existing People directory and public profile queries already enforce `is_public=true` server-side and continue to require public-profile readiness.

### 2. Missing Account destination

**Fix:** Added `/member/account`, desktop navigation and mobile More navigation. The page clearly separates:
- Username + Member ID
- Email + password/security
- Privacy
- Notifications

### 3. Username management

**Fix:** Account reuses `PATCH /api/member-identity` from Phase 1. The Phase 1 database policy remains authoritative for normalization, reserved names, uniqueness, race handling, history reservation and change cooldown. Member ID/Auth UUID/project history/Proof ownership are unchanged.

### 4. Email/password authority

**Fix:**
- Email is read from Supabase Auth and changed through `supabase.auth.updateUser({email})`.
- No profile email field is used as an authentication surrogate.
- Password change/recovery entry reuses the existing Supabase reset/callback/update-password flow.
- Password is never stored in profile/preferences tables.

### 5. Missing privacy preferences

**Fix:** Added `member_privacy_preferences`, keyed directly by `auth.users.id`, only for preferences with no existing owner:
- `allow_project_invitations`
- `allow_member_messages`

Owner-only RLS is mandatory. These preferences grant no authorization by themselves; future invitation/message services must consult them in addition to their own authorization rules.

### 6. Critical notification controls

**Finding:** The first Account implementation rendered all active catalogue events as configurable, which could allow account/security communication to be disabled.

**Fix:** Added one shared `isRequiredCommunication()` policy used by server rendering and `/api/account-preferences`. Critical/account/auth/security/verification/password events cannot be overridden. The UI disables those controls and explains why. Optional preferences still use the existing `notification_preferences` table.

### 7. Partial profile saves

**Finding:** The historic `/api/profile` wrote the profile row, then separately deleted/reinserted domain and tool preferences. A later preference failure could leave a partially updated profile.

**Fix:** Added authenticated security-invoker RPC `save_member_profile()` in `20260905110000_project_experience_phase_2_atomic_profile_save.sql`. Profile + domain + tool preference writes now commit or roll back together.

### 8. Stale browser overwrite

**Finding:** An old browser tab could silently replace newer profile data.

**Fix:** Profile/onboarding saves carry `expected_updated_at`. The atomic RPC locks the row and returns `PROFILE_STALE` if another session has saved newer data. API maps this to HTTP 409 with an actionable refresh message.

### 9. Onboarding completeness and taxonomy drift

**Fixes:**
- Existing profile values remain prefilled from canonical Supabase data.
- About You now exposes existing optional professional context: current role, organisation, experience level, employment status, languages and bio.
- Domains/tools continue to come from canonical tables.
- Preferred project roles are loaded from the existing `project_role_catalogue`, not a separate hardcoded taxonomy.
- Existing legacy preferred-role values remain visible/editable so migration does not wipe old profiles.
- API validates newly selected roles against active catalogue rows.
- Skill and language list values are de-duplicated case-insensitively.
- Weekly capacity uses the same governed ranges in onboarding and Profile.
- Onboarding no longer asks for privacy settings.

### 10. Onboarding continuation

Existing canonical continuation is preserved:
`/onboarding/complete` → `/auth/continue-after-onboarding` → safe internal `mettelo_return_to` destination or `/member` fallback.

The return value is cookie-backed/server-consumed and rejects protocol-relative paths; Phase 2 does not replace it with browser-only state.

## State contracts

### Onboarding

`AUTHENTICATED + IDENTITY READY` → saved profile step → resumable profile state → atomic final save → immutable first completion timestamp → completion page → safe continuation.

### Profile save

`CURRENT PROFILE VERSION` → validate fields/taxonomies → atomic RPC → profile + domain/tool mappings committed together → readiness recalculated → new `updated_at` returned.

Stale request → `409 PROFILE_STALE` → no write.

### Email

Current Supabase Auth email → request Auth update → provider verification/confirmation → same Auth UUID/member history.

### Privacy

- Discoverability → `profiles.is_public`
- Invitation/message choices → `member_privacy_preferences`

### Notifications

Active catalogue → required communication classified server-side → optional overrides written to existing `notification_preferences`; required communication cannot be disabled.

## Security / RLS

- Every Account API operation authenticates with Supabase Auth.
- Client never supplies an authoritative `user_id`.
- `member_privacy_preferences` has owner-only SELECT/INSERT/UPDATE RLS and no DELETE surface.
- Existing notification preferences remain owner-scoped by RLS.
- Profile writes use `auth.uid()` inside a security-invoker RPC and existing profile/mapping RLS.
- Profile RPC does not accept username, Member ID, email, password or arbitrary user ID.
- Public People surfaces filter discoverability server-side.
- Member ID is displayed as reference only and never used for authorization.
- Phase 1 identity guards remain authoritative.

## Profile vs Proof

Profile skills, bio, links, role interests and career context are self-managed signals. They do not create, modify or verify Proof. Public Proof continues to require reviewed contribution evidence and independent visibility rules. Profile editing never rewrites contribution history.

## Forms / UI / accessibility

- Profile, Account, Privacy and Notifications are separate concepts instead of one giant settings form.
- Profile inputs preserve values on recoverable failures.
- Stale profile conflicts are explicit rather than destructive.
- Account security failures keep existing username/email valid.
- Account form status uses `role=status`, `aria-live=polite`, `aria-atomic=true`.
- Required communication switches are disabled and explained.
- Account controls have 44px-class minimum interaction sizing and focus-visible treatment.
- Account layout reflows from desktop grid to one column on mobile.
- Dedicated authenticated Playwright coverage tests 320px, tablet, desktop and 200% text sizing/no page overflow.

## Notifications / email / cron / analytics

- Ordinary profile saves do not enqueue/send transactional email.
- Privacy/notification preference changes do not send email.
- Email-change confirmation remains Supabase Auth-owned.
- Password reset remains Supabase Auth-owned.
- No new cron is required.
- No username/email/Member-ID string is intentionally emitted as a new analytics property in this phase.

## Automated release contract

The existing `audit:phase2` compatibility command now also invokes `scripts/audit-project-experience-phase-2.mjs`. This prevents the older member-project Phase 2 audit from producing a false green for the new Project Experience Phase 2.

`tests/project-experience-phase2-account.spec.ts` is included in both authenticated smoke/staging scripts and checks:
- Account IA at 320px, tablet and desktop;
- 200% text reflow/no horizontal page overflow;
- owner privacy write succeeds;
- cross-user privacy write is denied;
- cross-user profile update changes zero rows;
- cross-user notification preference write is denied.

The normal runtime-impacting CI additionally rebuilds a clean isolated Supabase database from versioned migrations, runs the existing authenticated/public/persistence regression matrix, lint, typecheck, build and Release Gate.

## Rollback / forward-fix

Both Phase 2 migrations are additive. If Account UI is rolled back, existing Auth, Profile, Phase 1 identity, project/history and notification data remain valid. The privacy table can remain dormant safely. The atomic profile RPC can be forward-fixed without migrating identity relationships.

## Release status

Implementation review: **COMPLETE**.

Director release sign-off: **PENDING exact-head CI and isolated Supabase evidence**. Do not mark APPROVED until the final PR head passes the blocking gate after all documentation commits are included.
