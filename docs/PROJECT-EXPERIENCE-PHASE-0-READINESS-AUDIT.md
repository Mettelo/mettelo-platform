# Mettelo Project Experience — Phase 0 Programme Bootstrap & Architecture Truth

**Programme:** Mettelo Project Experience 22-phase controlled implementation programme  
**Phase:** 0 — Programme Bootstrap & Architecture Truth  
**Audit date:** 5 September 2026  
**Repository:** `Mettelo/mettelo-platform`  
**Baseline assessed:** `af5b6940708e2c4ccbe656aad0e3a8423a8ce830`  
**Change classification:** Documentation / governance only. No runtime, schema, API, RLS or production configuration change is introduced by this Phase 0 record.

## 1. Repository Readiness Brief

### Current repository state

- Repository: `Mettelo/mettelo-platform`.
- Exact current `main` SHA at assessment: `af5b6940708e2c4ccbe656aad0e3a8423a8ce830`.
- That SHA is a **verified Rolling Green Baseline**.
- GitHub Actions run `33952480045` for that exact SHA completed successfully.
- Required release layers on that exact SHA passed: Change scope, Fast regression gate, isolated Supabase `public-regression`, `authenticated-qa`, `persistence`, `informational-journeys`, aggregate `Release gate`, and `Deployment gate`.
- Vercel and Vercel Deployments commit statuses for the same SHA are successful.
- Active repository ruleset: `Protect main - Rolling Green Baseline` (`20989679`). It targets the default branch, requires pull requests, forbids non-fast-forward/deletion, requires strict `Release gate`, and has no bypass actor.
- Only open PR at the time of assessment: **#209**, documentation-only master Project Experience playbook. No runtime overlap exists with Phase 0.

### Repository governance executed

The mandatory startup contract in `AGENTS.md` has been executed. The required engineering reading sequence was completed against current `main`:

- `AGENTS.md`
- `CONTRIBUTING.md`
- `docs/DEVELOPER-START-HERE.md`
- `docs/README.md`
- `docs/ONBOARDING.md`
- `docs/ARCHITECTURE.md`
- `docs/FEATURES.md`
- `docs/DESIGN-SYSTEM.md`
- `docs/CI-CD.md`
- `docs/REGRESSION_TESTING.md`
- `docs/OPEN-ISSUES.md`
- newest relevant `docs/DECISIONS.md` entries
- `.github/workflows/ci.yml`
- `package.json`
- relevant migration/bootstrap sources
- representative current middleware, API and privileged-service boundaries

> **Repository bootstrap complete. I am ready to receive an improvement request. I will define its success criteria and preservation boundaries before changing code.**

## 2. Architecture Truth Map

### Runtime architecture

| Layer | Canonical current owner | Phase-programme preservation rule |
| --- | --- | --- |
| Web/runtime | Next.js 15 App Router + React 19 | Preserve route contracts and server/client boundaries |
| Public/member/Admin UI | `app/`, `components/`, repository CSS/design-system files | Reuse existing design primitives and responsive contracts |
| Authentication | Supabase Auth + `middleware.ts` + server route checks | Auth ID remains authoritative; client visibility is never authorization |
| Member data access | Cookie-aware authenticated Supabase server client + RLS | Prefer member-owned RLS for normal reads/writes |
| Public data access | Public Supabase client + public grants/RLS | Never expose private/project-member data through public reads |
| Privileged operations | `serviceDb()` in `lib/project-flow.ts` and server-only service-role consumers | Service role remains server-only and limited to privileged operations |
| APIs | Next.js route handlers under `app/api/` | Extend canonical routes; do not create parallel submission/lifecycle APIs |
| Database | Postgres via versioned `supabase/migrations/` | Additive/backward-compatible migrations by default |
| RLS | Versioned policies/functions/grants | Server and database authorization must agree |
| Project delivery | project/run/member/workspace APIs and tables | Preserve history, membership boundaries and same-run semantics |
| Notifications/email | canonical notification catalogue/preferences/outbox + `lib/notifications.ts` | Reuse; no provider calls scattered through feature routes |
| Scheduled work | Vercel Cron routes in `app/api/cron/` | Reuse existing cron architecture |
| E2E/release | Playwright + node audit scripts + isolated Supabase GitHub Actions | Critical skipped tests are not green |
| Deployment | GitHub Release/Deployment gates + Vercel | Merge/deploy only from exact-head evidence |

### Current project journey to preserve

```text
Anonymous visitor
  -> Public Project / Discover
  -> Signup or Signin
  -> Email/OAuth callback
  -> Onboarding / profile readiness
  -> Member Project
  -> canonical project interest/application API
  -> Admin review
  -> project membership / run
  -> Mettelo Lab
  -> Conversation / Events / Tasks / Milestones / Resources
  -> contribution / completion
  -> Proof
```

Every phase must trace the relevant subset through:

```text
UI -> client validation -> API -> auth/authorization -> database/RLS
   -> Admin/operations -> notification/outbox -> user confirmation/error
```

## 3. Database Provenance Register

### Current finding

The older handbook text that says the hosted baseline is wholly absent is no longer accurate.

Current repository evidence includes canonical historical baseline migrations, including:

- `20260809020000_missing_hosted_baseline.sql`
- `20260812090000_project_run_hosted_baseline.sql`
- `20260816095000_spotlight_hosted_baseline.sql`

`20260809020000_missing_hosted_baseline.sql` now creates the previously missing careers, content, notification/outbox and `project_runs` objects and creates the private `career-cvs` bucket. It is intentionally idempotent for existing hosted environments.

`scripts/prepare-local-supabase.mjs` requires those canonical baselines and prepares the isolated Supabase migration set used in CI. The exact baseline SHA has proven that the isolated stack starts and runs blocking public, authenticated and persistence journeys successfully.

### Remaining provenance caution

The local E2E preparation still permits one CI-only compatibility migration:

- `supabase/ci/20260818990000_service_role_hosted_grants.sql`

Therefore the repository is substantially more reproducible than the stale P0 wording suggests, but full clean-bootstrap parity is not declared complete until that remaining CI-only grant compatibility is either proven intentionally test-only or promoted into the canonical migration history. Future database phases must check this before touching related grants.

### Database change rule for Phases 1–22

For every touched database object record:

| Field | Required evidence |
| --- | --- |
| Table/view/function/bucket | Exact canonical name |
| Creation source | Versioned migration |
| Later alterations | Ordered migrations |
| RLS/grants | Versioned policies/grants |
| Indexes | Relevant FK/filter/order indexes |
| Hosted-only dependency | Yes/No + evidence |
| CI-only compatibility | Yes/No + justification |
| Safe to extend | Yes/No/Blocked |
| Rollback/forward compatibility | Defined before merge |

No phase may introduce a production-only schema change outside version control.

## 4. Programme Preservation Register

The following capabilities are protected programme dependencies. Each later phase must explicitly mark them `PRESERVE`, `REUSE`, `EXTEND`, `REPAIR`, `MIGRATE`, `ADD`, `RETIRE LEGACY`, `DEFER`, or `NOT APPLICABLE` before implementation.

| Capability | Current canonical owner / evidence | Default preservation boundary |
| --- | --- | --- |
| Supabase Auth | Auth + callback routes + middleware | Preserve sessions, verification, reset and OAuth |
| Signup | `/signin?mode=signup` | Do not create parallel signup architecture |
| Signin | `/signin` | Preserve email flow and safe `next` handling |
| OAuth | Supabase Auth callback flow | Preserve environment-safe callbacks |
| Email verification | Auth callback/state routes + hosted templates | Preserve verification authority |
| Password reset/update | Auth state routes | Preserve security boundaries |
| Identity/profile | `profiles`, identity/preferences architecture | Do not expose auth UUID |
| Onboarding | onboarding routes + readiness engine | Preserve resumability and progress |
| Project IDs/slugs | canonical `projects` model | Never remap existing IDs/slugs casually |
| Project discovery | Public + member Discover | Consume canonical project taxonomy/data |
| Applications/interest | `/api/project-applications` | One canonical submission engine |
| Application history | application events/history | Preserve lifecycle evidence |
| Offers/selection | project application/formation lifecycle | Acceptance must remain explicit |
| Project runs | `project_runs` + run helpers | Preserve same-run/history semantics |
| Project members | `project_members` + RLS | Prevent duplicate membership/over-capacity |
| Project Lead | existing leadership/governance model | Reuse; do not create parallel role authority |
| Mettelo Lab | member project workspace | Preserve membership-scoped access |
| Conversation | existing collaboration APIs | Reuse; do not build chat_v2 |
| Events/meetings | public/project event infrastructure | Reuse lifecycle/reminder architecture |
| Tasks/milestones | project delivery workspace | Preserve task/history/evidence linkage |
| Resources/data | governed resource/data workspace | Preserve privacy/licence controls |
| Notifications | canonical notifications/preferences | Preserve in-app ownership and dedupe |
| Email outbox | canonical outbox/delivery attempts | Keep provider delivery decoupled from transactions |
| Cron | Vercel cron routes | Reuse schedules/processors where applicable |
| Admin | `/admin/*` + capability checks | Preserve trusted app-metadata authorization |
| Support | governed support/admin mechanisms | Keep confidential cases private |
| Contribution | contributions/review history | Preserve individual attribution |
| Proof | Proof/credential architecture | Never auto-award merely for membership/completion |
| Analytics | existing optional analytics hooks | No sensitive free text/PII in events |
| Release controls | GitHub ruleset + CI release/deployment gates | Never bypass exact-head checks |

## 5. Duplication-Control Register

Before creating any new table, API, service, helper, state machine, notification mechanism, UI component, Admin queue, dashboard, workflow or cron, search for an existing canonical owner.

High-risk duplicate-system areas for this programme:

- project application/interest intake
- member identity/username
- project/run lifecycle
- membership/team formation
- Project Lead authority
- Mettelo Lab/workspace
- chat/conversation
- tasks/milestones
- meetings/events
- notifications/email/outbox
- replacement/invitations
- support cases
- contribution/Proof
- Admin project operations

Explicitly prohibited without an approved architecture decision: `*_v2` parallel systems whose purpose is already owned by a canonical subsystem.

## 6. Surface Impact Matrix

Every phase must assess all rows below, even if the result is `NOT APPLICABLE`.

| Surface | Assess for every phase | Typical regression evidence |
| --- | --- | --- |
| Database/migrations | schema, constraints, indexes, defaults, history | migration/bootstrap tests |
| RLS/grants/functions | caller roles and predicates | RLS/security/E2E |
| API | auth, validation, idempotency, errors, concurrency | route/API tests |
| Public | discovery/detail/CTA/privacy | public browser regression |
| Signup/Signin/Auth | callbacks, redirects, sessions | auth/browser regression |
| Onboarding | resume/readiness/return destinations | member/auth regression |
| Profile/Account/Privacy | persistence and policy enforcement | profile/RLS tests |
| Member Home | member state/navigation | authenticated visual/smoke |
| Discover | taxonomy/filter/privacy | Discover domain/visual tests |
| Project Detail | canonical project state and actions | project regression |
| Applications | submit/duplicate/retry/withdraw | application E2E |
| Admin Applications | visibility/review/audit | Admin E2E |
| Team Formation | run/capacity/lead/responsibility | project lifecycle E2E |
| Lab | membership/role/workspace | Mettelo Lab visual/security tests |
| Conversation | membership permissions | chat permission tests |
| Events | meeting/reminder/live-room permissions | event functionality tests |
| Tasks/Milestones | ownership/status/evidence | workspace tests |
| Resources/Data | private/public/licence boundaries | RLS/workspace tests |
| Notifications | catalogue/preferences/dedupe | persisted notification evidence |
| Email | outbox/template/delivery retry | outbox persistence/audit |
| Cron | expiry/reminder/lifecycle jobs | route/processor tests |
| Completion | readiness/history | completion E2E |
| Contribution/Proof | attribution/review/visibility | Proof regression |
| Analytics | approved event and privacy | event contract tests |
| Documentation | architecture/features/decisions/open issues | same-PR doc review |
| Release | exact-head scope/gates/deployment | GitHub Actions evidence |

## 7. Form & Interaction Register

For each form/interaction, later phases must record: `Existing/New`, canonical API, persistence, RLS, notification, email, success, validation, authorization failure, duplicate/conflict, retry/idempotency and tests.

### Auth/identity
- Sign in
- Signup
- Google auth
- GitHub auth
- Email verification
- Forgot/reset/update password
- Username create/claim/change

### Onboarding/profile/account
- About you
- Skills/domains/tools
- Project goals
- Availability
- Review
- Profile update/avatar/links
- Discoverability
- Invitation preference
- Communication preferences

### Project lifecycle
- Submit Interest
- Withdraw interest
- Offer
- Accept/decline offer
- Invite member/external member
- Accept/decline invitation
- Responsibility/Lead assignment

### Lab/delivery
- Conversation/mention
- Resource/data actions
- Meeting
- Task
- Milestone
- Weekly Pulse
- Leave/Handover/Replacement
- Support case
- Final submission

### Proof
- Contribution submission
- Evidence link
- Review
- Verification

## 8. Communication Trigger Matrix

| Level | Default channel | Programme examples |
| --- | --- | --- |
| A | In-app only | routine chat/task/status activity |
| B | In-app + optional email | mentions, task assignment, reminders, invitations, approaching deadlines |
| C | In-app + transactional email | place offered, offer expiry/acceptance, project start, material meeting change, leave/replacement outcome, major support update, completion, Proof decision |
| D | Email required | verification, password reset, account security, external invitation, critical recovery |

Rules:
- In-app is the operational default.
- Do not email every chat message or task update.
- Critical transactional/security communication is not disabled by optional preferences.
- Sensitive support, safeguarding, disciplinary or conflict details stay out of ordinary email.
- Feature routes enqueue/reuse canonical communication infrastructure rather than calling providers directly.

## 9. Cron / Scheduled Processing Matrix

Current scheduled architecture is Vercel Cron backed by authenticated `/api/cron/*` handlers.

| Scheduled concern | Canonical handling to assess |
| --- | --- |
| Opportunity discovery | existing opportunity-discovery cron |
| Opportunity lifecycle/reverification | existing opportunity-lifecycle cron |
| Project formation | existing project-formation cron |
| Saved opportunity reminders | existing reminder cron |
| Email delivery | existing email-delivery cron |
| Project event reminders / offer expiry | existing project-event-reminders cron |
| Monthly Spotlight | existing monthly-spotlight cron |
| Future offer/invitation expiry | extend an existing lifecycle/reminder owner where appropriate |
| Weekly Pulse reminders | reuse cron architecture; do not add ad-hoc timer services |
| Joining-window closure/replacement escalation | reuse project lifecycle cron owner where possible |

Every new scheduled behavior needs dedupe/idempotency and must not rely on client activity.

## 10. Analytics Matrix

Canonical lifecycle events for the programme should be defined before implementation. Candidate programme events include:

`account_created`, `username_created`, `onboarding_started`, `onboarding_completed`, `profile_updated`, `project_viewed`, `interest_started`, `interest_submitted`, `interest_withdrawn`, `place_offered`, `offer_accepted`, `offer_declined`, `offer_expired`, `team_forming`, `team_ready`, `project_started`, `solo_started`, `collaborator_invited`, `collaborator_joined`, `meeting_scheduled`, `task_assigned`, `checkin_submitted`, `support_requested`, `leave_requested`, `member_left`, `replacement_requested`, `replacement_joined`, `project_completed`, `proof_submitted`, `proof_verified`.

Rules:
- Reuse the canonical analytics emitter/taxonomy when present.
- Do not include sensitive free text, private profile content, raw invite emails, support allegations or confidential evidence in analytics payloads.
- Events must describe product behavior, not become authorization or business-state sources of truth.

## 11. Current Test Baseline

Current `package.json` and `.github/workflows/ci.yml` establish a strong layered test model:

- lint
- TypeScript typecheck
- static interaction and regression-coverage audits
- project-interest contract audit
- domain/phase/Admin/Lab audit scripts
- production build with deployment/configuration and content-governance prechecks
- Playwright public/browser regression
- isolated Supabase public-regression shard
- isolated Supabase authenticated Member/Architect/Admin + Mettelo Lab QA shard
- isolated persisted submission shard
- informational full submission suite
- aggregate Release gate
- Deployment gate

Phase-specific work must add/update the directly affected domain tests in the same PR rather than relying only on the broad baseline.

## 12. Risk Register

| Risk | Level | Phase 0 determination / control |
| --- | --- | --- |
| Stale documentation contradicts current migration/CI reality | HIGH | Treat code/migrations/workflows as source of truth; update stale docs during programme work |
| Service-role leakage | CRITICAL | Server-only; never expose in client/test trace/analytics |
| RLS/client authorization drift | CRITICAL | Server + RLS tests for protected state transitions |
| Duplicate project/member/run systems | HIGH | Duplication control mandatory before every new owner |
| Data/history loss during lifecycle expansion | CRITICAL | Additive migrations; preserve IDs/runs/membership/contribution history |
| Over-capacity/concurrent acceptance | HIGH | Transaction/constraint-safe server checks in relevant phases |
| Existing user lockout during identity changes | CRITICAL | Phase 1 must preserve email/OAuth/session flows |
| Admin authority accidentally granted to member/Lead | CRITICAL | Trusted app metadata + route/RLS capability checks |
| Notification/email noise | MEDIUM | Communication matrix + preference enforcement + dedupe |
| Sensitive data in email/analytics/logs | CRITICAL | Minimum-data policies and secure-update messaging |
| Mobile/200% regressions | HIGH | Required responsive + accessibility gates per UI phase |
| Scope creep into later phases | HIGH | Document dependency and stop; do not silently implement later phase |
| Release gate bypass/stale-head merge | CRITICAL | Ruleset requires strict `Release gate`; exact head must remain frozen during validation |

## 13. Phase 0 Success Criteria Evidence

| # | Success criterion | Status | Evidence |
| ---: | --- | --- | --- |
| 1 | AGENTS.md executed | PASS | Mandatory startup contract read and followed |
| 2 | Current main SHA verified | PASS | `af5b6940708e2c4ccbe656aad0e3a8423a8ce830` |
| 3 | Rolling Green Baseline verified | PASS | Exact-SHA CI run `33952480045` + Vercel success |
| 4 | Open PRs inspected | PASS | Only #209 open; documentation-only |
| 5 | Relevant docs read | PASS | Mandatory engineering set + current workflow/migration evidence |
| 6 | Architecture mapped | PASS | Sections 2 and 4–6 |
| 7 | Database provenance assessed | PASS | Section 3, including remaining CI-only grant compatibility risk |
| 8 | Preservation Register created | PASS | Section 4 |
| 9 | Duplication risks documented | PASS | Section 5 + Risk Register |
| 10 | Surface Impact Matrix created | PASS | Section 6 |
| 11 | Form Register created | PASS | Section 7 |
| 12 | Communication Matrix created | PASS | Section 8 |
| 13 | Cron Matrix created | PASS | Section 9 |
| 14 | Analytics Matrix created | PASS | Section 10 |
| 15 | Test baseline understood | PASS | Section 11 + exact-SHA release evidence |
| 16 | Release process understood | PASS | Active ruleset + current CI release/deployment flow verified |
| 17 | Risks documented | PASS | Section 12 |
| 18 | No implementation started prematurely | PASS | Phase 0 produced governance/documentation only; no runtime/schema change |

## 14. Phase 0 Completion Decision

**Phase 0 status: COMPLETE — 18/18 criteria PASS.**

Phase 0 establishes the baseline and preservation controls only. It does **not** authorize silent implementation of Phase 1. Phase 1 must begin with its own readiness review against the then-current verified `main`, explicitly mapping identity/signup/signin/OAuth/profile/Admin/RLS consumers and every Phase 1 success criterion before code changes.

**Phase 1 has not started.**
