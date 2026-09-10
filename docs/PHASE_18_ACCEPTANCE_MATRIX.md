# Phase 18 — Full Acceptance Matrix

Status: ACTIVE / NOT APPROVED

Governing contract: 273 user stories, 137 mandatory journeys, 112 Director sign-off areas.

This matrix prevents silent scope loss. Every user story is assigned to exactly one Phase 18 implementation sub-phase. Completion requires implementation + canonical integration + required test/security evidence.

## Single-PR execution model

All three Phase 18 implementation sub-phases — 18A, 18B and 18C — are delivered on the same Phase 18 branch and the same PR (#227). They are sequential implementation/review checkpoints inside one pull request, not separate stacked PRs.

Moving to a later sub-phase does not silently mark an earlier sub-phase PASS. Any unresolved evidence from 18A remains part of the same PR and must be closed before final Phase 18 approval.

## Phase 18A — Collaboration Foundation, Member Discovery & Direct Invitations

Owned stories:

- US001–US074
- US130–US139
- US154–US229

Owned mandatory journeys:

- TEST001–TEST039
- TEST089–TEST107

Current status: IMPLEMENTATION / EVIDENCE REMAINS PART OF THIS PR; NOT YET SIGNED OFF.

## Phase 18B — Collaboration Marketplace, Interest, External Discovery & Sharing

Owned stories:

- US075–US129
- US140–US153
- US230–US233

Owned mandatory journeys:

- TEST040–TEST088

Current status: IN PROGRESS — CURRENT IMPLEMENTATION FOCUS ON PR #227.

## Phase 18C — Integration, Governance, Responsive/A11Y, Analytics & Release

Owned stories:

- US234–US273

Owned mandatory journeys:

- TEST108–TEST137

Current status: NOT STARTED — WILL CONTINUE ON THIS SAME PR AFTER 18B.

## Coverage proof

User stories:

- 1–74: 74
- 75–129: 55
- 130–139: 10
- 140–153: 14
- 154–229: 76
- 230–233: 4
- 234–273: 40

Total: **273 / 273 assigned**.

Mandatory journeys:

- 1–39: 39
- 40–88: 49
- 89–107: 19
- 108–137: 30

Total: **137 / 137 assigned**.

Director sign-off areas:

- Final review: **112 / 112 required**.

## Global non-negotiable acceptance rules

All sub-phases must preserve these rules:

1. Collaborator discovery must work without already knowing a username.
2. Recommendations are privacy-safe and explainable.
3. Collaborator Needed is a governed project/run opportunity, not a free-form social post.
4. Opportunity data derives from canonical project/run state.
5. Collaboration opportunities are discoverable through canonical Discover architecture.
6. Public/social sharing never exposes private Lab/run/member/support data.
7. `I’m Interested` is not membership.
8. Invitation is not membership.
9. Invite/interest finalization revalidates project/run, admission, eligibility, readiness, capacity, joining window, recruitment and existing membership.
10. Partner projects retain mandatory review and Offer.
11. AUTO late joining occurs only where canonical policy allows it.
12. New collaborator joins the SAME run and SAME Lab.
13. Joining never restarts the project or resets history.
14. No duplicate project/run/Lab/Chat/tasks/milestones/application/interest/notification/replacement architecture.
15. Hidden profiles remain hidden, including exact-username search.
16. Search/invites/public tokens are protected against scraping, spam, replay and IDOR.
17. Phase 15 solo-to-team, Phase 16 replacement and Phase 17 privacy/block/report behaviour remain intact.
18. Supabase migrations, constraints, indexes, RLS and concurrency protections are mandatory sign-off areas.
19. No story is complete based on frontend-only behaviour.
20. Final Phase 18 approval requires all 273 stories, all 137 mandatory journeys and all 112 Director review areas to be complete.

## Explicit optional item

The generated branded social share image/card is optional/non-blocking only because the governing contract explicitly allows it to be deferred. Mandatory text/link sharing (LinkedIn, X, WhatsApp and Copy Link where supported) remains in scope.

## Status convention

- NOT STARTED — implementation has not begun.
- IN PROGRESS — implementation exists or is the active execution focus but evidence/gates are incomplete.
- PASS — implementation, integration and required evidence are complete at the exact reviewed head.
- BLOCKED — cannot proceed safely until dependency/policy is resolved.

No row/range may be marked PASS by assumption or by inheriting another phase’s green status without direct evidence.
