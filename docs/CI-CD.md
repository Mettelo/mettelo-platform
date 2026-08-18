# CI/CD, deployment, and rollback

Last audited: 18 August 2026

## Release model

The repository defines quality gates in GitHub Actions and is connected to Vercel for Preview/Production deployments. The repository does not contain a Vercel CLI deployment workflow, so the exact Git integration, Production branch, required checks, and promotion protection are external settings.

**TODO: confirm in GitHub/Vercel that `main` is the Production branch, pull requests receive Preview deployments, and the `Release gate` check is required before merge.** A green Vercel deployment by itself is not the release gate.

## GitHub Actions workflows

### `Mettelo CI` — `.github/workflows/ci.yml`

Triggers on every pull request and push to `main`. Concurrency cancels superseded work for the same branch/PR.

#### Fast regression gate

The `verify` job uses Node 22 and runs:

1. `npm ci --no-audit --no-fund`
2. lint and TypeScript typecheck
3. interaction and regression-coverage audits
4. project-interest and phase/domain contract audits
5. Chromium installation
6. `npm run test:regression`
7. the production build (including deployment-configuration and interaction prechecks)

On failure it uploads the interaction audit artifact when available.

#### Staging submission journeys

The `staging-e2e` job runs for pushes and same-repository pull requests (not untrusted forks). It requires the complete `E2E_*` secret set, installs Chromium, and runs authenticated smoke plus database-backed staging submissions with one worker. Failure evidence is retained for seven days.

The config guard rejects missing values, production origins/projects, and unsafe credentials before the suite mutates data. Test records use dedicated accounts/markers and must be cleaned up.

#### Release gate

The `release-gate` job runs even when dependencies fail and succeeds only when both `verify` and `staging-e2e` report `success`. A skipped staging job is not accepted as a pass.

### `Sync Supabase Auth Templates`

`.github/workflows/sync-supabase-auth-templates.yml` runs manually or on `main` changes to auth templates, its sync script, or the workflow. It uses `SUPABASE_ACCESS_TOKEN` and a configured project ref to apply and verify the repository's hosted Auth templates.

The project ref is currently present in workflow/script configuration. Treat it as deployment metadata, not a secret, but avoid duplicating it in new documentation or tests. **TODO: confirm this workflow targets the intended Production project and add a staging-template strategy if Preview authentication needs separate copy.**

## Playwright gates

| Command | Files | Purpose |
| --- | --- | --- |
| `npm run test:forms` | `tests/form-route-contracts.spec.ts` | Form UI, payload, validation, and route contracts |
| `npm run test:regression` | form contracts + `tests/critical-ui.spec.ts` | Critical public UI, mobile menu, routes, and forms |
| `npm run test:phase1-browser` | `tests/phase1-browser.spec.ts` | Full Phase 1 auth/onboarding responsive browser acceptance |
| `npm run test:e2e:smoke` | `tests/authenticated-smoke.spec.ts` | Member, Architect, and Admin protected-route checks |
| `npm run test:e2e:staging` | authenticated smoke + staging journeys | Browser → API → database → Admin queue → notification evidence |

Playwright enables full parallel execution, one retry, and four CI/two local workers for standard tests. The staging command overrides to one worker to keep destructive fixtures deterministic. When `E2E_BASE_URL` is absent, Playwright starts the local Next.js dev server at `127.0.0.1:3000`; a remote E2E URL disables that web server.

The Phase 1 browser suite is not currently included in `npm run test:regression` or the CI workflow. See [Open issues](OPEN-ISSUES.md#p1-phase-1-browser-gate-is-not-part-of-ci).

## Vercel flow

Expected operating model (external settings must be confirmed):

1. Push a feature branch and open a pull request.
2. GitHub Actions runs the fast and staging gates.
3. Vercel creates a Preview deployment with Preview-scoped environment variables.
4. Verify the affected journey on Preview/staging, including Admin/data evidence where applicable.
5. Merge only when the required release gate is green.
6. Vercel builds `main` as Production using Production-scoped variables.
7. Run read-only Production smoke checks; do not submit destructive fixtures to Production.

Vercel Cron invokes the routes listed in [Architecture](ARCHITECTURE.md#scheduled-operations). Cron endpoints require the expected bearer secret.

## Environment separation

| Environment | Supabase | Data rule | Credentials |
| --- | --- | --- | --- |
| Local | Local or dedicated development project | Never silently point destructive tests at Production | `.env.local`, never committed |
| Preview/staging | Dedicated Supabase project/branch | Disposable accounts and test-tagged records; migrations match branch | Vercel Preview variables + GitHub `E2E_*` secrets |
| Production | Production Supabase project | Read-only smoke unless a specifically approved synthetic journey exists | Vercel Production variables |

A single Supabase project/environment uses one service-role key. Forms do not need separate service-role keys. Rotate the key if exposed, update every server/CI consumer, and redeploy.

## Pre-merge checklist

- Documentation and a decision entry are included when architecture/behavior changed.
- Migration and RLS changes are versioned and advisor-reviewed.
- `npm ci`, lint, typecheck, audits, regression tests, and build pass.
- Credentialed staging journey passes for any form, auth, queue, notification, or protected-role change.
- Preview is checked at mobile, tablet, and desktop widths, keyboard-only, and relevant error states.
- Environment additions appear in `.env.example` without values.
- Rollback impact is described in the PR.

## Rollback procedure

### Application-only regression

1. Stop further merges and capture the failing commit/deployment and safe evidence.
2. In Vercel, redeploy/promote the last known-good Production deployment **or** create a Git revert of the offending commit and pass it through the release gate. Which option is allowed depends on project protection: **TODO: document the exact owner-approved Vercel rollback control.**
3. Verify the critical route and its backend read path after rollback.
4. Add a regression test that reproduces the failure before reapplying a fix.

### Database/API regression

1. Protect submitted data and stop writers/cron routes if continued writes would cause harm.
2. Do not run a destructive reverse migration against Production from memory.
3. Prefer a reviewed forward/compensating migration that preserves rows and restores compatibility.
4. If an application rollback expects an older schema, confirm forward/backward compatibility before promoting it.
5. Run Supabase security/performance advisors and the staging journey before Production.

### Secret/configuration incident

1. Rotate the affected secret at its provider.
2. Update the correct Vercel Preview/Production and GitHub Actions scopes.
3. Redeploy; merely saving an environment variable does not update an already-built deployment.
4. Verify route behavior and inspect logs without printing secret values or sensitive form payloads.

### Post-rollback record

Add an entry to [DECISIONS.md](DECISIONS.md) with the incident cause/fix and update [Open issues](OPEN-ISSUES.md) until prevention evidence is merged.
