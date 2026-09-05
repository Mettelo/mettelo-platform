# Phase 1 — Member Identity & Username: Full User-Journey Sign-Off

Status: DIRECTOR REVIEW COMPLETE; FINAL RELEASE EVIDENCE PENDING.

This document is the Phase 1 user-story acceptance record. It supplements the technical identity audit and is intentionally broader than the original 27 success criteria.

## Architecture truth

- Supabase `auth.users.id` remains the authentication/security and relational authority.
- `profiles.member_id` is immutable, system generated, human readable, and never authorization.
- `profiles.username` is the human-facing handle; it is normalized lowercase, case-insensitively unique, ASCII-safe, reserved-name protected, and transactionally governed.
- Foreign keys for applications, interests, memberships, runs, Chat, Events, Tasks, notifications, contributions and Proof remain UUID-based.
- Public/Discover exposure of member identity remains privacy-governed later-phase scope; Phase 1 creates the identity contract only.
- Account/Privacy settings UI remains Phase 2 scope. Phase 1 provides a compatible username-change API/data contract rather than adding an isolated settings UI.

## Review outcomes by user story

| Story | Title | Status | Evidence / decision |
| --- | --- | --- | --- |
| US-01 | Sign up with email | PASS | Existing Supabase Auth signup retained; Full Name, Username, Email and Password are collected; username is supplied to canonical profile provisioning; profile remains keyed by Auth UUID; responsive/auth UI regression coverage exists. |
| US-02 | Username availability | PASS | Canonical validation runs client/server; the DB unique index is authoritative and race-safe. No public preflight username-enumeration endpoint is exposed. On submit/claim, unavailable handles receive a safe generic conflict without DB details. |
| US-03 | Safe username format | PASS | Shared validator + DB check enforce 3–30 characters, lowercase normalization, ASCII letters/numbers/underscore, leading letter, reserved-name policy and indexed case-insensitive uniqueness. |
| US-04 | Google signup | PASS | Existing Google OAuth retained. Social-signup callback marks identity completion required and routes to canonical username completion before member journeys. |
| US-05 | GitHub signup | PASS | Same governed flow as Google. Provider username is not trusted or copied as Mettelo identity. Canonical claim handles collisions. |
| US-06 | Interrupted OAuth username completion | PASS | Auth metadata persists `mettelo_identity_required` and safe continuation path. Member layout redirects incomplete social signups back to completion; successful claim clears the marker. No new account is created on resume. |
| US-07 | Existing user without username | PASS | Username remains nullable for legacy users; existing Auth/session/UUID relationships remain valid; no forced duplicate account. |
| US-08 | Existing user claims username | PASS | `/member/identity` + `/api/member-identity` POST reuse current Auth user; canonical DB RPC is row locked/idempotent/race-safe and preserves safe continuation. |
| US-09 | Sign in with email | PASS | Existing email/password, OAuth signin, reset and verification architecture preserved. |
| US-10 | Sign in with username | NOT APPLICABLE | Username signin has not been approved for Phase 1. It is deliberately not implemented and username does not become an authentication authority. |
| US-11 | View my identity | PASS | Profile/identity surfaces show Full Name, `@username` and distinct Member ID; Auth UUID is not presented as member-facing identity. |
| US-12 | Consistent identity across affected surfaces | PASS | Canonical identity is consumed by authorised team/Lab rosters and Chat mentions. Discover/invitations/support/Proof can use the same UUID + profile identity later without a second identity model. |
| US-13 | Change username | DEFERRED TO PHASE 2 UI / BACKEND PASS | Phase 1 now provides authenticated `PATCH /api/member-identity` + canonical DB RPC. Auth UUID and Member ID remain unchanged; previous handles are permanently reserved; 30-day change cooldown; atomic failure semantics. UI belongs to Account Settings in Phase 2. |
| US-14 | Username change failure | DEFERRED TO PHASE 2 UI / BACKEND PASS | API returns actionable INVALID/RESERVED/UNAVAILABLE/RATE_LIMITED states. Transaction rollback preserves existing username and history on failure. |
| US-15 | View account email | DEFERRED TO PHASE 2 | Supabase Auth remains the sole authentication-email authority. Phase 1 adds no competing profile-email authority or public email exposure. |
| US-16 | Change email | DEFERRED TO PHASE 2 | No Phase 1 profile-email mutation path was introduced. Future change must use Supabase Auth verification and keep the same Auth UUID/Member ID/username/history. |
| US-17 | Password change/reset continuity | PASS | Existing recovery callback, reset email, password-update and OAuth flows are preserved; username does not replace/bypass Supabase Auth. |
| US-18 | Profile and Account are not mixed | PASS FOUNDATION | Phase 1 adds identity summary/claim entry only. Full Profile / Account / Privacy / Notifications IA remains explicitly Phase 2. |
| US-19 | Full name update continuity | PASS | Existing profile editing remains UUID-keyed; username/Member ID are protected identity fields and are not changed by ordinary profile updates. |
| US-20 | Stable Member reference | PASS | `member_id` is generated automatically, unique, immutable, non-authorizing and mapped one-to-one to the existing Auth UUID profile. Admin lookup can use it. |
| US-21 | Username is not Member ID | PASS | Auth UUID, Member ID, username, Full Name and email remain separate concepts and fields/authorities. |
| US-22 | Admin identifies member | PASS | Existing Admin Access capability boundary can resolve Full Name/email plus canonical username/Member ID. Normal members cannot use Admin identity data. |
| US-23 | Username change visible to Admin | PASS FOUNDATION | Username changes update the same profile row; UUID/Member ID/applications/history remain unchanged. Admin lookup resolves the updated current username to the same member. |
| US-24 | Identity persists correctly | PASS SUBJECT TO EXACT-HEAD MIGRATION CI | Versioned migrations add identity fields, unique indexes, DB constraints, RLS-protected history and canonical RPCs. No dashboard-only schema dependency is introduced. |
| US-25 | Username update does not break FKs | PASS | No inspected project/member relationship uses username as primary FK; UUID remains relational authority. |
| US-26 | Prevent account enumeration | PASS | No public availability/account-resolution endpoint exists. Claim/change errors reveal only handle usability, not email/account/private profile data; retry throttling applies to claims and change cooldown applies to rename. |
| US-27 | Prevent impersonation | PASS | Reserved system names, lowercase ASCII-only format, case-insensitive uniqueness, archived-handle reservation and rejection of Unicode/confusable characters. |
| US-28 | Prevent unauthorized identity changes | PASS SUBJECT TO EXACT-HEAD SECURITY CI | Owner identity APIs derive user from session; Member ID is trigger-protected; direct username mutation is blocked unless canonical DB operation context is active; history table has RLS and no authenticated direct grants. |
| US-29 | New member continues into onboarding | PASS | Email signup verification continues to onboarding. Social signup cannot enter member space while `mettelo_identity_required` is true. |
| US-30 | Project-led signup return | PASS FOUNDATION | Safe internal `next` handling remains; social identity continuation persists a safe internal return path. Later Submit Interest exact-return orchestration remains later-phase scope. |
| US-31 | Identity ready for discovery | PASS FOUNDATION | Full Name + username are canonical profile identity while Auth UUID stays private/internal. Public discoverability/privacy controls remain Phase 18. |
| US-32 | Identity ready for project invitations | PASS FOUNDATION | Stable username maps to immutable UUID/Member ID; no invitation system duplication introduced. |
| US-33 | Identity ready for @mentions | PASS | Chat now enriches authorised team identity and prefers `@username`, with full-name fallback for legacy members; hidden cohorts remain hidden. |
| US-34 | Identity ready for Proof | PASS | Contribution/Proof ownership remains attached to immutable UUID, so username/name/email changes cannot orphan evidence. |
| US-35 | Signup UI feels complete | PASS SUBJECT TO FINAL BROWSER CI | Field order and hierarchy remain Full Name → Username → Email → Password; help/error/loading/disabled states use existing form system; mobile/tablet/desktop and 200% coverage is part of blocking auth regression. |
| US-36 | Username claim UI | PASS SUBJECT TO FINAL BROWSER CI | Dedicated identity page explains the identity model; canonical claim form provides labelled input, help, working/error/success state, network recovery and accessible live status. |
| US-37 | Account/Profile entry point | PASS FOUNDATION | Profile contains a designed identity summary/CTA, not an appended raw textbox. Account/Privacy redesign is explicitly deferred to Phase 2. |

## Mandatory end-to-end journey disposition

1. New email/password signup → username → verification → profile identity: blocking Auth/browser + isolated Supabase evidence required.
2. Google social signup → username completion → onboarding: architecture implemented; final exact-head browser evidence required.
3. GitHub social signup → username completion → onboarding: same.
4. Legacy user → claim → same history: canonical UUID unchanged; isolated Supabase security evidence required.
5. Existing user with username → normal signin: preserved.
6. Username collision: DB unique constraint + safe conflict.
7. Case collision: DB lower(username) unique index.
8. Concurrent claim: row lock + unique constraint/exception handling.
9. Username change: backend contract implemented; Account UI deferred to Phase 2; same UUID/Member ID/history guaranteed.
10. Email change: UI deferred to Phase 2; Phase 1 introduces no conflicting email authority.
11. Forgot/reset password: preserved regression path.
12. Admin username lookup: implemented within Admin Access capability boundary.
13. Unauthorized identity mutation: trigger/RLS/API boundary + isolated Supabase security coverage.
14–19. 320px/tablet/desktop/200%/keyboard/screen-reader: final browser/accessibility evidence required on exact head.
20. Auth/profile/project-history regression: full runtime CI matrix required.

## Username change policy

- The Account Settings UI is Phase 2.
- The backend contract exists now so Phase 2 does not need a schema redesign.
- Only the authenticated owner can invoke the canonical change RPC through the authenticated API.
- Member ID and Auth UUID never change.
- Previous usernames are written to `member_username_history` and remain reserved indefinitely to prevent impersonation and attribution ambiguity.
- A member can change username at most once every 30 days.
- Failed changes are transactional; the current username remains intact.
- No security email is emitted in Phase 1. Phase 2 must reassess whether a transactional security notification is required when the UI is exposed.
- Analytics must record only a coarse `username_changed` event later; never the old/new username values.

## Availability / enumeration policy

Phase 1 deliberately does not expose an unauthenticated username availability API. The authoritative check occurs inside account provisioning or authenticated canonical claim/change operations. Responses reveal only that the requested handle cannot be used, never the owner, email, Member ID, profile details, or whether a particular private account exists.

## Phase 1 user-journey sign-off summary

1. Signup journey — PASS subject to final exact-head browser/runtime CI.
2. OAuth journey — PASS subject to final exact-head browser/runtime CI.
3. Existing-user migration — PASS subject to isolated migration CI.
4. Username claim — PASS subject to isolated security CI.
5. Email signin — PASS regression.
6. Username signin — NOT APPLICABLE; not approved.
7. Username display — PASS.
8. Username change readiness — PASS backend; UI deferred to Phase 2.
9. Email-change compatibility — PASS foundation; UI deferred to Phase 2.
10. Password/reset compatibility — PASS regression.
11. Member-ID integrity — PASS subject to migration CI.
12. Supabase schema/migrations — PASS implementation; exact-head migration evidence pending.
13. RLS — PASS implementation; exact-head security evidence pending.
14. Admin identity — PASS.
15. Future Discover readiness — PASS foundation; exposure remains Phase 18.
16. Future invitation readiness — PASS foundation.
17. Future mention readiness — PASS and integrated into current Chat.
18. Future Proof attribution readiness — PASS.
19. Mobile/UI/UX — PASS implementation; exact-head browser evidence pending.
20. Accessibility — PASS implementation; exact-head browser evidence pending.
21. Regression — exact-head runtime matrix pending.
22. Automated test status — pending exact-head completion after latest fixes.
23. Remaining defects — no known implementation defect from this review; release evidence is still pending.

## FINAL DECISION

**NOT APPROVED FOR RELEASE YET.**

The implementation and user-journey integration review are complete, including the gaps exposed by this review. Approval changes to **APPROVED** only when the latest exact-head runtime/backend CI proves lint, typecheck, build, versioned migrations, isolated Supabase/RLS/security, Auth/browser regression, responsive/accessibility and protected Release Gate evidence.
