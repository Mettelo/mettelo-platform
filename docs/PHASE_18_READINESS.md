# Phase 18 — Member Discovery, Collaboration Marketplace, Project Sharing & Invitations

Status: DRAFT / PROGRAMME SPLIT APPROVED — NOT APPROVED

## Acceptance authority

The governing Phase 18 contract is the full **273 user-story / 137 mandatory journey / 112 Director sign-off area** review supplied for Phase 18.

The earlier 19-point playbook criteria remain required, but they are only the summary gate and are not sufficient for Phase 18 approval.

No Phase 18 user story may be silently dropped. A story is complete only when its product behaviour is implemented, wired to the canonical architecture, security/privacy rules are enforced, and the required evidence exists. The only explicitly non-blocking item in the governing contract is the optional generated social share image/card; text/link social sharing remains mandatory.

## Objective

Make it extremely easy for Mettelo members to find the right collaborator for a project, advertise collaboration opportunities inside Mettelo, share those opportunities externally, receive expressions of interest, invite specific people, and add approved collaborators to the SAME canonical project run.

The integrated architecture must converge onto:

PROJECT → RUN → COLLABORATION NEED → INTEREST / INVITATION → ADMISSION → MEMBERSHIP

Invitation or interest must never itself grant project membership.

## Canonical admission rule

INVITE / INTEREST
→ FINAL REVALIDATION
→ CORRECT ADMISSION PATH
→ SAME RUN
→ SAME LAB
→ SAME PROJECT HISTORY
→ CONTINUE DELIVERY

Revalidate project, run, admission mode, eligibility, profile readiness, capacity, joining window, recruitment, invitation/interest validity and existing membership at the authoritative transition.

## Why Phase 18 is split

The full scope crosses member discovery, recommendations, invitation/admission, opportunity marketplace, public sharing/auth continuation, same-run replacement, Supabase/RLS/concurrency, responsive/accessibility, analytics and Admin governance. Shipping all 273 stories in one review unit would make defects, rollback and Director sign-off unnecessarily risky.

Phase 18 is therefore delivered as **three stacked implementation sub-phases**. They remain one product phase and final Phase 18 approval requires all three to pass.

# PHASE 18A — COLLABORATION FOUNDATION, MEMBER DISCOVERY & DIRECT INVITATIONS

Primary PR: #227

### User-story ownership

Phase 18A owns:

- **US 1–74** — collaboration need, Find Collaborators, recommendation/search, discovery cards/privacy, direct member invitation, invitation lifecycle, final revalidation, AUTO / REVIEW_REQUIRED / Partner admission;
- **US 130–139** — governed collaboration-need creation UX and posting authority;
- **US 154–229** — capacity, joining windows, same-run joining, active-run onboarding, responsibility/Lead integrity, notifications, anti-abuse, fairness, Supabase/database, RLS/authorization and concurrency/idempotency.

### Required outcomes

- canonical collaboration-need model tied to project/run;
- Phase 10 responsibility linkage;
- canonical role/capability/experience/commitment/domain reuse;
- Find Collaborators entry point from Phase 15/16 journeys;
- explainable privacy-safe recommendations;
- canonical member-search/filter architecture;
- hidden-profile, invitation-preference and block enforcement;
- no email/Auth UUID/private activity exposure;
- existing-member invitation lifecycle: pending/accepted/declined/expired/revoked/invalidated;
- invitation never grants membership or Lab access;
- final transactional revalidation;
- AUTO same-run late joining without fake Offer or project restart;
- REVIEW_REQUIRED / Partner routes through canonical review + Offer architecture;
- governed collaboration-need form and posting authorization;
- same-run join preserves project state/history;
- member-specific active-run onboarding without resending Project Started to existing members;
- responsibility assignment remains governed and historical;
- Lead authority remains Phase 10 canonical;
- notification/outbox preferences and anti-abuse controls;
- repository-versioned Supabase schema, FKs, constraints, indexes, RLS, token/security boundary and concurrency protection.

### Mandatory journey allocation

18A owns **Tests 1–39 and 89–107** from the governing Phase 18 contract, plus all database/RLS/concurrency evidence required to support those journeys.

18A must not be marked approved merely because its UI works. Direct authenticated Supabase/RLS and race/idempotency evidence are mandatory.

# PHASE 18B — COLLABORATION MARKETPLACE, INTEREST, EXTERNAL DISCOVERY & SHARING

18B will be stacked on the accepted exact head of 18A.

### User-story ownership

Phase 18B owns:

- **US 75–129** — Collaborator Needed marketplace, Discover/Member Home, I’m Interested, social sharing, public opportunity page, signup continuation, external direct invitation, optional share-card boundary;
- **US 140–153** — interest management, invitation-vs-interest convergence and Phase 16 replacement marketplace integration;
- **US 230–233** — SEO-safe public/social metadata and closed-opportunity behaviour.

### Required outcomes

- structured Collaborator Needed opportunity generated from canonical run data;
- no free-form duplicate forum-post system;
- Find a Team / collaboration opportunity destination through canonical Discover;
- canonical project filtering reused;
- Member Home curated opportunities, not an endless feed;
- I’m Interested reuses canonical project-interest/admission architecture;
- no third application system;
- AUTO / REVIEW_REQUIRED / Partner interest paths converge correctly;
- stable safe public collaboration URL;
- LinkedIn, X, WhatsApp and Copy Link sharing with no private data;
- safe public landing page with only permitted project/opportunity information;
- anonymous auth/signup continuation through existing encoded safeNext;
- signup, username, verification and onboarding preserve the exact opportunity/invite context;
- stale/full/closed opportunity revalidation after signup;
- external email invitation uses secure scoped expiring token;
- Phase 16 replacement uses the same marketplace and joins the same run;
- social/SEO metadata never exposes private member/run data;
- generated image share-card is optional/non-blocking, but text/link sharing is mandatory.

### Mandatory journey allocation

18B owns **Tests 40–88** from the governing Phase 18 contract.

# PHASE 18C — PRODUCT INTEGRATION, GOVERNANCE, RESPONSIVE/A11Y, ANALYTICS & RELEASE SIGN-OFF

18C will be stacked on the accepted exact head of 18B.

### User-story ownership

Phase 18C owns:

- **US 234–249** — mobile/tablet/desktop, 200% reflow and accessibility;
- **US 250–254** — privacy-safe collaboration analytics;
- **US 255–259** — Admin/Lead governance;
- **US 260–264** — member experience, explainability, dismiss/opt-out and no social pressure;
- **US 265–273** — preservation of Discover, filter engine, member discovery, Phase 15/16/17, signup, notifications and canonical project-interest architecture.

### Required outcomes

- 320px Find Collaborators/search/cards/opportunity board/form/invite/public page;
- 768px tablet and 1280px desktop evidence;
- 200% text reflow without clipped actions/content;
- keyboard and screen-reader semantics/focus management;
- status never communicated by colour only;
- safe collaboration funnel analytics with no email/private profile free text/popularity scoring;
- Admin operational view and audited close/governance actions;
- scoped Project Lead authority only;
- explicit Partner recruitment policy;
- Member Home recommendations explain why and can be dismissed without penalty;
- all canonical systems preserved rather than rebuilt;
- complete source-mapped 273-story / 137-test / 112-signoff evidence matrix;
- exact-head lint, typecheck, build, migration reconstruction, RLS/security, E2E, regression and protected Release Gate green.

### Mandatory journey allocation

18C owns **Tests 108–137**, including responsive/accessibility, all inherited regression suites, migration/security review, invitation/marketplace/social-share E2E and Release Gate.

# Coverage proof

The three sub-phases cover every Phase 18 story exactly once by ownership range:

- 18A: US 1–74, 130–139, 154–229
- 18B: US 75–129, 140–153, 230–233
- 18C: US 234–273

Together: **US 1–273 with no gaps.**

Mandatory journeys are allocated as:

- 18A: Tests 1–39, 89–107
- 18B: Tests 40–88
- 18C: Tests 108–137

Together: **Tests 1–137 with no gaps.**

Final Director review remains one Phase 18 decision covering all **112 sign-off areas**.

## Preservation register

All three sub-phases must extend, not replace:

- Supabase Auth identity and canonical user/profile relationships;
- username/profile architecture;
- profile discoverability/privacy/invitation preferences;
- block/report and Phase 17 support privacy;
- canonical `project_runs` and `project_members`;
- Phase 8 Offer/capacity reservation;
- Phase 9 participation, capacity and late joining;
- Phase 10 responsibilities and Project Lead authority;
- Phase 15 solo-to-team same-run conversion;
- Phase 16 vacancy/replacement recovery;
- canonical Discover/member-discovery/project filtering;
- canonical project-interest/application review architecture;
- notification preferences, notifications/outbox and transactional email;
- existing safeNext/Auth/onboarding continuation;
- canonical audit/activity infrastructure.

Do not create duplicate membership, run, Lab, Chat, tasks, milestones, recruitment, Offer, application/interest, notification, Discover, signup or replacement systems.

## Mandatory Supabase/PostgreSQL gates

Before Phase 18 final approval prove:

- authoritative versioned migrations exist for every schema change;
- collaboration need/invitation records have valid project/run/actor/invitee relationships;
- constraints match backend/frontend states;
- useful indexes and partial uniqueness/idempotency protections exist;
- hidden profiles cannot be enumerated through RLS, API or exact username search;
- discovery never exposes private email/Auth UUID/private activity/support/Admin data;
- service role remains server-only and does not hide broken client RLS;
- posting/inviting is authorized server-side for the exact project/run;
- external tokens are scoped, expiring, revocable and non-forgeable;
- final acceptance/interest conversion transactionally revalidates capacity, joining, recruitment, readiness, admission and existing membership;
- race conditions cannot overfill capacity or create duplicate membership/invite/opportunity outcomes;
- no hosted-only DDL exists without repository migration.

## Non-negotiable final approval rule

Do **not** approve Phase 18 if any of the following remain true:

- collaborator discovery requires already knowing a username;
- hidden members can be discovered;
- Collaborator Needed is not discoverable;
- opportunity state can become stale after capacity/joining/recruitment closes;
- public/social sharing leaks private project/member/run data;
- invitation or interest directly grants membership;
- Partner joining bypasses mandatory review/Offer;
- capacity or joining cutoff can be bypassed;
- signup loses invitation/opportunity context;
- collaborator joining creates a new run/Lab or restarts the project;
- search/invites can be abused for scraping/spam;
- existing Discover/filter/member/project-interest systems are unnecessarily duplicated;
- any material Supabase/RLS/security inconsistency remains;
- any assigned user story or mandatory journey lacks evidence.

## Dependency rule

Phase 18A is stacked on Phase 17 / PR #226. Phase 18B must stack on the accepted exact head of 18A. Phase 18C must stack on the accepted exact head of 18B.

No Phase 18 sub-phase may merge ahead of its dependency chain. Final Phase 18 approval occurs only after 18A + 18B + 18C are complete and the final exact-head release gates are green.
