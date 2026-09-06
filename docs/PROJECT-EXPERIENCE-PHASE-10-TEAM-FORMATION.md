# Project Experience Phase 10 — Canonical Team Formation

**Status:** stacked Draft implementation. Not approved for merge/deployment until the Phase 6 → 7 → 8 → 9 dependency chain and the final exact-head Phase 10 validation are complete.

## Purpose

Phase 10 converts valid participation decisions into one governed project formation while preserving the existing Project Experience architecture.

Canonical entry paths are:

```text
METTELO OPEN + AUTO
Submit Interest
→ Auto Qualify
→ Phase 6 canonical run/membership allocation
→ Phase 10 consumes that formation state
→ Phase 9 participation readiness / six-hour window
→ Phase 11 final readiness / start
```

AUTO never fabricates Offer or Acceptance records.

```text
REVIEW_REQUIRED
Review
→ Offer
→ member accepts
→ accepted Offer reservation
→ Phase 10 canonical membership/run allocation
→ responsibility / Project Lead formation where applicable
→ Phase 9 participation state
→ Phase 11 final readiness / start
```

All Partner projects remain REVIEW_REQUIRED.

## Source of truth

Phase 10 reuses:

- `project_runs` for canonical run/cohort identity;
- `project_members` for canonical participation and the existing `team_role='project_lead'` leadership relationship;
- `project_applications` for application/admission history;
- `project_offers` for accepted selection and capacity-reservation history;
- `project_roles.responsibilities[]` as the existing project-defined delivery-responsibility vocabulary;
- `project_member_responsibilities` as the normalized many-to-many ownership/history relation added by Phase 10;
- `project_activity_log` for operational/audit evidence.

`project_member_responsibilities` is an assignment relation, not a second responsibility catalogue. Phase 10 deliberately does not use `project_members.project_role_id` as delivery ownership because application/contribution roles and delivery responsibilities are different concepts.

The historical `project_teams` collaboration layer is **not** a Phase 10 formation authority. Existing task/chat/history integrations that reference it remain compatibility behaviour, not a second team source of truth.

No `project_teams_v2`, second membership table, second run/cohort table, alternate responsibility catalogue, second leadership system, or alternate start service is permitted.

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

Target remains desirable planning capacity and does not block readiness once the applicable minimum is satisfied. Maximum remains hard and includes canonical live memberships plus live unconsumed Offer reservations according to the Phase 8/9 capacity contract.

## Accepted Offer → membership transaction

`phase10_form_accepted_offer(application_id)` is service-role only.

It:

1. resolves and locks the canonical project;
2. acquires the shared Phase 9 project-capacity lock;
3. locks the application and real accepted Offer;
4. requires REVIEW_REQUIRED admission and rejects AUTO ownership;
5. resolves the Phase 9 effective participation threshold;
6. returns the existing live membership on idempotent retry;
7. checks for a current active started run before any new-run path;
8. for late joining, delegates eligibility to `phase9_project_run_capacity(...)` and reuses that same active run only when Phase 9 says late joining is allowed;
9. rejects a disallowed late join with `LATE_JOIN_NOT_ALLOWED` instead of silently manufacturing another cohort;
10. otherwise reuses an appropriate canonical forming run, creating a new forming run only when no appropriate run exists;
11. inserts exactly one canonical `project_members` row;
12. lets existing Phase 8/9 reservation-consumption logic convert the accepted Offer reservation into occupied capacity without deleting Offer history;
13. advances a pre-start member to `waiting_for_team`, or an accepted active-run late joiner to `team_complete`;
14. records formation activity;
15. invokes Phase 9 participation reconciliation only for forming runs;
16. never restarts an already-active run or rewrites its kickoff/start history.

## Delivery responsibility governance

Phase 10 responsibilities are delivery work ownership, not application roles.

`project_roles.responsibilities[]` remains the existing project definition vocabulary. `project_member_responsibilities` records ownership of those values by canonical memberships.

This supports:

- one member owning multiple responsibilities;
- one responsibility being shared by multiple members where useful;
- active/released assignment history;
- project/run/membership referential validation;
- assignment and release audit events;
- roster-readable assignments for members of the same authorized run;
- no direct browser insert/update/delete authority.

`phase10_assign_delivery_responsibility(...)` and `phase10_release_delivery_responsibility(...)` are service-role only. Phase 10 no longer mutates `project_members.project_role_id` as responsibility ownership.

## Project Lead governance

Project Lead reuses the existing `project_members.team_role` architecture.

`phase10_confirm_project_lead(...)` is the explicit service-only confirmation/reassignment boundary. It serializes under the canonical project → capacity → run lock order, demotes the previous live Lead before confirming the new one, and records previous/new Lead audit context.

Leadership interest is only recommendation evidence. `assessProjectTeamReadiness(...)` may recommend a willing candidate but does **not** auto-promote them. Authority is established only through the canonical confirmation boundary.

For one-person independent runs, a separate Team-only Project Lead requirement is not manufactured.

## Phase 11 readiness handoff

Phase 10 does **not** activate projects.

The authoritative ACTIVE transition remains:

```text
startProjectRun()
→ service-only phase9_activate_project_run()
→ final mutable readiness revalidation under database locks
→ ACTIVE
```

The Phase 10 hardening migration keeps that existing atomic activation function and changes only its obsolete responsibility check: multi-member readiness now verifies an active `project_member_responsibilities` assignment for every live member instead of checking `project_members.project_role_id`.

The same atomic boundary continues to validate participation minimum/maximum, Lab readiness and exactly one canonical Project Lead where the collaborative run requires one. Team Formation Ready therefore remains distinct from Project Started.

## Capacity and Offer preservation

Used capacity remains governed by the Phase 8/9 capacity architecture:

```text
waiting/active canonical memberships
+
pending/accepted Offer reservations that are neither released nor consumed
```

When Phase 10 creates membership from an accepted Offer, the existing reservation-consumption trigger sets `capacity_consumed_at`. The Offer remains durable history and is not deleted or double-counted.

## Security

Ordinary authenticated members cannot execute privileged Phase 10 formation, responsibility or Lead RPCs.

Phase 10 does not grant browser-side authority to:

- create membership;
- choose an arbitrary run/cohort;
- assign/release delivery responsibility;
- appoint/reassign a Project Lead;
- change thresholds/capacity;
- activate a run/project.

Authenticated members may read authorized same-run responsibility data through RLS, but no authenticated responsibility write policies are created.

## Current versioned Phase 10 migrations

1. `20260906010000_project_experience_phase_10_canonical_formation.sql`
2. `20260906010100_project_experience_phase_10_responsibility_lead_governance.sql`
3. `20260906010200_project_experience_phase_10_delivery_responsibilities.sql`
4. `20260906010300_project_experience_phase_10_review_late_join_hardening.sql`
5. `20260906010400_project_experience_phase_10_atomic_activation_responsibility_handoff.sql`

No hosted-only DDL is permitted.

## Current blocking validation scope

The final exact Phase 10 head must prove at minimum:

- accepted REVIEW_REQUIRED Offer → exactly one canonical membership;
- pending/declined/expired Offer never creates membership;
- AUTO formation continues through Phase 6 without fabricated Offers;
- Team members share the correct forming run;
- active late join reuses the same run only under Phase 9 policy;
- disabled/cutoff/full late joining does not create a second run;
- run start/kickoff/history is preserved on late join;
- reservation is consumed exactly once and Offer history preserved;
- Solo/Flexible-independent threshold-1 formation;
- Flexible-Team configured collaborative minimum;
- idempotent and concurrent membership/run creation;
- concurrent final-place capacity enforcement;
- normalized many-to-many delivery ownership, sharing, release and audit;
- cross-project/undefined responsibility rejection;
- leadership interest never self-confers Project Lead authority;
- authorized Lead confirmation/reassignment and one-live-Lead concurrency;
- pre-start withdrawal releases capacity, responsibility ownership and Lead state without deleting history;
- readiness/six-hour schedule invalidation and restoration after membership loss;
- Phase 11 consumes normalized responsibilities and never starts merely because Phase 10 is ready;
- direct authenticated privileged execution is denied;
- Admin formation queue and member roster/state are wired to canonical data;
- existing application/Offer/run/member/task/chat/Lab/history behaviour remains intact;
- RLS/Auth/function grants, foreign keys, unique constraints and indexes are correct;
- clean isolated Supabase migration reconstruction passes;
- lint, typecheck, build and complete blocking suites pass;
- Member/Admin formation UX passes 320px, tablet, desktop, 200% reflow, keyboard, screen-reader and focus review;
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

After any upstream retarget/rebase, all exact-head Phase 10 validation becomes stale and must be rerun.
