# CI/CD, deployment, and rollback

Last audited: 18 August 2026

## Release model

Mettelo uses a **Rolling Green Baseline**. The authoritative baseline is the latest `main` commit that has successfully passed every required quality, regression, security, database, browser, release-gate, and deployment check. A merge alone does not advance the baseline.

Required release order:

```text
change-scope classification
  -> static/type/audit + browser/regression checks
  -> authenticated backend/database E2E when required by scope
  -> aggregate Release gate
  -> Deployment gate
  -> deployment validation/promotion when required by scope
  -> verify resulting main/deployed state
  -> advance Rolling Green Baseline
```

If any required prerequisite fails, the baseline does not move and Production must not be promoted on the strength of that failed run.

The repository defines quality gates in GitHub Actions and is connected to Vercel for Preview/Production deployments. The repository does not contain a Vercel CLI deployment workflow, so the exact Git integration, Production branch, required checks, and promotion protection are external settings.

**TODO: confirm in GitHub/Vercel that `main` is the Production branch, pull requests receive Preview deployments, and the `Release gate`/`Deployment gate` policy is enforced before Production promotion.** A green Vercel deployment by itself is not the release gate.

Important: an externally-created Vercel Preview may start before GitHub Actions finishes. That Preview is development evidence only. It must never be interpreted as approval to merge or promote Production when prerequisite checks are red.

## GitHub Actions workflows

### `Mettelo CI` — `.github/workflows/ci.yml`

Triggers on every pull request and push to `main`. Concurrency cancels superseded work for the same branch/PR.

#### Change scope

The `scope` job classifies whether authenticated destructive backend E2E is required on both pull requests and pushes to `main`.

- The classifier computes the actual changed files. Pull requests compare base SHA to head SHA; `main` pushes compare the event's `before` SHA to the resulting `github.sha`.
- If a `main` push has no trustworthy predecessor (for example an all-zero `before` SHA), classification fails closed to `unscoped-main-push-full-release` and authenticated backend E2E is mandatory.
- A change is exempt only when every changed file is Markdown documentation or a GitHub workflow-policy YAML file. That class is `docs-or-ci-policy-only`.
- Any application source, API route, migration, Supabase configuration, test, package/dependency file, runtime configuration, script, asset, or other non-documentation file is classified `runtime-or-backend-impact` and requires authenticated backend E2E.
- The classifier prints the changed-file list and classification in the job log. The exemption is therefore explicit release evidence, not a hidden skip.
- If classification itself fails, Release gate fails.

This exception exists to keep unrelated hosted-staging configuration gaps from blocking safe documentation/policy work. It must not be expanded casually. Changes that can alter user journeys, data, auth, runtime behavior, or release artifacts require the backend gate.

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

The `staging-e2e` job runs only when `Change scope` says authenticated backend E2E is required, and only for pushes or same-repository pull requests. It requires the complete `E2E_*` secret set, installs Chromium, and runs authenticated smoke plus database-backed staging submissions with one worker. Failure evidence is retained for seven days.

The config guard rejects missing values, production origins/projects, and unsafe credentials before the suite mutates data. Test records use dedicated accounts/markers and must be cleaned up.

For `docs-or-ci-policy-only` changes this job is expected to be `skipped` by scope. That is not equivalent to silently skipping a required test: the Release gate verifies that the classifier explicitly said backend E2E was not required. If backend E2E is required, anything other than `success` blocks release.

#### Release gate

The `release-gate` job runs even when dependencies fail so it can produce a deterministic aggregate decision. It requires:

- successful `Change scope` classification;
- successful `Fast regression gate`;
- successful `Staging submission journeys` whenever scope requires backend E2E;
- otherwise an expected `skipped` (or successful) staging result only for an explicit `docs-or-ci-policy-only` classification.

A failed, cancelled, or unexpectedly skipped required backend job is not accepted as green.

#### Deployment gate

`Deployment gate` depends on `Release gate` (and reads `Change scope`) and uses `if: always() && needs.release-gate.result == 'success'`. The `always()` term is required only to bypass GitHub Actions' transitive-skip behavior when staging was intentionally scope-exempt; the explicit result check still prevents this job from running after a failed, cancelled, or skipped Release gate. It is the final in-repository eligibility signal before deployment validation/promotion.

For a documentation/CI-policy-only change, Deployment gate records eligibility but no runtime Production deployment is required to prove application behavior because no runtime application artifact changed. For runtime/backend-impacting changes, deployment validation remains part of release evidence.

This does not control whether an external Vercel Git integration creates a Preview early. Preview creation is separate from release approval. Production promotion must still respect the release/deployment gates.

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

The Phase 1 browser suite is not currently included in `npm run test:regression` or the `main` CI workflow. See [Open issues](OPEN-ISSUES.md#p1-phase-1-browser-gate-is-not-part-of-ci).

## Vercel flow

Expected operating model (external settings must be confirmed):

1. Start from the current verified Rolling Green Baseline.
2. Push a focused feature branch and open a pull request.
3. GitHub Actions classifies change scope and runs the required gates.
4. Vercel may create a Preview deployment with Preview-scoped environment variables; this is not release approval.
5. Verify the affected journey on Preview/staging, including Admin/data evidence where applicable.
6. `Release gate` must succeed.
7. `Deployment gate` runs only after successful Release gate.
8. Merge only when all required PR checks are green.
9. On `main`, GitHub Actions classifies the actual merge/push diff again and runs all checks required by that exact scope.
10. Runtime/backend-impacting changes require deployment validation and read-only Production smoke checks; destructive fixtures must never target Production.
11. Documentation/CI-policy-only changes do not require a new runtime deployment to prove application behavior, though external Vercel Git integration may still attempt one until separately reconfigured.
12. Verify the exact resulting `main` SHA and any required deployed SHA/state.
13. Only after all required evidence for that scope is green does that `main` SHA become the new Rolling Green Baseline.

Vercel Cron invokes the routes listed in [Architecture](ARCHITECTURE.md#scheduled-operations). Cron endpoints require the expected bearer secret.

## Environment separation

| Environment | Supabase | Data rule | Credentials |
| --- | --- | --- | --- |
| Local | Local or dedicated development project | Never silently point destructive tests at Production | `.env.local`, never committed |
| Preview/staging | Dedicated Supabase project/branch | Disposable accounts and test-tagged records; migrations match branch | Vercel Preview variables + GitHub `E2E_*` secrets |
| Production | Production Supabase project | Read-only smoke unless a specifically approved synthetic journey exists | Vercel Production variables |

A single Supabase project/environment uses one service-role key. Forms do not need separate service-role keys. Rotate the key if exposed, update every server/CI consumer, and redeploy.

## Pre-merge checklist

- The work branch started from the intended current baseline.
- Success criteria identify the existing behavior that must not regress.
- Documentation and a decision entry are included when architecture/behavior changed.
- Migration and RLS changes are versioned and advisor-reviewed.
- `npm ci`, lint, typecheck, audits, regression tests, and build pass.
- Credentialed staging journey passes whenever `Change scope` requires authenticated backend E2E.
- A docs/CI-policy-only exemption is accepted only when the classifier records that exact scope.
- Preview is checked at mobile, tablet, and desktop widths, keyboard-only, and relevant error states when UI changed.
- Environment additions appear in `.env.example` without values.
- Rollback impact is described in the PR.
- No failing or unexpectedly skipped required check is treated as green.
- Deployment gate is the final GitHub Actions release stage.

## Post-merge baseline check

After every merge to `main`:

1. fetch the exact resulting `main` SHA;
2. verify `Change scope` for the exact push/merge diff;
3. verify every check required by that classification;
4. verify Production deployment points to the intended SHA/state when runtime deployment is required;
5. keep the previous green baseline available for rollback/recovery;
6. only then declare the new `main` SHA the Rolling Green Baseline.

If post-merge verification fails, stop additional improvement merges. The previous green baseline remains authoritative until the new failure is fixed or rolled back through the release process.

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
