# Canonical member readiness

Last audited: 22 August 2026

## Purpose

Mettelo readiness is a domain contract, not one universal score. A member may be complete enough for one capability and not another, so product surfaces must consume named readiness states from `lib/member-readiness.ts` rather than inventing local percentages or numeric gates.

## Canonical states

`calculateMemberReadiness()` returns five distinct concepts:

- `profileCompletion` — how much of the editable professional profile is complete. It may reach 100% and must never gate editing.
- `matchingReadiness` — whether Mettelo has enough matching signals to make useful recommendations.
- `applicationReadiness` — whether the member has the minimum professional information required to submit a project application.
- `publicProfileReadiness` — whether the profile contains the information required for public People exposure. This remains separate from the member's explicit `is_public` preference.
- `proofStatus` — verified contribution status. Verified Proof is evidence earned through work and is not a default application prerequisite.

The compatibility `profiles.profile_readiness` column remains for backward compatibility and stores canonical profile-completion percentage. Capability gates must not interpret that column as application or public-profile eligibility.

## Product rules

1. Readiness may gate participation or public exposure. It must never gate the member's ability to edit the profile required to become ready.
2. Verified Proof is not required by default to discover, match to, or apply for projects.
3. Application readiness is requirement-based, not `score >= 85`.
4. Matching readiness and application readiness are intentionally different. A member can be matching-ready while still missing an application requirement.
5. Public-profile readiness is independent from application readiness. A ready public profile remains private unless the member has chosen `is_public`.
6. Existing application and membership lifecycle state remains authoritative. Losing readiness later does not erase an already-submitted application or project membership.
7. Pages may present the canonical states differently, but they must not recalculate them independently.

## Canonical consumers

The following surfaces must consume `calculateMemberReadiness()`:

- My Mettelo Home
- Profile
- Discover
- Recommended
- Member Project Detail
- Member Project Apply
- Profile save API
- People directory
- Public member profile

The architecture audit `scripts/audit-member-readiness-phase1.mjs` prevents those surfaces from reintroducing legacy `PROFILE_APPLICATION_READY`, `PROFILE_INTEREST_READY`, `profile_readiness >= ...`, or a second local readiness formula.

## Save/recalculation contract

When a profile is saved, the API validates the submitted fields and taxonomy preferences, calculates the canonical readiness result, persists canonical profile completion to `profiles.profile_readiness` for compatibility, updates preferences, and returns the canonical readiness object to the client.

A save failure must not silently discard edits. Readiness calculation failure must never be used as a reason to block profile editing.

## Application requirements

Default application readiness requires:

- full name;
- professional headline or current job title;
- professional area;
- location;
- experience level;
- at least three skills;
- at least one preferred project role;
- at least one domain or tool preference;
- project availability;
- weekly collaboration capacity.

Verified Proof, professional bio and external profile links are intentionally not default application requirements.

## Matching requirements

Matching readiness requires:

- experience level;
- at least three skills;
- at least one preferred project role;
- at least one domain or tool preference.

## Public-profile requirements

Public-profile readiness requires:

- full name;
- professional headline or current job title;
- professional area;
- location;
- at least three skills;
- professional bio;
- at least one LinkedIn, GitHub or portfolio link.

Public exposure additionally requires the member's explicit `is_public` preference.

## Phase 2 Profile UX contract

Phase 2 presents the canonical states without changing their business rules. The Profile experience must make the following understandable without asking a member to interpret one readiness score:

1. **Who Mettelo thinks I am** — professional identity appears before readiness mechanics.
2. **How complete my editable profile is** — Profile Completion remains a percentage and is labelled only as completion.
3. **What I can do now** — Matching, Applications and Public Profile are separate capability cards with explicit ready/not-ready language.
4. **What remains** — missing requirements are named in plain language and expose an Edit Profile action.
5. **What I should do next** — one Best Next Action is selected from the canonical missing requirements.
6. **What Proof means** — Verified Proof is visually separate and explicitly described as evidence earned through completed work, never as a default application gate.
7. **How public visibility works** — being public-ready does not publish a member; `is_public` remains the explicit choice.
8. **Editing is always available** — every readiness state retains a direct route into the existing ProfileEditor and Save profile flow.
9. **Existing journeys stay intact** — Discover, Recommended, public-profile preview, profile links, profile save and member navigation keep their existing routes and behavior.
10. **Responsive/accessibility quality** — the experience has no horizontal overflow across supported phone/tablet/desktop widths, primary edit actions remain usable, visible focus is retained and the page survives 200% text sizing.

The static contract audit `scripts/audit-member-profile-readiness-v2.mjs` protects the Phase 2 hierarchy and semantics. Authenticated browser coverage in `tests/member-profile-readiness-v2-visual.spec.ts` validates the profile at 320, 360, 375, 390, 412, 430, 768, 1024, 1280, 1440 and 1920px, verifies Edit Profile and Save profile remain reachable, and checks 200% text sizing.

## Verification

Phase 1 and Phase 2 are not complete unless all required release gates are green on the exact PR head. Regression evidence includes:

- deterministic domain tests proving no-Proof application readiness and Proof-cannot-compensate cases;
- architecture audit across all canonical consumers;
- profile schema contract audit;
- Phase 2 profile UX contract audit;
- authenticated profile save, profile responsive UX and project journey coverage;
- standard lint, typecheck, interaction, browser, isolated Supabase, Release gate and Deployment gate.

## Rollback

The application can revert the readiness integration and Profile UX while leaving the additive `profile_readiness` database column in place. The compatibility column is safe to retain because it is not the authority for capability eligibility.