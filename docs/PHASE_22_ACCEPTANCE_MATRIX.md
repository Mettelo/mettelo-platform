# Phase 22 — Full Release Acceptance Matrix

**Status: DRAFT / NOT APPROVED**

This document is the binding acceptance authority for the final Project Experience phase.

Phase 22 validates the current architecture. It must not replace canonical project, admission, membership, run, Lab, collaboration, completion, Proof, notification, analytics or Admin systems merely to make release checks pass.

## Acceptance authority

The approved review contract contains:

- **235 user stories**;
- **146 mandatory release tests**;
- **96 Director sign-off areas**;
- **21 non-negotiable release rules**;
- the programme-wide Form Quality Contract;
- exact-head, post-merge-main and Rolling Green Baseline requirements.

No story is considered PASS without repository/runtime evidence. Existing adjacent functionality does not imply acceptance.

Allowed states:

- PASS
- FAIL
- PARTIAL
- BLOCKED
- NOT APPLICABLE

For every FAIL or PARTIAL item, identify the exact root cause, repair the canonical owner or direct regression, rerun the affected lifecycle and preserve all prior accepted behaviour.

## Canonical admission journeys that must all remain distinct

### Open AUTO

`Public / Discover → Interest → server validation → Auto qualification → canonical run/membership → threshold → six-hour Admin intervention window → Phase 11 final readiness → Start → Lab → Delivery → optional Phase 18 collaboration → Phase 19 completion → Phase 20 individual Proof → Phase 21 continuation`

Hard rules:

- no fabricated Review;
- no fabricated Offer;
- no fake Accept Place;
- the six-hour intervention architecture is mandatory release evidence.

### Open REVIEW_REQUIRED

`Public / Discover → Interest → Review → Offer → Accept → run/membership/team formation → readiness → Start → Lab → Delivery → governed collaboration → Completion → Proof → Continuation`

### Partner

`Public / Discover → Interest → mandatory Review → Offer → Accept → run/membership → readiness → Start → Lab → Delivery → governed Partner collaboration → Completion → Proof → Continuation`

Partner must never validate through AUTO.

## Product-shape variants requiring release evidence

- Team;
- Solo AUTO;
- Solo REVIEW_REQUIRED;
- Flexible and valid Flexible-solo;
- below-target start (`minimum <= started members < target`);
- Solo-to-Team;
- late join into the same run;
- replacement into the same run;
- updated Phase 18 Find Collaborators / Collaborator Needed / Find a Team;
- direct member invitation;
- external email invitation;
- public collaboration sharing and signup continuation;
- Phase 19 recruitment freeze races;
- Phase 20 Proof attribution boundaries;
- Phase 21 Admin-created future project with no project-specific JSX;
- safe project duplication.

## Analytics acceptance

Release analytics must cover the supplied US1–29 funnel requirements while excluding the private/sensitive properties in US30–40.

Critical lifecycle truth should come from server/domain events where authoritative. Client interaction events must never be treated as proof of membership, start, completion or Proof verification.

Analytics must distinguish at minimum:

- `admission_mode`: AUTO vs REVIEW_REQUIRED;
- `project_type`: OPEN vs PARTNER;
- project/run context where safely required;
- deduplicated critical transition events.

Forbidden analytics content includes passwords, service-role data, support descriptions, private Pulse text, handover free text, Proof evidence content, reviewer comments, external invitation email, private Partner resource content and Chat bodies.

## Security acceptance

Mandatory coverage includes:

- authentication and session handling;
- username enumeration and validation;
- member / Project Lead / Admin / scoped Partner authorization;
- exact-project/run RLS;
- IDOR for project/run/application/Offer/membership/invitation/support/completion/Proof/Admin draft;
- service-role isolation and bundle inspection;
- Phase 18 discovery/invite/external-share abuse controls;
- Offer manipulation;
- capacity/invite/marketplace/replacement/completion-freeze races;
- open redirects;
- XSS/content rendering;
- upload/file authorization;
- rate limiting;
- support privacy;
- removed-member immediate private-access revocation while preserving history.

## Accessibility acceptance

Target: **WCAG 2.2 AA** for all critical release journeys.

Required evidence:

- 320px;
- mobile;
- tablet;
- desktop;
- 200% reflow;
- full keyboard operation;
- visible and logical focus;
- screen-reader critical states;
- form labels and error association;
- async success announcements;
- adequate touch targets;
- contrast;
- reduced motion;
- no colour-only status;
- no horizontal overflow.

## Form Quality Contract

Every changed/introduced form must demonstrate:

1. Initial
2. Loading
3. Client validation
4. Server validation
5. Field error
6. Global error
7. Authentication error
8. Authorization error
9. Conflict/stale state
10. Duplicate state
11. Success
12. Retry where safe
13. Idempotency
14. Unsaved changes
15. Back navigation
16. Safe resume
17. Value retention
18. Mobile
19. Keyboard
20. Screen reader
21. 200% reflow

## Mandatory E2E journey families

The 146-test release matrix must cover, at minimum:

- New member Open REVIEW_REQUIRED;
- New member Open AUTO;
- Partner mandatory REVIEW_REQUIRED;
- incomplete-profile continuation for all admission modes;
- Offer expiry (Review Required only);
- below-target AUTO start and late join;
- Solo / Flexible;
- Solo-to-Team;
- updated Phase 18 marketplace;
- public social-share signup continuation;
- existing-member direct invite;
- member leave / handover / replacement;
- private support;
- Phase 19 completion + recruitment freeze races;
- Phase 20 individual contribution / Changes Required / Declined / Verified Proof;
- Phase 21 Admin Create → Publish → Public/Discover/filter/admission/run/start/Lab;
- safe duplication;
- Auth/RLS/IDOR/service-role/security/accessibility matrices;
- migration/RLS/cron validation;
- all required regression and release gates.

## Release gate contract

All applicable release layers are blocking:

- Lint
- Typecheck
- Build
- Static audits
- Migration validation
- Public regression
- Auth regression
- Member regression
- Application/Interest regression
- Admin regression
- Lab regression
- Project collaboration regression
- Updated Phase 18 regression
- Phase 19 regression
- Phase 20 regression
- Phase 21 regression
- RLS tests
- Security checks
- Accessibility
- Mobile
- Authenticated/Staging E2E where supported
- Deployment Gate
- Release Gate

**Critical skipped tests are not green.**

## Exact-head release evidence

A release approval must record:

- exact PR head SHA tested;
- CI/check run identifiers and conclusions;
- migration reconstruction result;
- security/RLS/accessibility/E2E evidence;
- no material change after the green head;
- merged main SHA;
- post-merge main validation;
- new Rolling Green Baseline only after evidence.

Any material code change after green invalidates affected evidence and requires rerun.

## Initial Phase 22 evidence

Initial Phase 22 head `978daaf005b422ae188d1dacde5590d67b51dd71` was **NOT GREEN**.

Mettelo CI run `34278652290`:

- lint: PASS;
- typecheck: PASS;
- interaction audit: PASS;
- regression coverage audit: PASS;
- project interest-flow audit: PASS;
- Phase 0 audit: PASS;
- Phase 1 audit: PASS;
- Phase 2 audit: PASS;
- Phase 3 audit: PASS;
- Admin audit: FAIL;
- later fast-gate checks: SKIPPED because the blocking Admin audit failed;
- browser/staging matrix: SKIPPED;
- Release Gate: FAIL;
- Deployment Gate: SKIPPED.

Root cause isolated to the Admin capability audit requiring the canonical fail-closed malformed/unknown-capability contract to remain explicit in `lib/admin-capabilities.ts`. The implementation already contained the fail-closed predicate; Phase 22 restores the explicit documented contract without weakening that predicate or deleting the audit.

## Director sign-off register

All 96 Director sign-off areas begin **BLOCKED/PARTIAL** until evidence is collected. The final report must enumerate all 96 areas and provide PASS / FAIL / PARTIAL / BLOCKED / NOT APPLICABLE with exact evidence and remaining defects.

## Final decision

**PHASE 22: NOT APPROVED**

Do not approve while any blocking defect remains in authentication, authorization, RLS, admission, membership, capacity, start, Lab, collaborator discovery, invitations, marketplace/social/external acquisition, completion, Proof, Admin scale, accessibility, migrations or release gates.
