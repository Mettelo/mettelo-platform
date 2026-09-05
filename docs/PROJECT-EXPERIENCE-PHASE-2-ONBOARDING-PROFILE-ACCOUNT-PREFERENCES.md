# Project Experience Phase 2 — Onboarding, Profile, Account & Preferences

Status: implementation in progress.

Dependency: Phase 1 member identity contract from PR #210. This branch was created from the reviewed Phase 1 head so Phase 2 can use `profiles.username`, immutable `member_id`, `/api/member-identity`, and the governed username-change contract without duplicating identity architecture. The merge owner must rebase/retarget this PR onto the merged Phase 1 baseline when #210 lands.

## Phase objective

Create a coherent member information architecture in which:

- Onboarding gathers the minimum professional and project-fit information required to begin using Mettelo.
- Profile owns professional identity, experience, skills, career context, project-fit signals and availability.
- Account owns authentication/contact identity, username/Member ID management entry points, privacy and notification preferences.
- Privacy choices do not silently change when a member edits unrelated professional-profile fields.
- Supabase Auth remains authoritative for email/password/session security.
- Existing `profiles`, profile preference mappings and `notification_preferences` remain canonical rather than being replaced.

## Repository readiness findings

### Existing capabilities to preserve

- Five-step resumable onboarding with saved progress and explicit completion state.
- Canonical `/api/profile` used by both onboarding and Profile editing.
- Professional Profile with readiness states, avatar, skills, preferred roles, domains, tools, links and availability.
- `profiles.is_public` as the existing public-profile/discoverability preference.
- `notification_event_catalogue` and `notification_preferences` with owner-scoped RLS.
- Supabase Auth email/password/recovery/OAuth behaviour.
- Phase 1 username, Member ID and identity invariants.
- Existing project/application/Lab/Proof relationships keyed by immutable Auth UUID.

### Gaps found

1. There was no canonical member Account destination.
2. Account/security/privacy concepts were visually mixed into the professional Profile surface.
3. `/api/profile` converted an omitted `is_public` field to `false`, which meant moving privacy out of Profile could silently make a member private on the next unrelated Profile save.
4. There was no stored member-level preference for future project invitations or member-to-member messages.
5. Existing notification preferences had database/RLS infrastructure but no member-facing management workspace.
6. Secure email-management and password-recovery entry points were not grouped in a coherent member account surface.

## Canonical ownership decisions

| Concern | Canonical owner |
| --- | --- |
| Authentication user/session/email | Supabase Auth |
| Human-facing username + Member ID | Phase 1 identity contract |
| Full name/headline/bio/career context | `profiles` |
| Profile discoverability | existing `profiles.is_public` |
| Domain/tool project-fit preferences | existing profile preference mappings |
| Invitations/messages privacy | `member_privacy_preferences` |
| Notification event definitions | `notification_event_catalogue` |
| Member notification overrides | `notification_preferences` |

No `profiles_v2`, `accounts_v2`, second member record, parallel notification system or parallel discoverability flag is introduced.

## Phase 2 implementation started

### Account workspace

New `/member/account` destination provides:

- Full name, `@username` and Member ID identity summary.
- Account email from Supabase Auth.
- Secure email-change request through Supabase Auth.
- Password-reset entry using the existing recovery flow.
- Profile discoverability control backed by `profiles.is_public`.
- Project-invitation and member-message privacy controls.
- Notification controls generated from the existing active event catalogue and saved to existing member notification preferences.

### Privacy persistence

New additive table `member_privacy_preferences` stores only the privacy decisions that had no existing canonical owner:

- `allow_project_invitations`
- `allow_member_messages`

The table is keyed by `auth.users.id`, uses owner-only RLS, and grants no authorization capability by itself. Future invitation/message features must consult these preferences in addition to their own authorization rules.

### Profile preservation fix

`PATCH /api/profile` now distinguishes between an explicit `is_public` choice and an omitted field. If Profile editing does not submit privacy, the existing discoverability value is retained. This prevents an unrelated professional-profile edit from silently changing privacy.

## UI/UX direction

- Account is a first-class member destination in desktop navigation and mobile More navigation.
- Account cards use the existing Mettelo member workspace visual language: white bounded surfaces, Space Grotesk hierarchy, compact metadata labels and existing button primitives.
- Layout is two-column on desktop and one-column on tablet/mobile.
- Notification rows reflow at phone widths rather than forcing horizontal tables.
- Form controls retain minimum practical touch sizes and existing global focus-visible treatment.
- Status messages are announced through `role=status`, `aria-live=polite`, `aria-atomic=true`.
- Empty notification-catalogue state is explicit rather than rendering a broken form.

## Backend/state contracts

### Email

`CURRENT EMAIL` → request Supabase Auth email update → verification/confirmation managed by Supabase → same Auth UUID/member history.

Phase 2 does not create a profile email field.

### Password

Account uses the existing verified password-recovery flow. Password is never persisted in profile/account tables.

### Privacy

Account PATCH updates `profiles.is_public` and `member_privacy_preferences` for `auth.uid()` only.

### Notifications

Only event keys that are active in `notification_event_catalogue` can be written. Unknown event keys fail closed.

## Notifications/email/cron/analytics impact

- No new transactional email template is created solely for Account preferences.
- Email-change verification remains Supabase Auth-owned.
- Password reset remains existing Auth-owned communication.
- No new cron is required.
- No sensitive email/username/member-ID value should be emitted into client analytics payloads.

## Security review

- Account API requires authenticated Supabase user for every read/write.
- Privacy and notification writes rely on owner-scoped RLS and server-derived `user.id`.
- Client cannot choose another `user_id`.
- Email update calls Supabase Auth rather than mutating profile data.
- Member ID remains immutable and is display-only in Account.
- Username changes continue through the Phase 1 canonical identity endpoint; Account must not create another username mutation path.
- Notification event keys are validated against active canonical catalogue rows.

## Regression surface

Must preserve:

- onboarding resume/completion;
- Profile readiness calculations;
- existing public-profile eligibility checks;
- member Discover/recommendation inputs;
- email/password/OAuth authentication;
- Phase 1 username/Member ID;
- applications/memberships/Lab/Proof;
- Admin authorization;
- notification delivery defaults when no member override exists.

## Required Phase 2 release evidence

Before Director sign-off this PR must prove:

- lint and typecheck;
- build;
- isolated migration application;
- owner-only RLS for `member_privacy_preferences`;
- profile privacy preservation regression;
- Account API authentication/IDOR behaviour;
- active-notification-key validation;
- email-update compatibility;
- password-reset compatibility;
- onboarding/profile regression;
- member navigation regression;
- mobile/tablet/desktop Account UI;
- 320px and 200% text reflow;
- keyboard/focus/status-message accessibility;
- full blocking repository regression suite.

## Rollback

The Phase 2 migration is additive. If the Account UI needs rollback, existing Profile, Auth, notification and Phase 1 identity data remain valid. `member_privacy_preferences` can remain dormant without affecting existing project authorization. No destructive rollback of member data is required.
