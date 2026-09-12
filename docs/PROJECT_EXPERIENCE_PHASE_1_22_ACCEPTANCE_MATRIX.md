# Project Experience Phase 1–22 Programme Acceptance Matrix

**Programme status: BLOCKED — NOT APPROVED FOR RELEASE**

This is the consolidated acceptance register for the Mettelo Project Experience programme.

The repository is the source of truth for what currently exists. The master implementation/change-management playbook is the source of truth for the required product outcome.

The required lifecycle is one continuous system:

```text
IDENTIFY
→ ONBOARD
→ DISCOVER
→ SUBMIT INTEREST
→ FORM
→ START
→ COLLABORATE
→ RECOVER
→ COMPLETE
→ PROVE
→ CONTINUE
```

## Non-negotiable implementation rule

A phase or requirement is implemented only when all of the following are true:

```text
EXISTS
+
IS REACHABLE
+
IS AUTHORIZED
+
IS WIRED TO CANONICAL DATA
+
WORKS IN A REAL USER JOURNEY
+
SURVIVES FAILURE / CONCURRENCY
+
PASSES END-TO-END VALIDATION
=
IMPLEMENTED
```

A route, component, migration, RPC, trigger, static assertion, green build, or isolated test is not sufficient by itself.

## Status definitions

- **PASS** — every acceptance dimension above is evidenced at the exact current head.
- **PARTIAL** — substantial implementation exists, but one or more acceptance dimensions are not yet proven.
- **FAIL** — implementation exists but contradicts the playbook/canonical contract or fails required validation.
- **BLOCKED** — a known blocking product/integration/security/release gap prevents approval.
- **N/A** — requirement is explicitly inapplicable and the rationale is recorded.

**Evidence rule:** every `PASS` must name repository evidence and exact E2E/release evidence. No evidence means no PASS.

## Merge rule

This recovery programme MUST NOT merge while any row is `FAIL`, `PARTIAL`, or `BLOCKED`.

The only mergeable programme state is:

- every applicable Phase 1–22 row is `PASS`;
- explicitly inapplicable rows are `N/A` with rationale;
- exact-head required CI/release gates are green;
- no unresolved cross-phase blocker remains.

## Phase matrix

| Phase | Playbook purpose | Status | Repository evidence / current foundation | Blocking gap or proof still required | Workstream |
|---|---|---|---|---|---|
| 1 | Member identity & username | PARTIAL | `docs/PROJECT-EXPERIENCE-PHASE-1-MEMBER-IDENTITY.md`; Phase 1 journey sign-off; auth/username implementation and regression coverage exist | Re-prove username uniqueness, OAuth username completion, member/Admin lookup, enumeration safety and real signup journey at exact head | 1 — Identity / Onboarding integrity |
| 2 | Onboarding, Profile, Account & Preferences | PARTIAL | `docs/PROJECT-EXPERIENCE-PHASE-2-ONBOARDING-PROFILE-ACCOUNT-PREFERENCES.md`; `docs/ONBOARDING.md` | Full journey regression must prove onboarding, profile, privacy, account and preferences remain separated and correctly authorized | 1 — Identity / Onboarding integrity |
| 3 | Canonical Project Model | BLOCKED | `docs/PROJECT-EXPERIENCE-PHASE-3-CANONICAL-PROJECT-GOVERNANCE.md`; project/run/team geometry exists in schema and runtime | Canonical participation geometry drifts across downstream logic. One effective participation contract must govern API/RPC/trigger/Admin/UI | 2 — Canonical Project Definition |
| 4 | Public Project Discovery | PARTIAL | Phase 4 public project discovery docs and routes exist | Re-prove distinction between public project discovery and public collaboration-opportunity sharing/return journey | 2 — Canonical Project Definition |
| 5 | Member Project Experience & Qualification | BLOCKED | Phase 5 fit/readiness docs and member discovery/application surfaces exist | Member-visible request state must be derived from the actual canonical admission/AUTO result; no stale or generic `Under Review` for healthy AUTO | 2 — Canonical Project Definition |
| 6 | Submit Interest | BLOCKED | `docs/PROJECT-EXPERIENCE-PHASE-6-INTEREST-SUBMISSION.md`; canonical `submit_project_interest` architecture exists | Submit → qualification/admission/start-state propagation must be one coherent canonical journey for AUTO Solo, AUTO Team and Review Required | 3 — Interest / Admission / Admin Operations |
| 7 | Admin Review & Selection | BLOCKED | `docs/PROJECT-EXPERIENCE-PHASE-7-ADMIN-INTEREST-REVIEW.md`; Admin review architecture exists | Project requests remain operationally fragmented. Need unified Project Operations and AUTO-specific queues/states | 3 — Interest / Admission / Admin Operations |
| 8 | Offer & Acceptance | PARTIAL | `docs/PROJECT-EXPERIENCE-PHASE-8-PROJECT-OFFERS.md`; Offer lifecycle exists | Revalidate after AUTO repairs; Offers must remain Review Required/partner admission mechanism and not become mandatory for AUTO | 3 — Interest / Admission / Admin Operations |
| 9 | Solo / Team / Flexible participation | BLOCKED | `docs/PROJECT-EXPERIENCE-PHASE-9-PARTICIPATION-MODEL.md`; Phase 9 capacity helpers exist | TEAM and FLEXIBLE+TEAM must enforce configured minimum >= 2; target is never start threshold; maximum remains hard capacity | 4 — Participation / Run Formation / AUTO Start |
| 10 | Team Formation & Responsibility | PARTIAL | `docs/PROJECT-EXPERIENCE-PHASE-10-TEAM-FORMATION.md`; team membership, Lead and responsibilities exist | Team operating state must be fully reachable and visible in the canonical Team destination | 4 — Participation / Run Formation / AUTO Start |
| 11 | Alignment & Start Readiness | PARTIAL | `docs/PROJECT-EXPERIENCE-PHASE-11-START-READINESS.md`; backend start readiness exists | Member/Admin must see exact start blockers and AUTO state progression; AUTO Solo/Team six-hour and daily-processing journeys need exact E2E | 4 — Participation / Run Formation / AUTO Start |
| 12 | Mettelo Lab | BLOCKED | `docs/PROJECT-EXPERIENCE-PHASE-12-CANONICAL-LAB.md`; Lab workspace and Team surface exist | Lab IA must prove Team as a clear operating centre and connect responsibilities, capacity, Lead, recruitment state, joining window and Grow the Team coherently | 5 — Mettelo Lab operating model |
| 13 | Chat, Meetings, Tasks & Collaboration | PARTIAL | `docs/PROJECT-EXPERIENCE-PHASE-13-COLLABORATION.md`; Lab chat/tasks/meetings implementations exist | Revalidate one coherent Lab IA, permissions, removed-member access and cross-run isolation | 5 — Mettelo Lab operating model |
| 14 | Weekly Pulse & Team Health | PARTIAL | `docs/PROJECT-EXPERIENCE-PHASE-14-READINESS.md`; Pulse/team-health foundation exists | Security/privacy regression must prove Pulse is never Proof input, performance score, recommendation penalty or Admin ranking | 5 — Mettelo Lab operating model |
| 15 | Solo Delivery / Solo-to-Team | BLOCKED | `docs/PROJECT-EXPERIENCE-PHASE-15-READINESS.md`; solo/solo-to-team architecture exists; Grow Team recovery is now on `main` | Prove Solo → Grow Team → admitted collaborator → SAME project/run/Lab/history, with no retroactive collaboration Proof | 6 — Team Growth / Exit / Recovery / Support |
| 16 | Exit, Handover & Replacement | PARTIAL | `docs/PROJECT-EXPERIENCE-PHASE-16-MEMBER-EXIT-REPLACEMENT.md`; replacement architecture exists | Prove immediate access revocation, responsibility reassignment and replacement through the SAME Grow Team recruitment architecture/run | 6 — Team Growth / Exit / Recovery / Support |
| 17 | Support / Conflict / Safeguarding | PARTIAL | `docs/PHASE_17_SUPPORT_CONFLICT_SAFEGUARDING_READINESS.md`; support/privacy foundation exists | E2E/RLS proof required that a case about the Project Lead is not exposed to that Lead and support remains separate from Chat/Pulse/Team/Proof | 6 — Team Growth / Exit / Recovery / Support |
| 18 | Member Discovery / Recruitment / Invitations | PARTIAL | `docs/PHASE_18_ACCEPTANCE_MATRIX.md`; `docs/PHASE_18_READINESS.md`; PR #244 recovered persistent Grow Team, direct requests, posting, explicit social channels, same-run contexts and policy-driven authority | Programme-level approval still requires exact-head real journeys: find/search/profile/request/accept/admit same run; post→interest→admit; anonymous share→signup/onboarding→return→same-run admission; capacity/cutoff/freeze closure | 6 — Team Growth / Exit / Recovery / Support |
| 19 | Completion & Final Review | BLOCKED | `docs/PHASE_19_READINESS.md` explicitly says `DRAFT / IMPLEMENTATION IN PROGRESS — NOT APPROVED`; Phase 19 operational acceptance tests exist | Complete and approve ACTIVE→readiness→final submission→final review→completed; visible Team freeze; all stale recruitment routes rejected; changes-required return remains governed | 7 — Completion and recruitment freeze |
| 20 | Contribution, Evidence & Mettelo Proof | BLOCKED | `docs/PHASE_20_READINESS.md` explicitly says `DRAFT / PRE-IMPLEMENTATION READINESS — NOT APPROVED`; Phase 20 operational contract tests exist | Complete individual Contribution→Evidence→Review→Verified/Changes Required/Declined. Completed project must never imply verified member. Membership-history attribution must be proven | 8 — Individual Evidence & Proof |
| 21 | Continuation / Admin Scale | BLOCKED | `docs/PHASE_21_READINESS.md` explicitly says `DRAFT / PRE-IMPLEMENTATION READINESS — NOT APPROVED`; Phase 21 acceptance matrix exists | Prove 10-stage Admin creation, unified project operations, complete recruitment settings, continuation and safe duplication with negative historical-data tests | 9 — Admin scale / future project creation |
| 22 | Analytics / Security / Accessibility / Release | BLOCKED | `docs/PHASE_22_READINESS.md` explicitly says `DRAFT / PRE-IMPLEMENTATION READINESS — NOT APPROVED`; Phase 22 release tests exist | Cannot approve while upstream phases are non-PASS. Replace old universal Offer-centric sample journey with separate AUTO Solo, AUTO Team, Review Required and Partner complete journeys; prove security/accessibility/release at exact final head | 10 — Full-system verification |

## Canonical cross-phase contracts that must be resolved

### A. Effective participation contract — Phases 3 → 6 → 9 → 11

There must be one canonical authority equivalent to:

```text
effectiveParticipationContract(project, run, memberPreference)

returns:
  participationMode
  effectiveRunMode
  minimum
  target
  maximum
  canStartSolo
  lateJoiningAllowed
```

Required semantics:

```text
SOLO
required = 1

TEAM
required = configured minimum
configured minimum >= 2

FLEXIBLE + SOLO
required = 1

FLEXIBLE + TEAM
required = configured team minimum >= 2
```

`target` must never become the start threshold. `maximum` is always hard capacity.

The API, RPC/functions, triggers, Admin UI and member UI must not independently reinterpret these rules.

### B. Submit Interest state propagation — Phases 5 → 6 → 11

AUTO Solo:

```text
Interest submitted
→ Auto qualified
→ Start eligibility window
→ Ready for auto start
→ Started
```

AUTO Team:

```text
Interest submitted
→ Auto qualified
→ Team forming — 1 / minimum
→ Minimum reached
→ six-hour eligibility period
→ Ready for next daily processing
→ Started
```

Review Required:

```text
Interest submitted
→ Under review
→ Offer
→ Accept
```

A healthy Open AUTO request must never be represented as `Under Review`.

### C. Admin Project Operations — Phases 6 → 7 → 11 → 21

Required top-level operating picture:

```text
PROJECT OPERATIONS

Projects
Project Requests
Teams / Runs
AUTO Start Oversight
Completion
Proof
```

Project Requests needs explicit operational sections:

```text
REQUIRES REVIEW
AUTO — TEAM FORMING
AUTO — ELIGIBILITY WINDOW
AUTO — READY TO START
AUTO — NEEDS ATTENTION
STARTED
```

### D. Canonical Lab / Team IA — Phases 9 → 18

```text
METTELO LAB

Overview
Brief
Data / Resources
Tasks
Deliverables
Team
Chat
Meetings
Proof
Support
```

Team must expose:

```text
CURRENT TEAM
RESPONSIBILITIES
CAPACITY
TEAM LEAD
RECRUITMENT STATE
JOINING WINDOW
GROW THE TEAM
```

Grow the Team must provide persistent governed routes:

```text
FIND PEOPLE ON METTELO
POST COLLABORATOR NEEDED
SHARE TO FIND COLLABORATORS
```

### E. Recruitment permissions — Phases 18 → 21

The backend must enforce project-policy authority. Admin configuration must be capable of expressing the intended authority, including whether Project Lead, active members and/or Admin may recruit.

Where the product requires finer control, configuration must govern separately:

- find people;
- send team requests;
- post collaborator need;
- share externally;
- close collaborator need.

### F. External collaboration return — Phases 18 → 22

Canonical public opportunity journey:

```text
Opportunity
→ Sign up
→ Verify
→ Onboarding
→ RETURN TO SAME OPPORTUNITY
→ Interest
→ canonical admission
→ SAME RUN
```

Public opportunity content must be privacy-safe and must not expose private Lab/team data.

### G. Pulse isolation — Phases 14 → 20 → 22

Pulse may contain progress, workload, team health and support needs.

Pulse must never become:

- a member performance score;
- Proof verification input;
- recommendation penalty;
- Admin ranking.

### H. Solo-to-Team / replacement reuse — Phases 15 → 18

Solo growth and replacement both reuse:

```text
TEAM
→ GROW THE TEAM
→ Find person / Post need / Share externally
→ canonical admission
→ SAME RUN
```

No new project, new Lab, parallel marketplace or retroactive Proof.

### I. Support independence — Phase 17

Support/safeguarding remains independent of Team leadership, Chat, Pulse and Proof. A complaint about the Project Lead must not automatically become visible to that Project Lead.

### J. Completion freeze — Phases 18 → 19

At final submission/final review, Team must visibly enter completion freeze and backend authority must close/reject ordinary recruitment including needs, listings, invitations, social recruitment, interest, late joining and replacement recruitment unless an explicit governed return-to-delivery flow reopens it.

### K. Completion is not Proof — Phases 19 → 20

```text
PROJECT COMPLETED
≠
MEMBER VERIFIED
```

Late joiners and replacements cannot inherit contribution/evidence for periods before their active membership.

### L. Admin scale / duplication — Phase 21

Admin project creation must cover all ten source-defined areas:

1. Basics
2. Problem & Business Context
3. Resources / Data
4. Deliverables & Success Criteria
5. Skills & Proof
6. Responsibilities & Team
7. Timeline
8. Recruitment / Interest Settings
9. Lab Preview
10. Review & Publish

A duplicate may copy governed configuration but must never copy historical/runtime data including applications, offers, members, runs, chat, collaboration needs, invitations, interests, completion, contribution or Proof.

### M. Full-system E2E — Phase 22

Required distinct admission/start journeys include:

AUTO Solo:

```text
Submit
→ AUTO qualify
→ 1 / 1
→ six-hour eligibility
→ daily processor
→ Start
```

AUTO Team:

```text
Submit
→ AUTO qualify
→ 1 / minimum
→ second member
→ minimum reached
→ six hours
→ daily processor
→ start below target
→ keep recruiting until target/max/cutoff policy says otherwise
```

Open Review Required:

```text
Interest
→ Review
→ Offer
→ Accept
```

Partner:

```text
Interest
→ Mandatory Review
→ Offer
→ Accept
```

## Ten recovery workstreams

1. Identity / Onboarding integrity — Phases 1–2.
2. Canonical Project Definition — Phases 3–5.
3. Interest / Admission / Admin Operations — Phases 6–8.
4. Participation / Run Formation / AUTO Start — Phases 9–11.
5. Mettelo Lab operating model — Phases 12–14.
6. Team Growth / Exit / Recovery / Support — Phases 15–18.
7. Completion and recruitment freeze — Phase 19.
8. Individual Evidence & Proof — Phase 20.
9. Admin scale / future project creation — Phase 21.
10. Full-system verification — Phase 22.

## Evidence ledger required for PASS

Before any row changes to `PASS`, append evidence covering all applicable categories:

- implementation paths;
- canonical schema/migration/RPC/trigger paths;
- member UI route/surface;
- Admin UI route/surface where applicable;
- authorization/RLS evidence;
- concurrency/idempotency evidence;
- exact E2E test path and result;
- exact-head CI workflow/run result;
- Director/product sign-off evidence where the playbook requires it.

## Current decision

**DO NOT DECLARE THE 22-PHASE PROGRAMME COMPLETE.**

PR #244 recovered an important Phase 18 / Team / Grow-the-Team slice and is now present on `main`, but that merge does not constitute Phase 1–22 programme approval.

The follow-up programme recovery remains blocked until this matrix contains only `PASS` or justified `N/A` rows and the exact final head passes the complete release baseline.
