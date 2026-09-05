# Project Experience Phase 8 — Project Place Offer & Member Acceptance

**Status:** implementation and exact-head validation in progress on stacked draft PR #217.  
**Dependency:** Phase 7 / PR #216. Phase 8 must not merge ahead of Phase 7 and must be revalidated if the Phase 7 head changes.

## Product boundary

Phase 8 creates the explicit commitment boundary between Mettelo selecting a member and that member agreeing to participate.

Canonical REVIEW_REQUIRED journey:

```text
submitted
→ in_review
→ shortlisted
→ offered
→ accepted / declined / expired
```

Eligibility is mandatory at the database boundary:

```text
Partner Project
→ effective REVIEW_REQUIRED
→ Offer permitted

Mettelo Open + REVIEW_REQUIRED
→ Offer permitted

Mettelo Open + AUTO
→ Offer forbidden
```

Phase 8 deliberately preserves:

```text
OFFERED ≠ MEMBERSHIP
ACCEPTED OFFER ≠ ACTIVE PROJECT
```

An accepted Offer records explicit member commitment. It reserves capacity until canonical team formation creates membership, at which point the same reservation is marked consumed so the member is never counted twice. Lab/private-resource access and project activation remain owned by the later team/start architecture.

## Architecture

Phase 8 extends the existing project-participation architecture instead of replacing it:

- `project_applications` remains the canonical request/review record;
- `project_application_events` remains the canonical application-state audit trail;
- `project_activity_log` remains operational lifecycle/analytics evidence;
- `project_offers` is the canonical commitment/reservation record;
- `project_members` remains canonical participation membership;
- `project_runs` remains canonical run/cohort state;
- the existing notification/outbox infrastructure remains canonical for member communication;
- the existing `/api/cron/project-formation` scheduled-processing route also processes bounded Offer reminders and expiry.

No application-v2, membership-v2, run-v2, notification-v2, fake AUTO Offer or second scheduler is introduced.

## Database

Versioned Phase 8 migrations:

- `20260905232000_project_experience_phase_8_project_offers.sql`
- `20260905232100_project_experience_phase_8_offer_response_hardening.sql`
- `20260905232500_project_experience_phase_8_offer_integrity.sql`
- `20260905232600_project_experience_phase_8_expiry_delivery_contract.sql`
- `20260905232700_project_experience_phase_8_reservation_consumption.sql`

### `project_offers`

Durable fields include canonical equivalents of:

- Offer ID;
- application;
- project;
- member;
- optional run/cohort;
- current Offer status;
- offered at;
- expires at;
- accepted at;
- declined at;
- expired at;
- offered by;
- capacity reserved at;
- capacity released at;
- capacity consumed at;
- bounded reminder marker;
- created/updated timestamps.

Supported Offer statuses:

- `pending`
- `accepted`
- `declined`
- `expired`

The application lifecycle also has first-class `expired` so member Tracker and Admin history represent an Offer that closed without response.

## Offer creation and eligibility

When Phase 7 makes a legal transition into `offered`, the database creates the canonical `project_offers` row in the same transaction.

Phase 8 does not trust UI visibility or Phase 7 alone. The Phase 8 Offer transition independently validates:

```text
effective_project_admission_mode = review_required
```

and rejects an `auto_qualified` application. This means an Open AUTO project cannot receive a fake Offer through a forged/stale server path.

The current programme default response window is **72 hours**. `expires_at` is persisted server-side and is the authority; client time is presentation only.

## Capacity model

Capacity decisions use the same per-project PostgreSQL advisory-lock namespace as the governed Offer decision.

Authoritative capacity before membership consumption is:

```text
waiting/active canonical memberships
+
pending Offer reservations
+
accepted but not-yet-consumed Offer reservations
<= maximum capacity
```

State behavior:

```text
PENDING
→ reserves one place

ACCEPTED
→ continues reserving that same place

DECLINED / EXPIRED
→ releases the reservation

ACCEPTED + later canonical membership created
→ reservation becomes CONSUMED
→ membership counts the place
→ Offer no longer counts as a second reservation
```

`capacity_consumed_at` makes the Phase 8 → Phase 10 handoff explicit and prevents double counting.

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

Acceptance/decline revalidation includes:

- authenticated actor;
- Offer belongs to actor;
- legal action;
- Offer still pending;
- server-authoritative expiry;
- application still `offered`;
- project still valid/joinable;
- effective admission mode remains REVIEW_REQUIRED;
- accepting member is not already waiting/active/completed in the project;
- accepted reservation has not been released/consumed incorrectly;
- capacity remains internally coherent;
- repeat same-state action is idempotent.

The function acquires the project advisory lock before the terminal decision.

If the member responds after `expires_at`, the Offer and application are durably changed to `expired`, capacity is released, and the function returns an expired domain result. It deliberately does not raise after writing because a PostgreSQL exception would roll the transaction back.

## Terminal-state integrity

A Phase 8 linked application cannot be arbitrarily reopened through the generic application status path.

- `declined` and `expired` are terminal for Phase 8.
- `accepted` may advance only into the later team/readiness states (`waiting_for_team` / `team_complete`) through the governed downstream journey.
- a legacy/AUTO application without a Phase 8 Offer remains governed by its existing Phase 6 lifecycle.

This prevents a generic withdrawal/update from leaving an accepted Offer as a phantom capacity reservation.

## RLS and authorization

`project_offers` has RLS enabled.

Authenticated members can select only rows where:

```sql
user_id = auth.uid()
```

Platform Admin can read operational Offer state using trusted `app_metadata.role='admin'` authorization.

Direct anonymous/authenticated insert, update and delete are revoked. Consequential lifecycle changes occur through governed database/server paths.

The service-role key remains server-only for privileged operational/scheduled work.

No Phase 8 endpoint accepts a member ID, project ID, run ID or capacity value from the browser as authority for the Offer decision.

## Member experience

`/member/applications` contains a dedicated Project Place Offers surface plus the canonical application Tracker.

The Offer surface answers:

1. what project is being offered;
2. why the member is seeing the Offer;
3. project type;
4. Partner organisation when applicable;
5. expected commitment;
6. duration;
7. Team/Solo/Flexible participation mode;
8. current confirmed/reserved team state plus minimum/target;
9. expected start context;
10. server expiry (`ACCEPT BY`);
11. participation expectations;
12. what Accept and Decline mean.

Pending Offer actions:

- **Accept place** — primary;
- **Decline** — secondary/destructive.

Both require a lightweight confirmation dialog. Accept copy states that commitment is recorded but project start and private Lab/workspace access remain later governed steps. Decline copy states that unrelated profile readiness, Proof and skills are unaffected.

Resolved Offers are read-only and provide a route back to Discover.

### Tracker alignment

The canonical Tracker now agrees with Offer state:

- `offered` = **Place offered** and contributes to **Needs you**;
- REVIEW_REQUIRED `accepted` = **Place accepted**;
- `declined` = closed history;
- `expired` = **Offer expired** in closed history.

A REVIEW_REQUIRED accepted application does not expose the old generic “Release my place” action. The older AUTO/formation withdrawal behavior remains available only where `admission_decision='auto_qualified'` permits it.

## Responsive and accessibility contract

Offer UI requirements implemented in code include:

- mobile `<=480px`: one-column context/actions and full-width 44px+ controls;
- extra 340px containment refinement;
- tablet: two-column facts;
- desktop: three-column facts;
- viewport-contained native confirmation dialog;
- overflow-safe wrapping;
- state communicated in text, not color alone;
- visible keyboard focus;
- dialog accessible name and description;
- focus returns to the invoking Accept/Decline button when dialog is cancelled/closed;
- successful response moves focus to the live status message;
- reduced-motion handling.

Real 320px, tablet, desktop, 200% reflow, keyboard and screen-reader evidence is still a release/sign-off requirement; source implementation alone is not approval evidence.

## Notifications and email

When Admin records the Offer, canonical `notifyUser` infrastructure receives:

- project-place Offer title/body;
- project name;
- project type;
- Partner organisation where applicable;
- canonical Offer ID;
- authoritative persisted expiry;
- action URL `/member/applications`;
- deterministic Offer dedupe key.

Phase 8 also creates lifecycle communication for:

- Offer accepted;
- Offer declined;
- bounded Offer reminder;
- Offer expired.

Notification/outbox delivery remains best-effort after lifecycle commitment. Communication failure must never falsify accepted/declined/expired database state.

Scheduled reminder/expiry communication uses deterministic dedupe keys.

## Scheduled processing

Phase 8 reuses `/api/cron/project-formation`; no second cron framework is introduced.

`phase8_claim_offer_reminders` claims at most one reminder for a still-pending Offer in its final 24 hours. Conditions include:

- status still pending;
- expiry not passed;
- reminder not already claimed.

`reminder_sent_at` prevents repeated claims, and terminal Offer states no longer match the claim query.

`phase8_expire_project_offers`:

- considers only due `pending` rows;
- locks with `FOR UPDATE SKIP LOCKED`;
- records `expired_at` and release once;
- updates the application Tracker to `expired`;
- writes canonical `offer_expired` audit/analytics evidence;
- returns exactly the affected Offer/member/project identifiers so the existing notification/outbox path can communicate expiry;
- is idempotent because the second run no longer finds the terminal row.

The AUTO-start loop remains a separate lifecycle responsibility and continues to validate effective AUTO policy before starting runs.

## Audit and analytics

Canonical Phase 8 lifecycle events in `project_activity_log` include:

- `offer_created`;
- `offer_accepted`;
- `offer_declined`;
- `offer_expired`;
- `offer_capacity_consumed` when later membership consumes an accepted reservation.

Terminal decision metadata includes `decision_seconds` so `offered_at → accepted/declined/expired` can be measured without logging application statements, reviewer notes, evidence URLs or unnecessary email data.

Phase 7 may additionally retain its operational `project_place_offered` selection event; that is distinct from the Phase 8 canonical Offer lifecycle event.

## Admin operations

Admin Project Operations shows:

- confirmed canonical membership;
- active reserved Offers;
- available places;
- maximum capacity;
- pending / accepted / declined / expired counts;
- Offer member;
- offered timestamp;
- expiry or resolved timestamp;
- reservation state;
- accepted reservations that have been consumed into canonical membership.

Expired reservations release automatically; Admin does not manually free them.

## Security and concurrency release cases

Release evidence must prove at least:

- Partner REVIEW_REQUIRED creates Offer;
- Open REVIEW_REQUIRED creates Offer;
- Open AUTO cannot enter Offer lifecycle;
- member cannot forge an application into `offered`;
- Member A cannot read Member B Offer;
- Member A cannot accept/decline Member B Offer;
- direct member writes to `project_offers` are denied;
- expired Offer cannot become accepted;
- declined Offer cannot later become accepted;
- accepted Offer cannot be stale-declined;
- double Accept is idempotent;
- double Decline is idempotent;
- Accept vs Decline yields one valid terminal state;
- Accept vs Expiry yields one valid terminal state;
- simultaneous final-place Offers cannot over-reserve;
- reminder claim excludes accepted/declined/expired Offers;
- expiry worker is idempotent;
- capacity release is recorded once;
- accepted reservation is consumed exactly once by later canonical membership;
- terminal Phase 8 application state cannot be arbitrarily rewritten;
- leadership interest is not converted into Project Lead authority by acceptance.

## Existing functionality to preserve

Phase 8 must not regress:

- Supabase Auth/session boundaries;
- canonical `/api/project-applications` submission;
- Phase 6 AUTO admission/run scheduling and six-hour Admin intervention path;
- Phase 7 REVIEW_REQUIRED/Partner review state machine;
- clarification flow;
- application/activity history;
- canonical `project_members` / `project_runs`;
- canonical `startProjectRun()` readiness boundary;
- My Mettelo tracker;
- Admin Project Operations;
- notifications/outbox/email delivery;
- project-formation cron;
- Lab access remaining membership/start governed.

## Rollback

The Phase 8 schema is additive. If Phase 8 UI/API must be disabled before release:

- stop exposing response controls;
- stop invoking Phase 8 scheduled Offer processing;
- preserve Offer/audit history;
- do not manufacture/delete membership as rollback;
- preserve capacity state and use a reviewed forward/compensating migration if correction is required.

Do not apply a destructive reverse migration to Production from memory.

## Verification contract

Phase 8 is not approved from implementation alone. Exact final-head evidence must include the user-supplied **68 mandatory E2E journeys / release checks** and **67-point Director sign-off**, including:

- Partner mandatory Offer path;
- Open REVIEW_REQUIRED Offer path;
- AUTO exclusion;
- canonical Offer persistence/FKs/constraints/indexes/RLS;
- capacity and all required races;
- accept/decline/expiry/idempotency;
- Tracker/Admin agreement;
- notification/outbox behavior and reminder dedupe;
- accepted reservation → later team formation compatibility;
- no premature Lab/start access;
- analytics/audit privacy;
- 320px/tablet/desktop/200%/keyboard/screen-reader/focus evidence;
- lint;
- typecheck;
- build;
- Offer/backend E2E;
- Phase 6/7/Partner/application/Admin regressions;
- Event Room contract;
- protected Release Gate/Deployment Gate.

Only the exact final SHA counts. A queued, running, cancelled or superseded workflow is not success.

## Known repository dependency risk

Phase 7 / PR #216 remains the immediate dependency. Phase 8 must not merge ahead of it; once Phase 7 is accepted/merged, Phase 8 must be retargeted/rebased as necessary and all required exact-head evidence rerun.

The repository's documented historical Supabase-baseline P0 also remains: some older hosted objects such as the original `project_runs` / notification baseline pre-date complete authoritative creation migrations. Phase 8 uses only versioned forward migrations and must pass the repository's isolated migration compatibility harness; this phase does not falsely claim to resolve that separate historical provenance issue.
