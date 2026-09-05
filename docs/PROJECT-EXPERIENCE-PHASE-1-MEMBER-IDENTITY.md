# Project Experience Phase 1 - Member Identity & Username

Status: implementation in progress.

## Architecture decision

Supabase `auth.users.id` remains the immutable security and relational authority. Phase 1 extends the existing one-to-one `profiles` record with a human-facing identity instead of creating a second account system.

- `profiles.username` is nullable for legacy accounts, normalized to lowercase, ASCII-only, 3-30 characters, reserved-name protected and case-insensitively unique.
- `profiles.member_id` is an immutable generated human-readable identifier in `MTL-######` form. It grants no permission and is not used as a foreign key.
- Existing UUID foreign keys, Auth sessions, RLS ownership and Admin role checks remain unchanged.
- Existing users without a username keep access and can claim one from `/member/identity` or the Profile identity panel.
- Email signup collects username and stores it through existing Supabase Auth metadata plus the canonical `handle_new_user` profile trigger.
- New Google/GitHub signup completes username after provider verification through the existing social-account completion journey.
- Username claiming is server-authoritative through `/api/member-identity` and `claim_member_username`, with row locking, a database unique index, reserved-name enforcement and a short retry throttle.
- Username changes after first claim are intentionally not supported in this slice. That prevents rapid rename/impersonation churn until a governed change-history policy is defined.

## Preservation boundaries

The following contracts must not regress: email/password signup and signin, OAuth, email verification, password reset, session persistence, onboarding/resume, profile editing, member readiness, project applications, project memberships, Lab access, contribution ownership, Proof attribution, Admin authorization and all UUID-based relationships.

## Current implementation slice

This first coherent Phase 1 slice includes:

1. canonical username validation helper;
2. additive profile migration and Member ID backfill;
3. database username format/reserved/uniqueness enforcement;
4. server-side username claim RPC and authenticated API;
5. username field on email signup;
6. username completion on new social signup;
7. non-blocking legacy member claim page;
8. profile identity summary linking to the claim/view surface.

## Remaining Phase 1 work before completion

- expand deterministic and browser security coverage for duplicate races, case collisions, reserved names, malformed/confusable input, rate limiting and RLS;
- propagate `Full name + @username` to the required member-facing collaboration/attribution surfaces without exposing UUIDs unnecessarily;
- add governed Admin member lookup by username/Member ID;
- assess whether username signin is approved. It is not introduced by default;
- run mobile, keyboard, screen-reader and 200% reflow evidence;
- complete exact-head CI, isolated Supabase migration validation and Release Gate evidence;
- update Architecture/Features/Decision log when the complete Phase 1 contract is accepted.

Phase 1 must not be marked complete until all 27 programme success criteria have evidence.
