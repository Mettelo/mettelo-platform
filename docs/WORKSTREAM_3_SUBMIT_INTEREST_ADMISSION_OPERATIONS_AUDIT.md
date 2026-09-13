# Workstream 3 — Submit Interest / Admission / Project Operations Audit

Status: **NOT APPROVED** until the exact-head blocking contract, CI, Release Gate, Deployment Gate and production runtime verification are all green.

Branch: `workstream3-interest-admission-operations-recovery`
Verified starting SHA: `a2cb884dfbec6eae806147889c25eccba5c514d8`

## Architectural decision

There is one canonical interest/admission engine. `POST /api/project-applications` with `application_kind=interest` calls `submit_project_interest`. The application insert is the transaction boundary; `project_interest_resolve_admission_after_insert` invokes `phase6_auto_admit_interest` for eligible open AUTO projects. Partner and non-AUTO projects remain `review_required`. The API does not create a second AUTO state machine or membership directly.

`application_kind=application` is a separate legacy/formal role-application path. It remains intentionally distinct pending product retirement and must not be collapsed into interest admission merely to simplify code.

## Timing authority

The Phase 9 participation runtime is the authority for formation eligibility. `start_ready_at` is the instant the effective minimum is first reached. `scheduled_start_at = start_ready_at + interval '6 hours'` is the earliest eligibility boundary. The project does **not** start at six hours. The daily formation route is scheduled by Vercel at `0 6 * * *`; it processes due runs. Falling below the minimum clears `start_ready_at` and `scheduled_start_at`; reaching minimum again creates a new six-hour window.

The requirement name `eligible_from` therefore maps to the existing canonical `scheduled_start_at` boundary. Workstream 3 does not add a duplicate timestamp/state machine.

## Migration authority chronology

| Authority | Effective repository definition / override | Notes |
| --- | --- | --- |
| Interest uniqueness | `20260906000700_project_experience_phase_5_interest_uniqueness.sql` and later constraints | One active canonical interest per project/person. |
| Application lifecycle | Phase 6 application-status/request-boundary migrations + later recovery migrations | Status and admission fields live on `project_applications`. |
| AUTO admission | `20260913002526_recover_phase6_auto_admission_with_current_interest_semantics.sql` + `20260913140000_workstream3_interest_admission_recovery.sql` | Workstream 3 reasserts the canonical post-insert bridge; no second engine. |
| Submit Interest | `20260913140500_workstream3_submit_interest_role_recovery.sql` | Preserves Workstream 2 readiness/capacity hardening and restores Team/Flexible role validation/persistence. |
| Participation threshold | `20260906002000_project_experience_phase_9_participation_hardening.sql` plus Phase 9 lock-order guards | Effective minimum is database-owned. |
| Six-hour eligibility | `20260906002000_project_experience_phase_9_participation_hardening.sql` + `20260913140000_workstream3_interest_admission_recovery.sql` | AUTO delay fixed at 360 minutes; threshold loss resets timing. |
| Capacity / lock order | Phase 9 `...capacity_change_guard`, `...lock_order_hardening`, `...offer_lock_order_guard`, `...offer_response_lock_order` migrations | Mutable capacity is rechecked under canonical locks. |
| Offer lifecycle | `20260905232000_project_experience_phase_8_project_offers.sql` then Phase 9 Offer lock-order overrides | Offer reservation/accept/decline/expiry is DB-owned. |
| Formation | `20260906010000_project_experience_phase_10_canonical_formation.sql` | Canonical formation operation; daily route is caller. |
| Start readiness | `20260906020000_project_experience_phase_11_start_readiness.sql`, then `20260906020300_project_experience_phase_11_final_authority.sql` | Phase 11 is final start/readiness authority. |
| Run privacy | `20260905178200_project_run_operational_privacy.sql` + `20260913140000_workstream3_interest_admission_recovery.sql` | Diagnostics stay service/admin-only; safe columns remain readable as intended. |
| Analytics | Phase 6 admission analytics migration / recovery | Admission transitions are recorded from canonical decisions, not UI inference. |

### Production migration drift observed during Workstream 3

The connected production project migration ledger currently ends its Project Experience recovery chain at `20260913003510 production_workstream2_schema_reconciliation_member_discover`. It includes recovery definitions through Phase 8 foundation but does not list the historical Phase 9/10/11 migration versions. Production runtime inspection also did not expose several later canonical Phase 9/10/11 RPCs. This is a release blocker until migration replay/deployment installs the effective authorities and the post-deploy runtime check proves they exist. Source presence alone is not a PASS.

## 40-area authority audit

| # | AREA | CURRENT OWNER | CALLER | DATABASE AUTHORITY | CURRENT STATE | GAP | RISK | CHANGE REQUIRED | TEST REQUIRED |
|---:|---|---|---|---|---|---|---|---|---|
| 1 | Public project eligibility | member journey + RPC | project detail/apply | `projects` publication/status fields + `submit_project_interest` | PASS in source | exact production replay pending | closed project submission | none beyond replay | journey + DB |
| 2 | Project recruitment state | DB/project state | detail/API/admin | `projects.applications_open`, status/deadline | PASS in source | production proof pending | stale CTA | none | DB + browser |
| 3 | Submit Interest CTA | member project detail | member | journey resolver | PASS in source | browser proof pending | wrong entry state | none | browser |
| 4 | Interest API | `app/api/project-applications/route.ts` | member flow | RPC call | PASS in source | exact-head run pending | bypass | none | route + E2E |
| 5 | Authentication | API + DB | member | auth session / `auth.uid()` | PASS in source | runtime proof pending | unauth mutation | none | RLS/security |
| 6 | Request validation | API + RPC | member flow | RPC domain checks | PASS in source | runtime proof pending | malformed interest | none | negative tests |
| 7 | Project validation | RPC | API | locked `projects` row | PASS in source | runtime proof pending | closed/private project | none | DB |
| 8 | Duplicate interest handling | DB | RPC | advisory lock + uniqueness | PASS in source | race must run | duplicate records | none | duplicate race |
| 9 | Canonical application creation | `submit_project_interest` | API | `project_applications` | PASS in source | replay pending | dual writes | none | AUTO/review journeys |
| 10 | Application ownership | RLS | member/admin | owner/admin policies | PASS in inspected policy | exact replay pending | IDOR | none | RLS/IDOR |
| 11 | Participation mode | project + RPC | V3 flow/API | project mode remains authoritative | PASS in source | browser proof pending | preference rewrites project | recovered V3 + RPC | all participation journeys |
| 12 | Effective admission mode | DB trigger | application insert | project type + `admission_mode` | PASS in source | production trigger absent before WS3 migration | wrong AUTO/review | WS3 bridge migration | DB journeys |
| 13 | AUTO admission | `phase6_auto_admit_interest` | admission trigger | DB function | PASS in source | production replay pending | stranded AUTO interest | reassert bridge | AUTO Solo/Team + race |
| 14 | REVIEW_REQUIRED | admission trigger/admin | insert/admin review | application decision fields | PASS in source | runtime proof pending | unintended auto admit | none | review journey |
| 15 | Partner admission | review/admin | insert/admin | partner forced review | PASS in source | runtime proof pending | partner auto admit | explicit trigger guard | partner journey |
| 16 | Application status lifecycle | DB/admin | API/admin | status contract | PASS in source | regression run pending | contradictory states | none | phase6/7 regression |
| 17 | Run lookup | admission/formation | DB functions | active/forming run query | PASS in source | concurrency proof pending | fragmented runs | none | threshold race |
| 18 | Run creation | admission DB | AUTO trigger | `project_runs` insert under locks | PASS in source | concurrency proof pending | duplicate run | none | threshold race |
| 19 | Run reuse | admission DB | concurrent interests | canonical run selection | PASS in source | concurrency proof pending | split cohort | none | run reuse race |
| 20 | Membership lookup | admission DB | AUTO/Offer | `project_members` | PASS in source | runtime proof pending | duplicate membership | none | journeys/races |
| 21 | Membership creation | admission DB | AUTO/Offer | DB function/constraints | PASS in source | production replay pending | self-admit/duplicate | none | RLS + races |
| 22 | Membership reuse | admission DB | retry/concurrency | membership uniqueness/state | PASS in source | race proof pending | duplicate member | none | concurrency |
| 23 | Minimum team calculation | Phase 9 DB | reconcile/formation | effective participation threshold | PASS in source | production RPC replay pending | wrong minimum | none | threshold tests |
| 24 | Capacity calculation | Phase 9 DB | admission/Offer | capacity lock/functions | PASS in source | production RPC replay pending | oversubscription | none | final-place race |
| 25 | Formation threshold | Phase 9 DB | membership reconciliation | effective threshold | PASS in source | runtime proof pending | early formation | none | formation tests |
| 26 | Six-hour eligibility | Phase 9 DB | reconciliation | `start_ready_at + 6 hours` | PASS in source | runtime proof pending | exact-six-hour start | fixed 360 guard | timing test |
| 27 | `eligible_from` | existing Phase 9 timing | formation processor | canonical equivalent=`scheduled_start_at` | PASS by mapping | no duplicate column | parallel state | none | timing test |
| 28 | `scheduled_start_at` | Phase 9 DB | daily processor | run timing fields | PASS in source | runtime proof pending | wrong due run | none | timing test |
| 29 | Daily formation processor | cron + Phase10/11 DB | Vercel 06:00 route | formation/readiness RPCs | OPEN | production RPCs missing | cron 500/no formation | deploy/replay canonical migrations | cron/formation E2E |
| 30 | Below-minimum reset | Phase 9 DB + cron defense | membership change/cron | clears readiness/schedule | PASS in source | runtime proof pending | stale scheduled start | none | reset test |
| 31 | Offer reservation | Phase 8/9 DB | admin/Offer creation | `project_offers` reservation fields | PASS in source | production Phase9 authority pending | capacity leak | replay | reservation test |
| 32 | Offer creation | DB/Admin | admin review | Phase8 Offer function | PASS in source | production recovery proof pending | arbitrary offer | none/replay | Offer create |
| 33 | Offer acceptance | Phase8/9 DB | `/api/project-offers` | actor-scoped response RPC | PASS in source | runtime replay/race pending | steal/oversubscribe | none/replay | acceptance + race |
| 34 | Offer decline | Phase8/9 DB | Offer API | response RPC releases capacity | PASS in source | runtime proof pending | reservation leak | none | decline |
| 35 | Offer expiry | Phase8/9 DB | expiry processor | expiry RPC/locks | PASS in source | race proof pending | accept+expire conflict | none | expiry + race |
| 36 | Admin review | admin admission API/UI | admin | admin role + DB decision RPCs | PASS in source | exact suites pending | member decision bypass | none | admin visibility/review |
| 37 | Admin Project Operations | admin project-admission route | admin | run operations/readiness RPCs | PASS in source | production Phase11 RPC pending | broken controls | replay | operations suite |
| 38 | Member tracker | applications page/components | member | own application/run/offer read models | PASS in source | browser/runtime proof pending | misleading state | none | tracker |
| 39 | Notifications | API/start service | Offer/start transitions | notifications service + canonical event trigger/caller | PASS in source | exact journey proof pending | missing/duplicate notice | none | journey assertions |
| 40 | Analytics | admission analytics | canonical admission transitions | admission analytics DB authority | PASS in source | production exact event proof pending | false funnel data | none | analytics suite |

**Audit closure:** source authority is mapped 40/40, but runtime release closure is **39 mapped / 1 OPEN (#29)** until Phase 9–11 production migration replay and exact-head tests complete. No OPEN item may be reported as PASS.

## Security / RLS contract

- Members may read only their own application/membership/Offer records except explicitly public safe project/run projection.
- Members cannot insert arbitrary memberships or mutate admission decisions directly.
- Offer response RPC scopes the Offer to `auth.uid()` and locks canonical capacity before acceptance.
- Run diagnostics are not granted to anon/authenticated; service role retains full operational access.
- ID substitution across application/run/member/Offer IDs is blocking security coverage.

## Concurrency contract

Blocking database proof must cover: duplicate interest; simultaneous AUTO threshold crossing; canonical run reuse; duplicate membership prevention; final capacity place; Offer accept versus expiry. A filename or static assertion is not sufficient—database-backed cases must execute without skip.

## Director controls 01–98

Controls 01–63 are the core sign-off; 64–98 are mandatory extensions. Current status is deliberately conservative pending exact-head execution.

| Controls | Scope | Current result |
|---|---|---|
| 01–10 | eligibility, recruitment, CTA, API, auth, validation, project checks, duplicates, canonical application, ownership | OPEN — mapped; blocking execution pending |
| 11–20 | participation, admission mode, AUTO, review, partner, lifecycle, run lookup/create/reuse, membership lookup | OPEN — mapped; blocking execution pending |
| 21–30 | membership create/reuse, minimum/capacity/formation, six-hour timing, eligibility boundary, daily processor, below-min reset | OPEN — daily processor production authority unresolved |
| 31–40 | Offer reservation/create/accept/decline/expiry, admin review/operations, tracker, notifications, analytics | OPEN — production replay + blocking execution pending |
| 41–50 | RLS, IDOR, no self-admission, membership mutation boundary, Offer ownership, duplicate-interest race, AUTO-threshold race, run reuse race, final-place race, accept/expire race | OPEN — database execution pending |
| 51–63 | AUTO Solo, AUTO Team, Flexible Solo, Flexible Team, Review Required, Partner, admin visibility, Offer lifecycle, six-hour, below-min reset, tracker, migration replay, SQL invariants | OPEN — blocking execution pending |
| 64–72 | mobile, keyboard, screen-reader semantics, 200% reflow, Workstream 1, Workstream 2, Phase 9, Phase 11, affected Admin/Application/Offer regressions | OPEN — exact-head execution pending |
| 73–82 | API legacy-path isolation, role persistence, Solo role prohibition, project-mode immutability, run privacy, notification integrity, analytics integrity, cron ownership, service-role boundary, migration chronology | OPEN — evidence mapped; release contract execution pending |
| 83–90 | lint, typecheck, build, populated replay, complete Mettelo CI, Release Gate, Deployment Gate, exact-head identity | OPEN |
| 91–98 | PR head identity, merge approval SHA, merge SHA verification, production migration state, production deployment health, production functional smoke, no remaining blockers, Workstream 4 not started | OPEN |

A control changes to PASS only when its cited/static/database/browser/gate evidence has actually run on the proposed exact head. `N/A` requires an evidence-backed reason.

## Release invariant

Before approval:

`TESTED_SHA == PR_HEAD_SHA == MERGE_APPROVED_SHA`

Any code or migration change after the blocking run invalidates prior release evidence.
