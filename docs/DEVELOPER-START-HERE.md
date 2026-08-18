# Developer start here

Last audited: 18 August 2026

This file is the mandatory first stop for every human developer, contractor, contributor, coding agent, or new ChatGPT session before making any improvement to Mettelo.

The purpose is to preserve the latest known-good platform while allowing Mettelo to keep improving safely.

## 1. The Rolling Green Baseline

Mettelo uses a **Rolling Green Baseline**.

> The authoritative baseline is the latest commit on `main` that has successfully passed every required quality, regression, security, database, browser, release-gate, and deployment check.

The baseline is not permanently fixed to one historical commit. It advances only when a newer `main` commit has passed every required check.

If a newer commit or pull request fails any required check, the baseline does **not** move. The previous green `main` commit remains the trusted reference.

A skipped critical test is not green. A successful build is not enough. A Preview deployment is not enough. A merge is not enough. The exact resulting `main` SHA must be verified.

## 2. Mandatory cold-start procedure

Before changing code, UI, data, infrastructure, tests, or documentation, complete every step below.

### A. Identify the repository and current baseline candidate

1. Confirm the repository is `Mettelo/mettelo-platform`.
2. Read the current `main` SHA directly from GitHub.
3. Read the latest GitHub Actions result for that exact SHA.
4. Confirm whether all required checks passed.
5. Confirm the deployed Production SHA when deployment state matters.
6. If the newest `main` SHA is not fully green, identify the previous known-green `main` SHA and treat that as the baseline until the failure is resolved.

Never trust a handoff, previous chat, local branch, old screenshot, or old status message as proof that the current baseline is green.

### B. Read the engineering sources in this order

1. `CONTRIBUTING.md`
2. `docs/README.md`
3. `docs/ONBOARDING.md`
4. `docs/ARCHITECTURE.md`
5. `docs/DESIGN-SYSTEM.md`
6. `docs/CI-CD.md`
7. `docs/REGRESSION_TESTING.md`
8. `docs/OPEN-ISSUES.md`
9. the newest relevant entries in `docs/DECISIONS.md`
10. the feature-specific source/docs for the journey being changed

When sources conflict, use the source-of-truth order in `docs/README.md`.

### C. Inspect the actual implementation before proposing a change

For the journey being changed, trace the complete path:

```text
User action -> UI validation -> API route -> database/RLS -> Admin visibility -> notification -> confirmation
```

Inspect the current component/page, canonical API route, database objects and policies, shared helpers, Admin surface, notification/outbox behavior, tests, and relevant workflow jobs.

Do not redesign or replace a working path because a screenshot, old chat, or assumption suggests another implementation.

### D. Record success criteria before implementation

Every material change must state, before code is changed:

- user journey;
- expected result;
- behavior that must remain unchanged;
- permission/security boundaries;
- mobile (`<=480px`), tablet (`481-1024px`) and desktop (`>=1025px`) behavior;
- loading, empty, success and error states;
- WCAG 2.2 AA requirements;
- verification method;
- rollback path.

If those criteria are unclear, do not start a broad implementation. Narrow the scope to what can be proven.

## 3. Change-scope rule

Default to **extend, do not replace**.

Preserve the current canonical journey and add the smallest change required. Do not rewrite unrelated systems as part of a local improvement.

Use these protection levels:

### Red — protected platform contracts

Examples: authentication, RLS, Production data, canonical APIs, Admin authorization, lifecycle rules, notification contracts, migrations and deployment controls.

Changes require explicit justification, focused regression coverage and backend/security verification.

### Amber — shared behavior

Examples: shared navigation, forms, common components, design-system primitives, global layout, shared CSS and reusable helpers.

Changes are allowed only after identifying all consumers and verifying they still behave correctly.

### Green — local behavior

Examples: page-specific presentation, contained copy, isolated components and new functionality behind a clear boundary.

These changes may move faster but must still preserve the Rolling Green Baseline and required quality rules.

## 4. Required branch and pull-request workflow

Never develop directly on `main`.

Use:

```text
current green baseline
  -> focused feature/fix branch
  -> written success criteria
  -> implementation + tests + docs
  -> required checks
  -> review
  -> merge only when green
  -> verify resulting main SHA
  -> new green main becomes baseline
```

One improvement should normally produce one coherent pull request. If an apparently small change begins touching many unrelated domains, stop and investigate scope rather than continuing a platform-wide rewrite.

Do not merge because a PR is mergeable. Mergeability is not quality evidence.

## 5. Required preservation checks before merge

At minimum, follow `CONTRIBUTING.md` and `docs/REGRESSION_TESTING.md`.

For every change:

- lint passes;
- typecheck passes;
- interaction/regression audits pass;
- relevant regression tests pass;
- production build passes;
- no skipped critical test is counted as success;
- documentation changes are included in the same PR when system behavior or architecture changes;
- rollback is documented.

For protected/backend journeys also verify the real user path against an isolated non-Production environment. Never make destructive E2E target Production merely to obtain a green check.

## 6. Deployment ordering

Deployment validation is the final release stage.

Required order:

```text
static/type/audit checks
  -> browser/regression checks
  -> isolated backend/database E2E
  -> aggregate Release gate
  -> deployment validation/promotion
```

If any prerequisite fails, deployment validation/promotion must not be treated as successful release evidence and Production must not be promoted.

A Vercel Preview may be created by external Git integration before all GitHub checks finish, but that Preview is not release approval. Production promotion remains blocked until the repository's required release gate is green.

## 7. Advancing the baseline

After merge:

1. read the resulting `main` SHA;
2. verify every required check on that exact SHA;
3. verify Production deployment points to the intended SHA when applicable;
4. record or retain the previous green baseline for rollback/recovery;
5. only then call the new `main` SHA the Mettelo baseline.

If the post-merge `main` SHA fails a required check, the new commit is **not** the baseline. Stop further improvement merges and restore/fix through the normal release process.

## 8. Rules for a new ChatGPT development session

A new ChatGPT session must not begin product improvements immediately from a handoff summary.

Before proposing or editing code, it must:

1. connect to and inspect `Mettelo/mettelo-platform`;
2. verify current `main` and required-check state;
3. read this file and the mandatory engineering docs listed above;
4. inspect open PRs that may overlap the requested area;
5. inspect the exact implementation and tests for the requested journey;
6. state the success criteria first;
7. identify the current green baseline;
8. preserve existing working behavior unless the user explicitly asks to change it;
9. make the smallest coherent change;
10. never claim green, merged, deployed, or baseline status without current evidence.

This cold start is mandatory even when a previous session provides a detailed handoff. Handoffs are context, not current-state verification.

## 9. Definition of safe progress

Mettelo is moving forward safely when each completed improvement leaves the repository in a stronger state than before:

- intended behavior improved;
- unrelated behavior preserved;
- tests describe the contract that must remain true;
- documentation matches reality;
- rollback remains possible;
- all required checks pass;
- the verified green `main` becomes the next baseline.
