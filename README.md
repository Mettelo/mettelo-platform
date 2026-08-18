# Mettelo Platform

Mettelo is professional capability infrastructure for Data & AI professionals. It brings community, structured project work, verified proof, opportunities, events, media, organisations, partnerships, and member recognition into one contribution-led platform.

This README is the **first human-readable orientation point** for the repository. It is deliberately detailed enough to tell a new developer or a new AI coding session what Mettelo is, how the repository is operated, what must be read first, which parts of the platform are high-risk, how local development works, and how a change is allowed to become the next trusted baseline.

- Engineering handbook: [docs/README.md](docs/README.md)
- Mandatory AI/developer startup contract: [AGENTS.md](AGENTS.md)
- Mandatory cold-start procedure: [docs/DEVELOPER-START-HERE.md](docs/DEVELOPER-START-HERE.md)
- Engineering rules: [CONTRIBUTING.md](CONTRIBUTING.md)
- AI copy/paste startup prompt: [docs/AI-SENIOR-DEVELOPER-STARTUP-PROMPT.md](docs/AI-SENIOR-DEVELOPER-STARTUP-PROMPT.md)
- Live deployment: [mettelo-platform.vercel.app](https://mettelo-platform.vercel.app)
- Intended canonical application domain: [mettelo.com](https://mettelo.com) — confirm live Production/custom-domain mapping before relying on it for release evidence.

---

## Mandatory first step for every developer or AI chat

**Do not begin feature work, UI changes, backend changes, database changes, migrations, refactors, deployment changes, or infrastructure work immediately after opening the repository.**

Every new human developer, contractor, coding agent, or AI development session must first:

1. read and execute [AGENTS.md](AGENTS.md);
2. read [CONTRIBUTING.md](CONTRIBUTING.md);
3. complete [docs/DEVELOPER-START-HERE.md](docs/DEVELOPER-START-HERE.md);
4. verify the exact current `main` SHA using live GitHub evidence;
5. verify the CI/release state for that exact SHA;
6. verify relevant deployment state when release/deployment evidence matters;
7. inspect open pull requests and overlapping branches;
8. check whether `main` is technically protected and which checks are actually enforced;
9. read the architecture, design, CI/CD, regression, open-issues, and relevant decision documentation;
10. produce the mandatory **Repository Readiness Brief** before accepting an improvement request.

A previous chat, handoff, screenshot, local branch, old CI run, or this README is context only. **It is not proof of current repository state.**

A correctly bootstrapped AI/developer session ends its readiness brief with:

> **Repository bootstrap complete. I am ready to receive an improvement request. I will define its success criteria and preservation boundaries before changing code.**

For a new AI chat, the shortest recommended opening message is:

> **Read and execute `AGENTS.md` in `Mettelo/mettelo-platform`. Complete the mandatory repository bootstrap first. Do not accept or implement any improvement request until you have produced the Repository Readiness Brief and the required readiness statement.**

---

## Rolling Green Baseline

Mettelo uses a **Rolling Green Baseline** model.

The trusted baseline is the latest `main` commit that has passed every check required for its change scope and has completed any release/deployment verification required for that change.

A merge by itself does **not** make a revision trusted.

The expected lifecycle is:

```text
current verified green main
  -> focused branch
  -> success criteria + preservation boundaries
  -> smallest coherent change
  -> tests + documentation in the same PR
  -> Change scope
  -> Fast regression gate
  -> authenticated backend/database E2E when required
  -> Release gate
  -> Deployment gate
  -> merge exact verified PR head
  -> verify resulting main SHA
  -> verify deployment/release evidence when applicable
  -> advance Rolling Green Baseline
```

If a required check fails, is cancelled, or is unexpectedly skipped, the baseline does not advance. The previous known-good baseline remains authoritative until the problem is fixed or the change is safely reverted.

Never describe a commit as `green`, `deployed`, or `the baseline` without current evidence for the exact SHA.

---

## Preservation-first engineering model

The default engineering rule is:

> **Preserve existing verified behaviour unless the requested improvement explicitly requires changing it. Extend before replacing. Change the smallest coherent surface possible.**

Before coding, every material improvement must define:

- the user journey being improved;
- the intended outcome;
- the existing behaviour that must remain unchanged;
- the expected files/domains to change;
- the areas that must not change;
- auth/RLS/security constraints;
- loading, empty, validation, success, and failure states where relevant;
- responsive/accessibility requirements for UI work;
- verification method;
- rollback path.

Risk boundaries are classified as:

- **RED — protected platform contracts:** auth, authorization/RLS, Production data, canonical APIs, Admin authorization, migrations, notification contracts, secrets, release/deployment controls.
- **AMBER — shared behaviour:** navigation, shared forms, reusable components, design-system primitives, global layout/CSS, common helpers.
- **GREEN — contained behaviour:** page-specific presentation, bounded copy, isolated components, local functionality with no shared contract impact.

Broader risk means stronger regression evidence.

---

## Source of truth and required reading

When repository documentation and implementation disagree, use this source-of-truth order:

1. **current code, migrations, workflow definitions, and infrastructure configuration**;
2. **[CONTRIBUTING.md](CONTRIBUTING.md)** for engineering policy;
3. **the engineering handbook in `docs/`** for system intent and operating guidance;
4. dated readiness/audit documents for historical evidence only.

Do not silently resolve discrepancies. Fix the implementation or document the unresolved mismatch in [docs/OPEN-ISSUES.md](docs/OPEN-ISSUES.md).

Recommended reading order after `AGENTS.md`:

| Document | What it tells you |
| --- | --- |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Non-negotiable engineering, security, PR, testing, migration, and release rules |
| [Developer start here](docs/DEVELOPER-START-HERE.md) | Mandatory cold start, baseline verification, current-state checks, and preservation workflow |
| [Engineering handbook](docs/README.md) | Documentation index and source-of-truth rules |
| [Onboarding](docs/ONBOARDING.md) | Local setup, developer workflow, environment preparation, and test commands |
| [Architecture](docs/ARCHITECTURE.md) | Runtime boundaries, routes, auth, data, RLS, storage, integrations, and scheduled operations |
| [Features](docs/FEATURES.md) | Product capabilities, canonical journeys, dependencies, and implementation trade-offs |
| [Design system](docs/DESIGN-SYSTEM.md) | Tokens, typography, layout, interaction, responsive rules, and accessibility standards |
| [CI/CD](docs/CI-CD.md) | Change scope, test gates, Release gate, Deployment gate, Vercel flow, and rollback |
| [Regression testing](docs/REGRESSION_TESTING.md) | Required journey protection, browser/E2E strategy, staging rules, and test data |
| [Open issues](docs/OPEN-ISSUES.md) | Confirmed P0/P1 gaps, operational risks, stale assumptions, and workarounds |
| [Decision log](docs/DECISIONS.md) | Why consequential engineering decisions were made |
| [AI startup prompt](docs/AI-SENIOR-DEVELOPER-STARTUP-PROMPT.md) | Long and short prompts for starting a new senior-development AI session |

---

## Product and technical stack

The current repository uses:

- **Next.js 15** and **React 19**;
- **TypeScript**;
- **Supabase Auth**;
- **Postgres** with **Row Level Security (RLS)**;
- Supabase Storage where required by product journeys;
- server API routes for validated privileged operations;
- **Playwright** for browser and authenticated E2E coverage;
- static/domain audit scripts for regression contracts;
- **GitHub Actions** for CI/release gating;
- **Vercel** for Preview/Production deployment.

Always verify the actual package versions and workflow definitions before making version-sensitive changes.

---

## Critical platform journeys

When a change touches one of these areas, trace the journey end to end instead of inspecting only the visible UI:

```text
User action
  -> client state / validation
  -> API route
  -> authentication / authorization
  -> database / RLS / storage
  -> Admin or operational visibility
  -> notification / outbox / external integration
  -> confirmation or error state
```

Important platform areas include:

- sign up, sign in, email confirmation, reset, and protected member access;
- Project Architect progression;
- public project interest and role applications;
- project membership and contribution/proof workflows;
- opportunity/event/publication journeys;
- Admin application and operational queues;
- career applications and uploaded CV evidence;
- newsletter/private intake persistence;
- member notifications and delivery/outbox paths;
- organisation/partnership flows;
- public/mobile navigation and shared layout behaviour.

Do not change a shared contract without checking its downstream consumers and regression coverage.

---

## Repository structure

The exact structure evolves, but these locations are operationally important:

```text
app/                    Next.js application routes, pages, layouts, APIs
components/             shared and feature UI components
lib/                    shared helpers, data/auth clients, domain utilities
scripts/                audits, setup, operational and CI helper scripts
tests/                  Playwright and regression/contract test suites
supabase/migrations/    canonical versioned schema/policy/function changes
supabase/               Supabase configuration and related support files
.github/workflows/      CI, release, and repository automation
docs/                   engineering handbook and decision/open-issue records
AGENTS.md               mandatory AI/developer startup contract
CONTRIBUTING.md         engineering rules
```

Before modifying shared files, inspect all important consumers rather than assuming they are isolated.

---

## Local setup

### 1. Install dependencies

Use the lockfile exactly:

```bash
npm ci
```

### 2. Configure local environment

Copy the example environment file:

```bash
cp .env.example .env.local
```

At minimum, normal local application work commonly requires:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Follow `.env.example` for the complete current variable list.

Security rules:

- `NEXT_PUBLIC_SUPABASE_ANON_KEY` may contain the browser-safe Supabase publishable/anon key;
- `SUPABASE_SERVICE_ROLE_KEY` is **server-only**;
- never expose service-role credentials through `NEXT_PUBLIC_*`;
- never commit real secrets;
- never print privileged credentials to browser/server logs;
- never move privileged database work into client components for convenience.

### 3. Start development

```bash
npm run dev
```

Default local application origin is normally:

```text
http://localhost:3000
```

Check [docs/ONBOARDING.md](docs/ONBOARDING.md) for the current local Supabase/backend preparation process before working on database-backed authenticated journeys.

---

## Quality and regression gates

Useful local checks include:

```bash
npm run lint
npm run typecheck
npm run audit:interactions
npm run audit:regression-coverage
npm run test:project-interest-flow
npm run test:regression
npm run build
```

Additional audit and E2E scripts exist and are run according to change scope. Read `package.json`, `.github/workflows/ci.yml`, and [docs/CI-CD.md](docs/CI-CD.md) for the exact current gate set rather than relying only on this abbreviated list.

The GitHub Actions release model includes:

1. **Change scope** — determines whether backend/database E2E is required for the changed files.
2. **Fast regression gate** — dependency install, lint, typecheck, audits, regression browser checks, and production build.
3. **Staging submission journeys** — authenticated backend/database E2E when required by scope.
4. **Release gate** — deterministic aggregate decision over all checks required by scope.
5. **Deployment gate** — final in-repository deployment eligibility signal and must succeed only after Release gate succeeds.

A skipped required test is not green. A docs/CI-policy-only exemption is valid only when the scope classifier explicitly records that exemption and the aggregate Release gate accepts it.

---

## Browser, UI/UX, accessibility, and responsive requirements

All product UI work must follow [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md) and meet WCAG 2.2 AA.

Minimum requirements include:

- text contrast at least `4.5:1` where required;
- UI/non-text/focus contrast at least `3:1`;
- no colour-only status communication;
- visible keyboard focus;
- keyboard-operable interactions;
- ARIA labels for icon-only controls;
- logical heading and landmark structure;
- no unintended horizontal overflow;
- preserved form values through multi-step/review states;
- usable loading, empty, success, validation, and error states.

Responsive behaviour must be considered explicitly for:

- **mobile:** `<=480px`;
- **tablet:** `481–1024px`;
- **desktop:** `>=1025px`.

Do not redesign unrelated shared components while fixing a contained page unless the shared contract itself is part of the approved success criteria.

---

## Database, Supabase, migrations, and RLS

Canonical schema changes belong in:

```text
supabase/migrations/
```

Rules:

- every schema/policy/index/function/storage change must be versioned;
- prefer additive and backward-compatible migrations;
- do not make Production-only schema changes that are absent from version control;
- do not reverse or destroy Production data from memory;
- re-check RLS and authorization assumptions whenever data access changes;
- service-role access is server-only;
- destructive E2E must never point at Production;
- test/staging fixtures must use isolated disposable identities/data and be cleanable.

The application has historically referenced some hosted schema/storage capabilities that were not fully represented by a blank-project migration bootstrap. Always check [docs/OPEN-ISSUES.md](docs/OPEN-ISSUES.md) before treating a fresh Supabase project as equivalent to Production.

RLS is enabled across exposed application tables. Anonymous intake/newsletter writes that require privileged persistence go through validated server endpoints rather than direct client service-role access.

---

## Authentication and authorization

Important routes include:

- `/signin` — sign in, signup via mode, and recovery entry;
- `/auth/callback` — confirmation/session exchange;
- `/auth/update-password` — password update flow;
- `/member/*` — authenticated member workspace;
- `/project-architect` — authenticated progression into the governed member Project Architect journey;
- `/admin/*` — authenticated admin-only operational surfaces.

Admin access uses trusted auth metadata (`app_metadata`) rather than client-editable profile fields.

There is deliberately no public admin-promotion endpoint and no default admin credential.

Trusted bootstrap of an existing account is performed only from a trusted environment with the service-role key, for example:

```bash
npm run admin:promote -- admin@example.com
```

Verify the current script and authorization checks before using it.

---

## Security rules

These are non-negotiable:

- never expose the Supabase service-role key;
- never commit credentials, secrets, tokens, or Production environment values;
- never put privileged credentials in `NEXT_PUBLIC_*` variables;
- never weaken RLS or authorization just to make a test pass;
- never create hidden/default admin access;
- validate input server-side even when client validation exists;
- preserve canonical API boundaries and idempotency/duplicate protection where implemented;
- route privileged anonymous writes through validated server endpoints;
- do not run destructive E2E against Production;
- after DDL/RLS changes, re-run relevant Supabase security/performance checks;
- do not weaken or remove CI assertions merely to obtain a green PR.

If a requested change conflicts with these rules, redesign the change rather than weakening the platform.

---

## Pull request workflow

Material work should normally follow:

1. bootstrap the repository/session;
2. verify the current Rolling Green Baseline;
3. write success criteria;
4. write preservation boundaries;
5. classify RED/AMBER/GREEN risk;
6. create a focused branch from the intended baseline;
7. make the smallest coherent change;
8. update/add tests;
9. update relevant documentation **in the same PR**;
10. run local checks where practical;
11. open a focused PR with rollback notes;
12. wait for every check required by scope to pass;
13. merge only the exact verified PR head;
14. fetch the resulting `main` SHA;
15. verify post-merge/release/deployment evidence as required;
16. only then advance the Rolling Green Baseline.

One improvement should normally be one PR. If a small improvement unexpectedly requires many unrelated areas to change, investigate the coupling rather than automatically broadening scope.

---

## Documentation maintenance rule

Documentation is part of the codebase.

Any change to architecture, features, design system, data model, security model, infrastructure, CI/CD, deployment behaviour, or a critical user journey must update the relevant `docs/` files in the **same pull request**.

A functional change with stale documentation is incomplete.

Consequential decisions belong in [docs/DECISIONS.md](docs/DECISIONS.md), and unresolved risks belong in [docs/OPEN-ISSUES.md](docs/OPEN-ISSUES.md).

---

## Deployment and release

Production requires the current set of environment variables documented in `.env.example` and [docs/CI-CD.md](docs/CI-CD.md). Core variables include the public Supabase URL/key, server-only service-role key, and the canonical site URL.

Vercel Git integration is external to GitHub Actions and may create Preview/Production deployment activity independently of the in-repository gates. Therefore:

- a Vercel Preview is development evidence, not release approval;
- the GitHub Release gate remains the aggregate repository release decision;
- Deployment gate is the final in-repository eligibility signal;
- verify the exact deployed SHA when deployment evidence matters;
- do not call a deployment successful because a different SHA previously deployed;
- build-rate-limit or platform-capacity failures must be distinguished from application test/build failures.

Read [docs/CI-CD.md](docs/CI-CD.md) before any release, rollback, or deployment-control change.

---

## Known operational caution areas

Always review [docs/OPEN-ISSUES.md](docs/OPEN-ISSUES.md) before work. Particularly important historical/operational caution areas include:

- hosted/versioned Supabase schema drift and blank-project bootstrap completeness;
- staging/authenticated E2E environment availability;
- external Vercel deployment behaviour and capacity/rate limits;
- whether GitHub `main` branch protection and required checks are technically enforced at the moment of work;
- browser/regression coverage gaps that may exist outside the aggregate test script;
- stale launch/readiness statements that must be re-verified against current code and infrastructure.

Do not copy a workaround into new architecture merely because it exists today. Record it, preserve safety, and fix it through a focused reviewed change when justified.

---

## First admin bootstrap

There is no default admin account and no public admin-promotion endpoint.

1. Create and confirm a normal Mettelo account through `/signin`.
2. From a trusted server/local environment containing the service-role key, run:

```bash
npm run admin:promote -- admin@example.com
```

The command promotes the existing Supabase Auth identity by trusted metadata. `/admin` and Admin APIs must continue to enforce trusted admin authorization.

---

## Before you say “done”

For any material change, do not report completion until you can answer all of these with evidence:

- What exact branch/head was changed?
- What existing behaviour was required to remain unchanged?
- What checks were required by scope?
- Did those exact checks pass on the exact PR head?
- Was the exact head merged?
- What is the resulting exact `main` SHA?
- Did the required post-merge checks pass?
- Was deployment verification required, and if so did the intended SHA deploy?
- Is the new `main` now legitimately the Rolling Green Baseline?
- Is the previous known-good baseline still identifiable for rollback?

If any answer is unknown, say it is unknown and verify it rather than assuming success.

---

## Quick start summary

If you are new to the project and only remember one sequence, use this:

```text
Read AGENTS.md
  -> complete repository bootstrap
  -> read CONTRIBUTING + developer start-here + relevant handbook docs
  -> verify exact current main/baseline
  -> define success criteria and preservation boundaries
  -> focused branch + smallest coherent change
  -> tests + docs in same PR
  -> required checks green
  -> merge exact head
  -> verify resulting main/release/deployment
  -> advance Rolling Green Baseline
```

That workflow is how Mettelo keeps improving without sacrificing the working product that already exists.
