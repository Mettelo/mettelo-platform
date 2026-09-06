# Project Experience Phase 9 — Team / Solo / Flexible Participation Model

**Status:** implementation on stacked draft Phase 9 branch. Not approved for merge or deployment until exact-head validation and the Phase 6 → 7 → 8 dependency chain are complete.

**Dependency chain:** Phase 6 → Phase 7 → Phase 8 → Phase 9. Phase 9 is stacked on Phase 8 and must be retargeted/revalidated if an upstream phase changes.

## Canonical product contract

Phase 9 activates one participation model across project configuration, admission, Offers, runs, memberships, start scheduling and later joining.

```text
TEAM
configured minimum = participation threshold
configured target = desirable planning capacity
configured maximum = hard capacity ceiling

SOLO
effective minimum = 1
target = maximum = 1

FLEXIBLE
member preference SOLO or EITHER => effective threshold 1
member preference TEAM => configured collaborative minimum
target = desirable planning capacity
maximum = hard capacity ceiling
```

The non-negotiable rules are:

```text
MINIMUM controls participation readiness.
TARGET never blocks start once the applicable minimum is reached.
MAXIMUM can never be exceeded.
PARTICIPATION READY is not PROJECT ACTIVE.
```

Participation geometry is independent from admission mode. Partner projects remain REVIEW_REQUIRED. Mettelo Open AUTO projects use participation readiness only to begin the six-hour Admin intervention window; final start still uses the canonical start/Lab readiness service.

## Architecture reused

Phase 9 introduces no second project, application, Offer, run, team, membership or start system. It reuses:

- `projects.participation_mode`;
- `projects.min_team_size`, `target_team_size`, `max_team_size`;
- legacy-compatible `projects.team_size_threshold`;
- `project_applications.participation_preference`;
- canonical `project_runs` and `project_members`;
- Phase 6 AUTO admission and late-joining policy;
- Phase 7 REVIEW_REQUIRED boundary;
- Phase 8 `project_offers` reservation/consumption contract;
- canonical `startProjectRun()`;
- existing Lab/final-readiness architecture.

## Configuration and legacy safety

Phase 9 supersedes the earlier assumption that every Flexible project must have `min_team_size = 1`.

Flexible now retains a genuine collaborative minimum. The effective threshold is resolved at run time:

- Flexible + Solo → 1;
- Flexible + Either → 1;
- Flexible + Team → configured `min_team_size`.

Canonical validation remains:

- participation mode must be `solo`, `team`, or `flexible`;
- values are positive and bounded;
- `minimum <= target <= maximum`;
- Solo is `1 / 1 / 1`;
- Team minimum is at least 2;
- target is planning capacity, not a start gate.

The TypeScript parser only maps a **missing** legacy mode where the historical threshold makes the mapping deterministic. An explicitly supplied unknown/ambiguous mode fails with `INVALID_PARTICIPATION_MODE`; values such as `individual`, `group`, `any`, or `solo_team` are not silently guessed.

Started runs are not rewritten by later configuration changes. Forming runs are safely recalculated when canonical minimum/mode changes. A maximum/mode change is rejected when its effective maximum would be below current live capacity.

## Versioned Phase 9 migrations

Phase 9 currently uses these versioned migrations:

1. `20260906001000_project_experience_phase_9_participation_runtime.sql`
2. `20260906002000_project_experience_phase_9_participation_hardening.sql`
3. `20260906002100_project_experience_phase_9_auto_reconcile_order.sql`
4. `20260906002200_project_experience_phase_9_auto_window_guard.sql`
5. `20260906002300_project_experience_phase_9_capacity_change_guard.sql`

No hosted-only DDL is permitted.

## Run threshold contract

For unstarted runs:

- Solo → required size 1;
- Team → configured minimum;
- Flexible independent run (Solo/Either) → required size 1;
- Flexible Team run → configured collaborative minimum.

A forming Flexible Team run is not collapsed to one. Existing started-run threshold history remains unchanged.

## Canonical capacity contract

Capacity is enforced at database boundaries, not in browser calculations.

One Phase 9 project-capacity advisory lock serializes the canonical capacity-consuming/reserving boundaries added in this phase. The database membership guard and Offer-reservation guard both participate in this lock contract, so later invitation/Admin/team-formation writers cannot bypass maximum simply by using a different frontend/API path.

Canonical used capacity is:

```text
waiting/active canonical memberships
+
pending/accepted Offer reservations that are not released and not consumed
```

When an accepted Offer becomes canonical membership, Phase 8 sets `capacity_consumed_at`. The membership then occupies the place and the Offer remains historical evidence without being counted twice.

The service-only `phase9_project_run_capacity(project_id, run_id)` snapshot reports:

- participation mode;
- effective run minimum;
- target;
- maximum;
- occupied memberships;
- reserved Offers;
- used capacity;
- available places;
- participation readiness;
- target reached;
- capacity available;
- late-joining availability.

Normal authenticated browser users cannot invoke this privileged capacity RPC directly.

## Six-hour AUTO scheduling

For legitimate Mettelo Open AUTO projects, six hours is the server-authoritative intervention window.

Phase 9 normalizes AUTO `auto_start_delay_minutes` to `360` and protects that value server-side. Browser input cannot shorten the window.

Canonical transition:

```text
below participation threshold
→ FORMING

threshold first reached
→ start_ready_at persisted
→ scheduled_start_at = start_ready_at + 6 hours
→ START SCHEDULED
```

An ordinary additional member does **not** reset an existing valid schedule.

If an unstarted run loses the minimum:

```text
READY / START SCHEDULED
→ minimum lost
→ start_ready_at cleared
→ scheduled_start_at cleared
→ FORMING
```

When minimum is later restored, readiness is newly achieved and a new six-hour window is created.

The Phase 9 reconciliation trigger deliberately does not pre-empt the existing Phase 6 AUTO admission RPC during its membership insert. Phase 6 remains the canonical AUTO writer; Phase 9 reconciles immediately after the AUTO application transition, avoiding stale-run double scheduling while retaining the one readiness contract.

REVIEW_REQUIRED participation readiness never invokes the AUTO window.

## Final start readiness

Participation readiness is necessary but not sufficient for activation.

`startProjectRun()` still checks final operational requirements such as Lab/project readiness and the applicable lead/responsibility rules. Six hours passing alone does not activate an unready project.

For one-person run geometry (Solo or Flexible independent), Team-only lead/responsibility gates do not become artificial blockers merely because the admission path was REVIEW_REQUIRED.

## Late joining and recruitment

Phase 9 reuses Phase 6 late joining rather than creating another join system.

A late join uses the current active canonical run and remains subject to:

- recruitment open;
- `late_joining_enabled`;
- joining cutoff/window;
- eligibility/admission rules;
- no conflicting membership;
- hard maximum capacity.

Starting below target does not automatically close recruitment. Reaching maximum blocks further capacity. Authorized Admin/system policy may close recruitment earlier and may reopen it when policy/window/capacity permit; reopening does not create a second run.

## Phase 8 compatibility

Partner and Open REVIEW_REQUIRED participation remains:

```text
Review
→ Offer
→ member Accept
→ Phase 10 canonical formation/membership
→ Phase 9 participation threshold evaluation
→ later Phase 11 final readiness/start
```

Offers reserve capacity before membership. Acceptance does not create a fake AUTO decision and does not directly activate the project.

Member-facing capacity now mirrors this invariant: waiting/active memberships count as occupied canonical places and pending/accepted unconsumed Offers count as reservations. Consumed accepted Offers are excluded from reservation totals.

## Member/Admin UX

Admin configuration explains:

- Team minimum;
- Flexible Team minimum;
- target as desirable rather than mandatory;
- maximum as the hard limit;
- Solo as 1/1/1.

Member detail treats Solo as valid independent participation and does not present the primary decision summary as an incomplete team. Team/Flexible collaborative views expose minimum, target, maximum, current state and reserved capacity with text labels rather than colour-only meaning.

Actual responsive/accessibility evidence is still required before sign-off: 320px, phone landscape, tablet, desktop, 200% reflow, keyboard and screen-reader semantics.

## RLS and authorization

Phase 9 does not grant ordinary members the ability to modify project thresholds, recruitment policy, runs, memberships or privileged capacity functions.

Required release evidence includes:

- canonical project configuration remains Admin/authorized-writer controlled;
- member cannot direct-write themselves beyond capacity;
- member cannot bypass joining cutoff/recruitment state;
- Offer and membership RLS remains intact;
- service role stays server-side;
- cross-user private membership/Offer data remains protected.

## Analytics/audit

Phase 9 records lifecycle events without private application/profile content, including:

- participation minimum reached;
- participation readiness invalidated;
- project start scheduled;
- existing Phase 6/8 admission, Offer and late-join events.

Metrics may derive time-to-minimum, starts below target, target/full attainment, late joins and later Solo-to-Team conversion from canonical lifecycle records.

## Mandatory release proof

Before Director sign-off, the exact final head must prove the supplied Phase 9 acceptance contract, including:

- Team below/at minimum;
- target not blocking;
- Solo one-person readiness;
- Flexible Solo/Either one-person readiness;
- Flexible Team configured minimum;
- exact six-hour AUTO scheduling;
- timer retention on ordinary join;
- invalidation below minimum and new window after restoration;
- Partner and Open REVIEW_REQUIRED Offer/Accept compatibility;
- maximum and Offer-reservation accounting;
- final-place concurrency;
- no duplicate membership;
- capacity release;
- same-run late joining and joining cutoff;
- recruitment close/reopen rules;
- configuration validation and active-history preservation;
- RLS/Auth/security;
- application/Offer/AUTO/run/Lab regressions;
- 320px/tablet/desktop/200%/keyboard/screen-reader evidence;
- lint, typecheck, build, isolated migration reconstruction, E2E, Event Room contract and protected Release Gate.

## Hosted Supabase deployment status

The connected hosted Supabase project was previously verified to be behind the stacked Phase 6/7/8 schema and to lack Phase 8 `project_offers`. Phase 9 must therefore **not** be manually applied ahead of its dependencies.

Required deployment order remains:

```text
Phase 6
→ Phase 7
→ Phase 8
→ Phase 9
```

After upstream phases are accepted/merged and their versioned migrations are applied through the normal path, Phase 9 must be retargeted/rebased, its migrations applied, and hosted schema/constraints/indexes/triggers/functions/RLS/CRUD/concurrency revalidated on the new exact head before approval.