# Project Experience Phase 8 — Project Place Offer & Member Acceptance

**Status:** implementation in progress on stacked draft PR #217.  
**Dependency:** Phase 7 / PR #216. Phase 8 must not merge ahead of Phase 7 and must be revalidated if the Phase 7 head changes.

## Product boundary

Phase 8 creates the explicit commitment boundary between Mettelo selecting a member and that member agreeing to participate.

Canonical review/offer journey:

```text
submitted
→ in_review
→ shortlisted
→ offered
→ accepted / declined / expired
```

Phase 8 deliberately preserves the Phase 7 boundary:

```text
OFFERED ≠ MEMBERSHIP
ACCEPTED OFFER ≠ ACTIVE PROJECT
```

An accepted Offer records a member commitment and continues to reserve capacity. Canonical project membership, team/run formation, Lab/private-resource access and project activation remain owned by later team-formation/start phases.

## Architecture

Phase 8 extends the existing project-participation architecture instead of replacing it:

- `project_applications` remains the canonical request/review record;
- `project_application_events` remains the canonical application-state audit trail;
- `project_activity_log` remains operational lifecycle evidence;
- `project_offers` is the new canonical commitment/reservation record;
- `project_members` remains canonical participation membership and is not written by Phase 8;
- `project_runs` remains canonical run/cohort state;
- the existing notification/outbox infrastructure remains canonical for member communication;
- the existing `/api/cron/project-formation` scheduled-processing route now also processes bounded Offer reminders and expiry.

No `project_applications_v2`, membership-v2, run-v2, notification-v2 or separate scheduler is introduced.

## Database

Versioned migrations:

- `20260905232000_project_experience_phase_8_project_offers.sql`
- `20260905232100_project_experience_phase_8_offer_response_hardening.sql`

### `project_offers`

Durable fields include:

- Offer ID;
- application;
- project;
- member;
- optional project run/cohort;
- status;
- offered at;
- expires at;
- accepted at;
- declined at;
- expired at;
- offered by;
- capacity reserved at;
- capacity released at;
- bounded reminder marker;
- created/updated timestamps.

Supported statuses:

- `pending`
- `accepted`
- `declined`
- `expired`

The application lifecycle also gains first-class `expired` so My Mettelo and Admin history can represent an Offer that closed without a member response.

## Offer creation and capacity reservation

When Phase 7 makes the legal transition into `offered`, a database trigger creates the corresponding durable `project_offers` row in the same database transaction.

The current programme default response window is **72 hours**. This is a Phase 8 operating default, not a per-project configuration surface. A future configurable Offer policy must extend the canonical project model rather than scatter route constants.

Capacity safety uses the same per-project PostgreSQL advisory-lock namespace as the Phase 7 Offer decision. The authoritative calculation includes:

```text
confirmed/waiting canonical memberships
+
pending Offer reservations
+
accepted Offer reservations not yet consumed by team formation
```

This closes the temporary Phase 7 proxy where only `project_applications.status='offered'` represented outstanding reservation.

Decline and expiry release the reservation. Acceptance does not release it because later team formation still needs that place.

## Member response API

Canonical response endpoint:

`PATCH /api/project-offers`

Payload:

```json
{
  "id": "<offer uuid>",
  "action": "accept | decline"
}
```

The HTTP route does not directly mutate lifecycle fields. It invokes `phase8_respond_to_project_offer` under the authenticated member session.

The database function validates:

- authenticated actor;
- Offer ownership;
- legal action;
- current pending state;
- expiry;
- corresponding application remains offered;
- project remains joinable;
- repeat same-state response is idempotent.

It uses the project advisory lock before changing the Offer/application state.

An Offer that is already past `expires_at` is durably expired and its capacity released. The function returns the persisted `expired` result rather than raising after writing, because a PostgreSQL exception would roll the transaction back.

## RLS and authorization

`project_offers` has RLS enabled.

Authenticated members can select only rows where:

```sql
user_id = auth.uid()
```

Platform Admin can select operational Offer state using trusted `app_metadata.role='admin'` authorization.

Direct authenticated/anonymous insert, update and delete are revoked. Consequential state changes occur only through the governed functions/server paths.

The service-role key remains server-only.

## Member experience

`/member/applications` now includes a dedicated Project Offers panel rather than overloading the existing Phase 6/7 tracker implementation.

For each Offer it displays:

- project;
- commitment;
- participation mode;
- team state/minimum/target/maximum where available;
- expected kickoff/start context;
- Offer expiry;
- participation expectation;
- current Offer state.

Pending Offers provide explicit actions:

- **Accept place**
- **Decline**

Both use a confirmation dialog. Opening an Offer does not accept it.

Acceptance copy explicitly states that membership/private workspace access has not started yet.

The panel includes loading, load failure/retry, pending, accepted, declined, expired, saving and confirmation states, with live status/error feedback.

Responsive contract:

- mobile <=480px: one-column facts/actions, full-width 44px+ controls;
- tablet: two-column facts;
- desktop: three-column facts;
- dialog remains viewport-contained;
- no colour-only lifecycle communication;
- keyboard-visible focus and semantic button/dialog behavior;
- 200% reflow remains required release evidence.

## Notifications and email

Phase 7 already sends `project_place_offered` through canonical `notifyUser` infrastructure when Admin records the Offer decision.

Phase 8 adds canonical lifecycle communication for:

- Offer accepted;
- Offer declined;
- Offer expiring soon;
- Offer expired.

Notification/outbox delivery remains best-effort after the lifecycle transaction. Communication failure cannot falsify an accepted/declined/expired database state.

Each scheduled reminder/expiry communication uses a deterministic dedupe key.

## Scheduled processing

Phase 8 reuses `/api/cron/project-formation`; no second cron framework is introduced.

`phase8_claim_offer_reminders` claims at most one reminder for a pending Offer in its final 24 hours. `reminder_sent_at` prevents repeated claims.

`phase8_expire_project_offers`:

- locks due pending rows with `FOR UPDATE SKIP LOCKED`;
- transitions Offer to `expired`;
- records `expired_at`;
- records capacity release;
- updates the application tracker to `expired`;
- writes `project_offer_expired` activity evidence;
- returns affected member/project identifiers so the existing notification/outbox system can send the expiry update.

The worker is idempotent because only `pending` rows are processed.

## Analytics / operational evidence

Consequential lifecycle events are written to `project_activity_log`:

- `project_place_offered` (Phase 7 existing boundary);
- `project_offer_accepted`;
- `project_offer_declined`;
- `project_offer_expired`.

No sensitive free-text application content is added to these Phase 8 event payloads.

## Security cases requiring release evidence

Phase 8 must prove:

- Member A cannot read Member B's Offer;
- Member A cannot accept/decline Member B's Offer;
- anonymous response is denied;
- forged project/application/user/run fields cannot choose the transition target;
- expired Offer cannot become accepted;
- declined Offer cannot become accepted;
- repeat Accept is idempotent;
- repeat Decline is idempotent;
- direct table update is denied to normal members;
- simultaneous final-place Offer decisions cannot over-reserve;
- accepted reservations remain counted until a later phase consumes them;
- decline/expiry release capacity exactly once.

## Existing functionality to preserve

Phase 8 must not regress:

- Supabase Auth/session boundaries;
- canonical `/api/project-applications` submission;
- Phase 6 AUTO admission/run scheduling;
- Phase 7 REVIEW_REQUIRED state machine;
- Partner Projects always requiring review;
- Phase 7 clarification flow;
- project application event history;
- project activity history;
- canonical `project_members` and `project_runs`;
- `startProjectRun()`;
- My Mettelo application tracker;
- Admin Project Operations;
- existing notifications/outbox/email delivery;
- project-formation cron behavior;
- Lab access remaining membership/start governed.

## Rollback

The schema is additive. If Phase 8 UI/API must be rolled back before release:

- stop exposing response controls;
- stop invoking Phase 8 scheduled Offer processing;
- preserve Offer/audit rows rather than deleting history;
- do not manufacture or delete membership as a rollback mechanism;
- prefer a reviewed forward/compensating migration if schema correction is required.

Do not apply a destructive reverse migration to Production from memory.

## Verification contract

Before Phase 8 can be signed off, exact-head evidence must include:

1. canonical Offer record exists;
2. expiry exists;
3. pending capacity reservation is authoritative;
4. over-offering is prevented;
5. acceptance works;
6. decline works;
7. expiry works;
8. capacity releases on decline/expiry;
9. concurrency races are handled;
10. member tracker/Offer panel updates;
11. Admin operational state updates;
12. communication matrix is followed;
13. reminder dedupe works;
14. mobile Offer UI works;
15. accessibility passes;
16. Offer E2E passes;
17. documentation is current.

Required repository gates remain lint, typecheck, build, static audits, blocking regressions, isolated Supabase migration/RLS/backend E2E, responsive/accessibility evidence, Event Room contract, Release Gate and Deployment Gate according to current CI policy.

## Known repository dependency risk

The repository's documented P0 incomplete Supabase baseline still applies: `project_runs`, notifications/outbox and other older hosted objects do not have complete authoritative creation history in `supabase/migrations/`. Phase 8 must therefore pass the repository's isolated migration compatibility harness, but this PR does not falsely claim that the wider historical production schema provenance problem has been solved.
