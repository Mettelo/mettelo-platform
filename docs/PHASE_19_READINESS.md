# Project Experience Phase 19 — Readiness Review

**Status: DRAFT / IMPLEMENTATION IN PROGRESS — NOT APPROVED**

This document is the live repository evidence register for Phase 19: **Project Completion, Final Submission & Final Review**.

Phase 19 is intentionally stacked on Phase 18 / PR #227. It must not merge ahead of the Project Experience dependency chain, and its Phase 18 base must not be described as approved until that exact base has completed its own release and acceptance evidence.

## Governing acceptance authority

The supplied Phase 19 acceptance contract is authoritative:

- **251 user stories**;
- **132 mandatory end-to-end journeys**;
- **107 Director sign-off areas**;
- **24 non-negotiable rules**.

A green build, a mergeable PR, or a partial implementation is not Phase 19 approval.

## Canonical Phase 19 journey

```text
ACTIVE DELIVERY
  -> COMPLETION READINESS
  -> FINAL SUBMISSION
  -> FINAL REVIEW
  -> COMPLETED
  -> PHASE 20 CONTRIBUTION ATTRIBUTION / PROOF
```

Project completion is project/run-level. It must never automatically verify member-level Proof.

## Critical Phase 18 -> Phase 19 contract

At the canonical final-submission/completion-freeze boundary, ordinary recruitment must close safely before final review can proceed.

The implementation must preserve and govern the existing Phase 18 architecture so that final review cannot coexist with ordinary collaborator recruitment. This includes:

- canonical Collaborator Needed opportunities closed;
- Find a Team listing removed;
- member-home recruitment recommendation removed;
- new direct and external invitations blocked;
- new collaboration-place creation blocked;
- new recruitment social sharing blocked;
- existing public collaboration URLs changed to a safe closed state;
- new `I'm Interested` admission blocked;
- pending invitations/interests/Offers resolved according to explicit policy;
- ordinary late joining blocked;
- replacement recruitment closed unless an authorized return-to-delivery flow explicitly reopens recruitment through Phase 18;
- SAME project, SAME run and SAME Lab preserved.

## Repository readiness

### Current repository state at Phase 19 start

- Repository: `Mettelo/mettelo-platform`.
- Current `main` observed during bootstrap: `d0b21b34162e04eca3b3a589b9dbb86ff37bec84`.
- Phase 19 branch starts from Phase 18 exact head `f594f35af45bd440060883c30efb10bf56d8630d`.
- Phase 18 remains an open stacked dependency and is not treated as a completed release merely because Phase 19 work has started.
- At bootstrap, the Phase 18 Event Room contract was green while Mettelo CI and Release Gate Status Bridge were still running.

### Required architecture preservation

Phase 19 is RED/protected-platform scope because it touches or depends on:

- canonical project/run lifecycle;
- project membership lifecycle;
- completion request/review state;
- project applications and Offers;
- Phase 18 collaboration needs, direct invitations, external invitations, interest and same-run joining;
- Phase 16 replacement;
- Lab access and completed/read-only behavior;
- contributions and the Phase 20 handoff;
- notifications/email outbox;
- analytics;
- Supabase/PostgreSQL migrations, functions, constraints, indexes and RLS;
- concurrency/idempotency and cross-project/cross-run authorization.

No parallel completion, run, Lab, recruitment, notification or Proof architecture may be introduced.

## Success criteria before implementation

### User journey

An authorized active project participant initiates completion only when the run has credible delivery evidence. The backend evaluates readiness, a final submission is created for the exact run, ordinary Phase 18 recruitment is frozen safely, an authorized reviewer either requests changes or atomically approves completion, and the completed Lab/history remains coherent. Individual Proof remains unverified until Phase 20.

### Existing behavior that must remain unchanged

- canonical project definition and run identity;
- existing project membership history;
- existing Lab, Chat, Tasks, Milestones, resources and contributions;
- Phase 8 Offer/capacity rules;
- Phase 9 team/solo/flexible thresholds;
- Phase 10 responsibility and Lead rules;
- Phase 11 start readiness;
- Phase 14 Pulse privacy;
- Phase 15 solo/solo-to-team integrity;
- Phase 16 exit/replacement history;
- Phase 17 support/safeguarding privacy;
- Phase 18 same-run collaboration admission and privacy/security rules before the completion freeze;
- Phase 20 ownership of member-level verification.

### Permission/security constraints

- no client-only completion authority;
- no arbitrary `ACTIVE -> COMPLETED` mutation;
- only authorized active participant/Lead may submit where policy permits;
- only explicitly authorized reviewer may approve/request changes;
- removed/non-member users cannot gain active completion permissions;
- partner reviewer access remains project-scoped;
- cross-project and cross-run IDOR must fail;
- service role remains server-only;
- sensitive support/Pulse data must not leak into completion review;
- private artifacts remain private after completion.

### Responsive/accessibility criteria

The readiness, final-submission, reviewer and completed-project experiences must be usable at:

- mobile `<=480px`, including 320px;
- tablet `481-1024px`;
- desktop `>=1025px`;
- 200% text reflow with no clipped content/actions.

All consequential actions must be keyboard operable, labelled, non-color-only, focus managed and compatible with WCAG 2.2 AA expectations.

### Loading / empty / success / validation / failure

The completed implementation must explicitly cover:

- readiness loading and explainable not-ready states;
- missing required deliverables/milestones/presentation/resources;
- safe draft retention and recoverable form errors;
- double-submit idempotency;
- pending recruitment/Offer blockers;
- reviewer loading/error/authorization states;
- request-changes feedback and resubmission;
- completed historical/read-only state;
- concurrency conflicts returning one valid outcome instead of silent corruption.

### Verification

Phase 19 approval requires exact-head evidence for all 132 mandatory journeys, including:

- completion E2E;
- completion + Phase 18 recruitment-freeze E2E;
- completion -> Phase 20 handoff E2E;
- Phase 3 and Phase 8-18 regressions;
- migration reconstruction;
- RLS/IDOR/service-role isolation;
- concurrency/idempotency;
- lint, typecheck and build;
- responsive/accessibility coverage;
- Release Gate.

### Rollback/recovery

Database changes must be additive/backward-compatible by default. A failed Phase 19 release must leave existing active runs, membership, Lab history, collaboration history and Proof data intact. Any reversal of a completed run must remain a governed forward correction rather than an untracked client status toggle.

## Pre-implementation architecture audit

Do not mark these PASS until exact repository evidence has been inspected.

| Area | Initial state | Required action |
| --- | --- | --- |
| Existing completion request/review | AUDIT REQUIRED | Locate canonical tables, APIs, UI and state transitions; extend rather than replace. |
| Run lifecycle | AUDIT REQUIRED | Confirm exact run states and authoritative transition owner. |
| Completion readiness | AUDIT REQUIRED | Determine current backend readiness logic and missing Phase 19 gates. |
| Deliverables/success criteria/milestones | AUDIT REQUIRED | Trace canonical Phase 3/12 data and final-artifact relationships. |
| Final submission | AUDIT REQUIRED | Reuse current completion request model where possible; add only minimal missing structure. |
| Reviewer/Admin | AUDIT REQUIRED | Trace current reviewer authorization and queue. |
| Phase 18 recruitment freeze | AUDIT REQUIRED | Map collaboration needs/invites/interests/public sharing to one atomic freeze boundary. |
| Pending Offers | AUDIT REQUIRED | Reuse Phase 8 reservation/expiry state; prevent final review with unresolved commitment. |
| Late join/replacement races | AUDIT REQUIRED | Add database-authoritative concurrency protections. |
| Completed Lab/history | AUDIT REQUIRED | Verify existing completed-project write restrictions and historical access. |
| Contribution/Proof handoff | AUDIT REQUIRED | Preserve contributions without verifying Proof. |
| Notifications/email | AUDIT REQUIRED | Reuse canonical notification/outbox and dedupe. |
| Analytics | AUDIT REQUIRED | Add safe completion events only; no artifact/evidence free text. |
| Supabase/RLS | AUDIT REQUIRED | Verify versioned provenance before DDL and prove reconstruction. |

## Approval state

**PHASE 19: NOT APPROVED**

No user story, mandatory journey or Director sign-off item is considered satisfied solely because this readiness document exists. Evidence must be attached to the exact reviewed implementation head.