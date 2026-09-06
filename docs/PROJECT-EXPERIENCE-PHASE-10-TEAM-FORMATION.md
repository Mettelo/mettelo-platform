# Project Experience Phase 10 — Canonical Team Formation

**Status:** stacked Draft implementation. Not approved for merge/deployment until the Phase 6 → 7 → 8 → 9 dependency chain and the final exact-head Phase 10 validation are complete.

## Purpose

Phase 10 converts selected participants into one governed project formation while preserving the existing Project Experience architecture.

The canonical formation path is:

```text
REVIEW_REQUIRED
shortlisted
→ offered
→ member accepts
→ accepted Offer reservation
→ Phase 10 canonical waiting membership
→ responsibility / Project Lead formation where applicable
→ Phase 9 participation threshold state
→ Phase 11 final readiness / start
```

For AUTO projects, Phase 6 already creates canonical run/membership state. Phase 10 must reuse that state and must never create a duplicate AUTO membership.

## Source of truth

Phase 10 uses:

- `project_runs` for the canonical run/cohort;
- `project_members` for canonical participation;
- `project_applications` for application/admission history;
- `project_offers` for accepted selection and capacity-reservation history;
- `project_roles` for explicit formation responsibilities;
- `project_activity_log` for operational/audit evidence.

The historical `project_teams` collaboration layer is **not** a Phase 10 formation authority. Existing task/chat/history integrations that reference it must be preserved as compatibility behaviour, not promoted into a second team source of truth.

No `project_teams_v2`, second membership table, second run/cohort table, or alternate start service is permitted.

## Participation geometry inherited from Phase 9

```text
TEAM
required formation threshold = configured minimum

SOLO
required formation threshold = 1

FLEXIBLE + SOLO / EITHER
required formation threshold = 1

FLEXIBLE + TEAM
required formation threshold = configured collaborative minimum
```

Target remains desirable planning capacity and does not block formation/start once the applicable minimum is satisfied. Maximum remains hard and includes both canonical memberships and live unconsumed Offer reservations.

## Accepted Offer → membership transaction

`phase10_form_accepted_offer(application_id)` is service-role only.

It:

1. resolves the application project;
2. locks the project row;
3. acquires the shared Phase 9 project-capacity lock;
4. re-reads and locks the application and Offer;
5. requires an accepted, unreleased REVIEW_REQUIRED Offer;
6. rejects AUTO ownership because Phase 6 already owns AUTO membership formation;
7. resolves the Phase 9 effective participation threshold;
8. reuses an existing canonical collaborative forming run where appropriate;
9. creates an independent forming run for Solo/Flexible-independent geometry where appropriate;
10. inserts exactly one waiting `project_members` row;
11. lets the existing Phase 8/9 reservation-consumption trigger convert that accepted reservation to occupied capacity;
12. advances the application to `waiting_for_team`;
13. records formation activity;
14. leaves the run/project unstarted.

The transaction is idempotent when a live canonical membership already exists.

## Responsibility and Project Lead governance

`phase10_assign_member_responsibility(...)` is service-role only and operates only on waiting members of an unstarted forming run.

It can attach a `project_roles` responsibility only when that role belongs to the same project.

For collaborative runs:

- a Project Lead may be assigned explicitly;
- a second live Project Lead is rejected;
- concurrent lead assignment is serialized;
- changing a responsibility does not implicitly demote an existing lead.

For one-person independent runs, a separate Project Lead designation is not required and Phase 10 rejects attempts to manufacture a Team-only lead requirement.

A database trigger provides defence in depth for privileged/direct writes. Its lock order matches Phase 9:

```text
project row
→ Phase 9 project-capacity advisory lock
→ run row
```

## Final activation boundary

Phase 10 does **not** activate projects.

The authoritative ACTIVE transition remains:

```text
startProjectRun()
→ service-only phase9_activate_project_run()
→ final mutable readiness revalidation
→ ACTIVE
```

Phase 11 owns final operating-readiness policy. Phase 10 only establishes canonical formation state needed by that later boundary.

## Capacity and Offer preservation

Used capacity remains:

```text
waiting/active canonical memberships
+
pending/accepted Offer reservations that are neither released nor consumed
```

When Phase 10 creates membership from an accepted Offer, the existing reservation-consumption trigger sets `capacity_consumed_at`. The Offer remains durable history and is not deleted or double-counted.

## Security

Ordinary authenticated members cannot execute Phase 10 formation/responsibility RPCs.

Phase 10 does not grant browser-side authority to:

- create membership;
- select a run/cohort;
- assign a responsibility;
- appoint a Project Lead;
- change thresholds/capacity;
- activate a run/project.

All such transitions remain server/database authoritative.

## Current versioned migrations

1. `20260906010000_project_experience_phase_10_canonical_formation.sql`
2. `20260906010100_project_experience_phase_10_responsibility_lead_governance.sql`

No hosted-only DDL is permitted.

## Required validation before sign-off

The final exact Phase 10 head must prove at minimum:

- accepted REVIEW_REQUIRED Offer → exactly one waiting membership;
- reservation consumed exactly once and Offer history preserved;
- application advances to `waiting_for_team`;
- Team members share the correct canonical forming run;
- Solo/Flexible-independent formation uses threshold 1 correctly;
- Flexible-Team uses configured collaborative minimum;
- idempotent retry does not duplicate membership/run;
- concurrent final-place formation cannot exceed maximum;
- AUTO Phase 6 membership is not duplicated;
- role from another project is rejected;
- responsibility coverage is explicit for collaborative formation;
- exactly one live Project Lead per collaborative run;
- independent runs do not require a Team-only Project Lead;
- direct authenticated execution of service-only RPCs is denied;
- formation cannot activate run/project/Lab prematurely;
- existing application/Offer/run/member/task/chat/history behaviour remains intact;
- RLS/Auth and function grants are correct;
- clean isolated Supabase migration reconstruction passes;
- lint, typecheck and build pass;
- blocking regression and backend E2E pass;
- Member/Admin formation UX passes mobile, tablet, desktop, 200% reflow, keyboard and screen-reader review;
- Event Room contract passes;
- protected Release Gate passes.

## Deployment dependency

Do not manually apply Phase 10 to hosted Supabase while the upstream Phase 6/7/8/9 chain is unresolved.

Required deployment order:

```text
Phase 6
→ Phase 7
→ Phase 8
→ Phase 9
→ Phase 10
```

After any upstream retarget/rebase, all exact-head Phase 10 validation becomes stale and must be run again.
