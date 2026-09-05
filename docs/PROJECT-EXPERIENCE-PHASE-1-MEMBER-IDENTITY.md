# Project Experience Phase 1 - Member Identity & Username

Status: director integration review complete; exact-head release validation pending.

## Architecture decision

Supabase `auth.users.id` remains the immutable security and relational authority. Phase 1 extends the existing one-to-one `profiles` record with a human-facing identity instead of creating a second account system.

- `profiles.username` is nullable for legacy accounts, normalized to lowercase, ASCII-only, 3-30 characters, reserved-name protected and case-insensitively unique.
- `profiles.member_id` is an immutable generated human-readable identifier in `MTL-######` form. It grants no permission and is not used as a foreign key.
- Existing UUID foreign keys, Auth sessions, RLS ownership and Admin role checks remain unchanged.
- Existing users without a username keep access and can claim one from `/member/identity` or the Profile identity panel.
- Historical Auth users without a `profiles` row are repaired through the canonical identity API before a claim; the route does not require a manual Admin intervention.
- Email signup collects username and stores it through existing Supabase Auth metadata plus the canonical `handle_new_user` profile trigger.
- New Google/GitHub signup completes username after provider verification through the existing social-account completion journey.
- Username claiming is server-authoritative through `/api/member-identity` and `claim_member_username`, with row locking, database uniqueness, reserved-name enforcement and a short retry throttle.
- Direct owner INSERT/UPDATE cannot be used to assign or mutate protected identity fields. Member ID is system generated and immutable; username mutations are permitted only through trusted signup provisioning or the canonical claim operation.
- Username changes after first claim are intentionally not supported. This prevents rapid rename/impersonation churn until a governed change-history policy is defined.

## Preservation boundaries

The following contracts remain authoritative and must not regress: email/password signup and signin, OAuth, email verification, password reset, session persistence, onboarding/resume, profile editing, member readiness, project applications, project memberships, Lab access, contribution ownership, Proof attribution, Admin authorization and all UUID-based relationships.

Public Projects and Member Discover do not expose member identity in Phase 1. Discoverability, invitations and public-member visibility belong to Phase 18 and must not be pre-empted without its privacy controls. The self-facing Proof portfolio is also unchanged because contribution/Proof identity governance belongs to Phase 20; UUID ownership remains preserved underneath it.

## Director review implementation

The Phase 1 implementation now includes:

1. canonical username validation helper;
2. additive profile migration and Member ID backfill;
3. database username format, reserved-name and case-insensitive uniqueness enforcement;
4. system-only Member ID generation and immutable identity-field guards;
5. row-locked, authenticated username claim RPC with retry throttling and duplicate-race handling;
6. authenticated member-identity API with historical-profile recovery;
7. username field on existing email signup;
8. username completion on new Google/GitHub signup;
9. non-blocking legacy-member claim page with recoverable loading/error/success states;
10. Profile identity summary showing `@username` and Member ID;
11. Admin identity resolution by name, email, `@username` or Member ID inside the existing `admin.access.manage` boundary;
12. Admin identity results that show full name, username, Member ID and email before account-level actions;
13. authorised project-team and Mettelo Lab rosters showing `Full name + @username` while preserving hidden-cohort privacy and excluding Member ID from collaboration UI;
14. expanded deterministic Phase 1 audit covering the new identity architecture;
15. authenticated local-Supabase security tests covering canonical claim, case-insensitive collision, reserved names, direct-update denial, Member-ID immutability and Admin resolution;
16. responsive signup tests at 375/390/414 px plus 200% text scaling and reserved-name form validation.

## UI/UX readiness decisions

- Existing Mettelo form/card/button patterns are reused; no parallel identity design system was introduced.
- Username controls retain visible labels, format help, disabled/working states and `aria-live` feedback.
- Claim and social-completion forms provide explicit recoverable error and success states before navigation.
- Primary controls maintain 44 px minimum targets where the Phase 1 UI adds or changes actions.
- Profile identity collapses from horizontal to stacked layout on narrow screens.
- Admin identity lookup collapses to a single-column form/results layout on mobile and uses defensive wrapping for long identity values.
- Lab/team handles wrap defensively and are shown only inside already-authorised team surfaces.
- Public/Discover visibility is deliberately unchanged to avoid a privacy regression.

## Communications and analytics

Username creation or claiming does not send routine email. Supabase Auth remains responsible for verification, password recovery and account-security communication.

The current analytics implementation is a lightweight GA click-intent layer rather than a canonical product-event pipeline. Phase 1 does not introduce a second analytics architecture. The programme event names `username_selection_started`, `username_created` and `username_claimed` remain reserved for the canonical analytics implementation, and username strings or other sensitive free text must not be emitted as analytics payloads.

## Release evidence required before sign-off

Phase 1 is not approved merely because implementation exists. The final exact PR head must prove, as applicable:

- lint;
- TypeScript typecheck;
- deterministic Phase 1 identity audit;
- build;
- isolated Supabase migration application;
- authenticated identity security/RLS tests;
- Admin identity lookup;
- Mettelo Lab/team privacy regression;
- public browser regression including signup/mobile/200% coverage;
- existing Auth, onboarding, Profile, application, Admin, Lab and collaboration regression suites;
- Event Room contract;
- protected Release Gate and Deployment Gate.

Username signin remains **not applicable** for this phase because it has not been approved as a product requirement; email/password and OAuth signin remain the supported authentication methods.

Phase 1 may be marked complete only when all applicable programme success criteria have evidence on the exact merged state.
