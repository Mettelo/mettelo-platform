# Project Experience Phase 16 — Member Exit, Handover & Replacement

**Status: IMPLEMENTED / VALIDATION IN PROGRESS / NOT APPROVED**

Phase 16 lets an active project survive a member departure without deleting delivery history, resetting the run, or creating a parallel replacement system.

## Product objective

The canonical journey is:

`Active member → Leaving → handover recorded → Left → capacity recalculated → existing recruitment/Offer flow → accepted replacement → same active run`

A member in **Leaving** remains an active project member and continues to occupy capacity. Capacity is released only when departure is completed and the canonical membership becomes **Left**.

## Canonical architecture

Phase 16 extends existing authorities:

- `project_members` — membership and departure state;
- `project_runs` — the existing delivery run/cohort;
- `project_member_responsibilities` — delivery ownership history;
- `project_submission_permissions` — delegated final-Proof authority;
- `project_activity_log` — operational audit history;
- existing `project_applications` / `project_offers` / Phase 10 formation — replacement selection and same-run entry;
- existing notification infrastructure — Project Lead/Admin communication;
- existing Phase 9 capacity and late-joining policy.

It does **not** create another membership, team, run, recruitment, Offer, invitation, Chat, task, responsibility or Proof system. Phase 18 remains the invitation owner.

## Supabase schema

Versioned migrations:

- `20260907193000_project_experience_phase_16_member_exit.sql`
- `20260907193100_project_experience_phase_16_replacement_capacity_handoff.sql`

The first migration adds to `project_members`:

- `departure_state`: `none | leaving | left`;
- `leaving_at`;
- `handover_note`, constrained to 20–2,000 characters when present.

The established `membership_status='left'` and `left_at` remain canonical terminal membership fields. No duplicate departure table is introduced.

The service-only `phase16_transition_member_departure(...)` uses the existing Phase 9 project-capacity lock. Authenticated members cannot call the function directly.

## Lifecycle and capacity

### Request departure

Requirements:

- exact project and exact run;
- active, started run;
- current user's canonical active membership;
- non-sensitive handover of 20–2,000 characters.

Transition:

- `membership_status` remains `active`;
- `departure_state` becomes `leaving`;
- `leaving_at` and handover are recorded;
- no capacity is released.

### Complete departure

Requirements:

- same exact active membership;
- an existing `leaving` state.

Transition:

- active delivery responsibilities become `released`, retaining their rows/history;
- delegated final-Proof submission permission is revoked, retaining its audit row;
- `membership_status` becomes `left`;
- `departure_state` becomes `left`;
- `left_at` is recorded;
- tasks, milestones, resources, discussions, contributions and Proof history are not deleted.

Only then does Phase 9 stop counting that member as occupied capacity.

## Replacement and same-run continuity

If the project is not strict Solo, late joining is not explicitly disabled, the cutoff has not passed, and capacity exists, the existing active run reopens recruitment.

Replacement still follows the canonical selection path:

`recruitment → application/review → Offer → acceptance → Phase 10 formation`

Phase 16 hardens the existing Phase 10 accepted-Offer formation function for a last-seat replacement. The accepted replacement's own live Offer reservation is discounted exactly once during the active-run late-join precheck so that it does not block itself. Other reservations still count. The existing membership/Offer triggers remain responsible for atomic capacity enforcement and reservation consumption.

No new run is created for an eligible replacement and kickoff/history are not reset.

## Privacy and access

The handover is delivery-focused and explicitly tells members not to include passwords, credentials, health information, or other sensitive personal data.

Activity-log metadata records that a handover exists, not the handover text itself.

After `membership_status='left'`, existing active-run Lab/RLS helpers no longer treat the departed member as an active participant. Phase 16 acceptance coverage must prove private Lab and Chat data are unavailable after departure.

## Notifications

The authenticated departure API reuses the existing notification architecture. A successful request/completion can notify:

- the active Project Lead in the same run, where one exists and is not the departing member;
- Admins.

Notification failure cannot roll back or falsify a committed departure transition.

## Member experience

Mettelo Lab surfaces a dedicated **Leaving this project?** panel only for the current active member of the exact run.

The member:

1. records a handover;
2. sees a clear `Leaving` state while retaining access;
3. explicitly confirms final departure;
4. is returned to My Projects after access ends.

Controls use 44px minimum targets, visible keyboard focus and assertive error / polite success live-region semantics.

## Mandatory success criteria

1. Existing `project_members` architecture is reused.
2. Existing `project_runs` architecture is reused.
3. Active → Leaving → Left works.
4. Leaving does not release capacity early.
5. Non-sensitive handover is stored.
6. Historical work and Proof are preserved.
7. Active responsibilities are released without deleting history.
8. Delegated final-Proof permission is revoked without deleting history.
9. Left member loses private Lab access.
10. Left member loses private Chat/collaboration access.
11. Capacity reopens only where canonical participation/late-joining/cutoff/max policy allows.
12. Strict Solo does not open replacement recruitment through Phase 16.
13. Replacement follows the existing application/review/Offer/acceptance flow.
14. Accepted replacement joins the same active run.
15. Replacement does not restart kickoff, tasks, milestones, resources or Proof history.
16. Replacement Offer reservation is not double-counted against itself.
17. Other live reservations remain capacity-protecting.
18. Project Lead/Admin notifications use existing infrastructure.
19. Direct authenticated RPC/membership mutation cannot bypass the server boundary.
20. Cross-run/IDOR attempts are denied.
21. Mobile controls work at small viewport widths.
22. 200% text reflow has no horizontal document overflow.
23. Keyboard focus is visible and controls meet minimum target size.
24. Blocking source regression passes.
25. Real local-only Supabase/browser Phase 16 E2E passes in smoke and staging.
26. Clean isolated Supabase migrations reconstruct successfully.
27. Lint, typecheck and build pass on the exact candidate head.
28. Event Room contract remains green.
29. Protected Release Gate remains green.
30. Upstream Phase 15/dependency chain is resolved before merge.

## Validation status

Implementation is present, but Phase 16 is **NOT APPROVED** until all mandatory exact-head gates above pass. Supabase Production was inspected read-only to verify the existing `left` status, `left_at`, membership RLS and submission-permission shape; no Phase 16 DDL has been applied directly to hosted Production.
