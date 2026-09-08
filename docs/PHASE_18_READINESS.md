# Phase 18 — Member Discovery, Team Recruitment & Project Invitations

Status: DRAFT / READINESS REVIEW IN PROGRESS — NOT APPROVED

## Objective
Allow governed collaboration discovery and project invitations without bypassing canonical project/run membership, capacity, joining-window, privacy, readiness or security rules.

## Canonical journey

INVITE → ACCEPT → REVALIDATE → AUTHORIZE → JOIN EXISTING PROJECT RUN

An invitation must never automatically create project membership. A collaborator joining must reuse the canonical existing run rather than create a duplicate project or duplicate run.

## Phase 18 success criteria

1. Username search works.
2. Hidden profiles remain hidden.
3. Search is rate-limited.
4. Invite authorization is enforced server-side.
5. Existing-member invite works.
6. Decline works.
7. Expiry works.
8. Revoke works.
9. Duplicate invite is handled safely.
10. External invitation works.
11. Signup preserves invitation context.
12. Profile/onboarding readiness remains enforced.
13. Capacity is revalidated at acceptance.
14. Joining window is revalidated at acceptance.
15. Collaborator-needed state appears through canonical Discover.
16. Anti-abuse controls work.
17. RLS is correct.
18. Invitation E2E passes.
19. Documentation is updated.

## Preservation register

Phase 18 must extend, not replace:

- Supabase Auth identity and canonical user/profile relationships;
- username/profile architecture;
- profile discoverability and privacy preferences;
- invitation communication preferences;
- account status and project eligibility;
- block/report state where already present;
- canonical `project_runs` and `project_members`;
- Phase 9 participation, capacity and late-joining policy;
- Phase 10 team formation and membership authority;
- Phase 15 solo-to-team same-run conversion;
- Phase 16 vacancy/replacement recovery;
- Project Lead/Admin authority;
- canonical Discover architecture;
- notification preferences, notification outbox and transactional email infrastructure;
- existing rate-limit/anti-abuse infrastructure;
- `project_activity_log` / canonical audit infrastructure.

Do not create duplicate membership, run, recruitment, invitation, Offer, notification, Discover, signup or replacement systems when an existing Mettelo authority owns the responsibility.

## Surface impact matrix

Must assess before implementation:

- Supabase/PostgreSQL schema and migrations;
- RLS and column visibility;
- Auth/profile relationships;
- member profile/privacy/account settings;
- member discovery/search;
- member project and Mettelo Lab collaboration surfaces;
- Project Lead controls;
- Admin controls;
- Discover;
- signup/signin/onboarding continuation;
- notifications/preferences/email;
- rate limiting and anti-abuse;
- block/report behavior;
- analytics/privacy;
- mobile/tablet/desktop;
- accessibility and 200% reflow;
- tests and documentation.

## Mandatory database/security gates

Before approval prove:

- all Phase 18 schema is repository-versioned and reproducible;
- invitation records have valid project/run/inviter/invitee relationships;
- invitation lifecycle constraints match frontend/backend behavior;
- indexes and uniqueness/idempotency protections exist where needed;
- RLS exposes only permitted discoverable data and correct invitation records;
- hidden profiles cannot be enumerated by search or direct client queries;
- private email, Auth UUID, private profile fields, application history, support cases, private project participation and internal Admin data are not exposed through discovery;
- service-role use does not conceal broken client RLS;
- acceptance revalidates eligibility, capacity, joining window, account/profile readiness and invitation validity transactionally;
- duplicate/concurrent acceptance cannot create duplicate membership or over-capacity;
- external invitation tokens are scoped, expiring, revocable and non-enumerable;
- no hosted-only database change exists without a repository migration.

## Anti-abuse requirements

Assess and implement/reuse as required:

- member-search rate limiting;
- invite rate limiting and per-project/per-actor bounds;
- duplicate invite handling;
- expiry;
- revocation;
- privacy and enumeration resistance;
- block/report enforcement;
- audit of material invitation actions;
- replay/concurrent acceptance protection.

## UI/UX acceptance

Cover:

- discovery search/filter UI;
- member review before inviting;
- invite send state;
- pending invitation state;
- accept / decline / revoke / expired states;
- external invitation signup-return journey;
- collaborator-needed state in canonical Discover;
- loading, error, empty, success and disabled states;
- clear CTA hierarchy and confirmation copy;
- keyboard/focus behavior;
- 44px touch targets;
- mobile 320px, tablet 768px and desktop 1280px;
- 200% text reflow;
- no clipping or horizontal document overflow.

## Required test evidence

Add blocking static regression plus real authenticated/local Supabase coverage for:

- discovery privacy and hidden-profile denial;
- direct RLS behavior;
- inviter authorization;
- existing-member invite;
- decline, revoke and expiry;
- duplicate invite handling;
- external invitation;
- signup/onboarding continuation;
- profile readiness preservation;
- capacity revalidation;
- joining-window denial;
- concurrent acceptance race;
- anti-abuse/rate-limit behavior;
- collaborator-needed Discover integration;
- notification/email privacy;
- mobile/tablet/desktop/200% reflow and keyboard accessibility.

## Dependency rule

This Phase 18 branch is stacked on Phase 17 / PR #226. Phase 18 must remain DRAFT / NOT APPROVED and must not merge ahead of unresolved upstream dependencies or while any exact-head blocking release gate is unresolved.
