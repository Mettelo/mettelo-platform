# Project Experience Phase 20 — Contribution Attribution, Evidence & Mettelo Proof

**Status: DRAFT / PRE-IMPLEMENTATION READINESS — NOT APPROVED**

This document is the live repository evidence register and boundary contract for Phase 20.

Phase 20 is intentionally stacked on Phase 19 and consumes the canonical completion outputs produced there. It must not merge ahead of the dependency chain and must not redefine unresolved Phase 19 completion semantics.

## Mandatory Phase 19 -> Phase 20 handoff

### Phase 19 owns

- completion readiness;
- final project submission;
- deliverable validation;
- success-criteria assessment;
- milestone completion;
- final resources;
- project summary;
- outcomes;
- limitations;
- presentation where required;
- project-level contribution mapping;
- final-review decision;
- run completion;
- completion history;
- recruitment freeze;
- closure of Phase 18 collaboration opportunities;
- closure/invalidation of outstanding invitations/interests;
- completed-project historical state.

### Phase 20 owns

- individual contribution claims;
- individual evidence;
- capability attribution;
- individual review;
- Changes Required;
- Declined;
- Verified;
- Mettelo Proof.

These boundaries must not be collapsed.

## Entry condition

The normal Phase 20 verification journey begins from a canonically completed project run.

```text
PHASE 19
ACTIVE
  -> FINAL SUBMISSION
  -> FINAL REVIEW
  -> COMPLETED

              |
              v

PHASE 20
CONTRIBUTION
  -> EVIDENCE
  -> REVIEW
  -> VERIFIED / CHANGES REQUIRED / DECLINED
```

Draft contribution preparation may begin earlier where the existing architecture supports it.

However:

- no project completion means no assumption of verified delivery;
- draft contribution is not Proof;
- submitted contribution is not Verified Proof;
- Phase 19 final approval does not automatically approve Phase 20 claims.

## Phase 19 contribution mapping is input, not verification

A Phase 19 mapping such as:

```text
Member A -> Dashboard
Member B -> Modelling
Member C -> Documentation
```

is project-level contribution context only.

Phase 20 must independently determine:

1. What did the individual actually do?
2. What evidence supports that claim?
3. What capability does the evidence demonstrate?
4. Does the evidence meet the verification standard?

Therefore:

```text
PHASE 19 CONTRIBUTION MAP != VERIFIED PROOF
```

## Canonical completion context must remain immutable

Phase 20 must reference the canonical Phase 19 completion record and historical IDs.

Do not:

- duplicate final submission;
- copy deliverables into a Proof-only project model;
- create another completion record;
- recreate milestone history;
- recreate team membership history.

Phase 20 records should reference canonical project, run, completion, membership and delivery-history identifiers wherever the repository architecture supports them.

## Participation boundary

Phase 20 must use canonical membership history frozen by the completion lifecycle.

### Original member

An original member may claim work supported during their valid participation window.

### Late Phase 18 collaborator

A member who joined in Week 4 must not receive attribution for Week 1-3 merely because the final deliverable includes that work.

### Replacement member

A replacement member does not inherit the contribution of the member they replaced.

### Departed member

A member who left in Week 4 retains historically supported contribution before departure, but does not receive later credit without evidence.

All review decisions must be grounded in canonical membership and project history, not self-report alone.

## Phase 18 recruitment remains closed

For a canonically completed Phase 19 run, Phase 20 must not reopen:

- Find Collaborators;
- Collaborator Needed;
- Find a Team listing;
- invitation creation;
- external invitation;
- social recruitment sharing;
- I'm Interested;
- ordinary late joining.

Proof review is not a reason to reopen recruitment.

If further project delivery is genuinely required:

```text
Phase 20 identifies a project-level evidence problem
  -> authorized governance determines that the project must reopen
  -> Phase 19 governed return-to-delivery process
  -> Phase 18 may be explicitly reopened where permitted
  -> additional delivery
  -> Phase 19 completion is revalidated
  -> Phase 20 resumes against the updated canonical history
```

Phase 20 must never silently reopen delivery or recruitment itself.

## Completed Lab boundary

Phase 20 may reference completed historical Lab data such as:

- Tasks;
- milestones;
- deliverables;
- decisions;
- blockers;
- project files;
- contribution history.

The completed Lab must not become writable merely because Proof is being prepared.

Proof-specific contribution/evidence records may remain editable according to their own lifecycle.

```text
PROJECT DELIVERY HISTORY != PROOF SUBMISSION
```

## Project reopening after Proof activity

If a completed project is later reopened through explicitly authorized Phase 19 governance:

- existing Phase 20 records must not silently change;
- already Verified Proof remains historically traceable;
- Verified Proof is not silently rewritten;
- Verified Proof is not silently revoked;
- Verified Proof keeps the evidence/version used at verification;
- new project work creates new contribution/evidence context.

Any exceptional correction or revocation of previously Verified Proof requires a separate governed Proof correction/revocation policy. Silent cascade invalidation is prohibited.

## One canonical timeline

Phase 20 must be able to reconstruct, from canonical system history wherever available:

```text
PROJECT START
  -> Member A joins
  -> Member B joins through Phase 18
  -> Tasks / milestones / decisions / deliverables
  -> Member C leaves
  -> Member D replaces Member C
  -> Phase 18 recruitment freezes
  -> Phase 19 final submission
  -> final review
  -> project completed
  -> Phase 20 individual Proof review
```

Member self-report alone is never the canonical timeline.

## Pre-implementation architecture audit

Do not mark these PASS until exact repository evidence has been inspected.

| Area | Initial state | Required action |
| --- | --- | --- |
| Existing contribution model | AUDIT REQUIRED | Locate canonical contribution tables, APIs, UI, statuses and ownership rules. |
| Existing evidence model | AUDIT REQUIRED | Locate reusable evidence/file/link architecture and privacy rules. |
| Existing Proof model | AUDIT REQUIRED | Locate canonical Mettelo Proof records, publication model and verification lifecycle. |
| Phase 19 completion reference | AUDIT REQUIRED | Confirm the exact canonical completion ID/state Phase 20 must reference. |
| Membership history | AUDIT REQUIRED | Confirm joined/left/replacement history and exact-run scoping. |
| Participation-window validation | AUDIT REQUIRED | Prove claims/evidence can be constrained to valid participation windows without relying on self-report. |
| Capability attribution | AUDIT REQUIRED | Locate skill/capability taxonomy and relationship to project roles/tasks/deliverables. |
| Individual review | AUDIT REQUIRED | Reuse or extend reviewer authorization and state transitions. |
| Changes Required | AUDIT REQUIRED | Define editable fields, resubmission/versioning and immutable prior review history. |
| Declined | AUDIT REQUIRED | Preserve historical decision without creating Verified Proof. |
| Verified | AUDIT REQUIRED | Make verification explicit, server-authoritative and idempotent. |
| Proof version snapshot | AUDIT REQUIRED | Preserve the evidence/version reviewed so later project changes do not silently mutate prior verification. |
| Completed Lab access | AUDIT REQUIRED | Verify Phase 20 can read canonical history without reopening project delivery writes. |
| Phase 18 recruitment freeze | AUDIT REQUIRED | Prove Phase 20 actions cannot reopen collaboration/recruitment paths. |
| Reopened project handling | AUDIT REQUIRED | Reference updated canonical history without silent cascade mutation of prior Proof. |
| Timeline reconstruction | AUDIT REQUIRED | Use canonical membership/task/milestone/deliverable/decision/completion events. |
| Notifications | AUDIT REQUIRED | Reuse canonical notification/email infrastructure for review state changes. |
| Analytics | AUDIT REQUIRED | Add privacy-safe lifecycle events without leaking evidence content. |
| RLS/IDOR | AUDIT REQUIRED | Enforce member ownership, reviewer scope, project/run boundaries and service-role isolation. |
| Supabase/PostgreSQL | AUDIT REQUIRED | All schema/function/RLS/index changes must be versioned and reconstructable. |
| Regression/E2E | AUDIT REQUIRED | Cover draft, submit, changes required, resubmit, decline, verify, frozen recruitment, completed Lab and Phase 19 handoff. |

## Non-negotiable implementation rules

1. Phase 20 must consume canonical Phase 19 completion state; it must not create another project completion model.
2. Project-level contribution mapping is context, not verification.
3. Individual verification is explicit and separate from project completion.
4. Verification must never occur implicitly because a run is completed.
5. No contribution/evidence record may grant recruitment or membership capability.
6. Claims must be evaluated against canonical participation history.
7. Replacement members do not inherit prior members' contribution history.
8. Departed members retain only historically supportable contribution.
9. Completed Lab history remains historical/read-only according to Phase 19 policy.
10. Proof-specific drafts may remain editable only inside the Phase 20 lifecycle.
11. A Phase 20 review cannot reopen Phase 18 recruitment.
12. Additional project delivery must route through governed Phase 19 return-to-delivery.
13. Verified Proof must preserve the evidence/version used at verification.
14. Reopening a project must not silently mutate or revoke existing Verified Proof.
15. Any Proof correction/revocation requires explicit governed policy.
16. Cross-project and cross-run IDOR must fail at the database boundary.
17. Service-role credentials remain server-only.
18. Review state transitions must be server-authoritative and concurrency-safe.
19. Direct client mutation must not bypass lifecycle history.
20. No Phase 20 approval without exact-head migration, regression, E2E, responsive/accessibility and security evidence.

## Approval state

**PHASE 20: NOT APPROVED**

No implementation is considered approved merely because this readiness contract exists. Repository architecture must be audited first, then the smallest compatible Phase 20 extension must be implemented and validated against the exact reviewed head.
