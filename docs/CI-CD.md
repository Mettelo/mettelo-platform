# CI/CD, deployment, and rollback

Last audited: 19 August 2026

## Release model

Mettelo uses a **Rolling Green Baseline**. The authoritative baseline is the latest `main` commit that has successfully passed every quality, regression, security, database, browser, release-gate, and deployment check **required for that exact change scope**. A merge alone does not advance the baseline.

Mettelo also uses **risk-scoped blocking**. A failing check blocks release when it indicates meaningful risk in the code area changed by the pull request. Unrelated journey failures may still run and report evidence without automatically blocking an otherwise safe focused change. This does not permit hiding failures, weakening security assertions, or making a directly affected failing journey non-blocking just to obtain green CI. See [Risk-scoped release gates](RISK-SCOPED-RELEASE-GATES.md).

Required release order:

```text
change-scope classification
  -> static/type/audit + browser/regression checks
  -> scoped authenticated backend/database E2E when required
  -> aggregate Release gate
  -> Deployment gate
  -> deployment validation/promotion when required by scope
  -> verify resulting main/deployed state
  -> advance Rolling Green Baseline
```

If any required prerequisite fails, the baseline does not move and Production must not be promoted on the strength of that failed run.

The repository defines quality gates in GitHub Actions and is connected to Vercel for Preview/Production deployments. GitHub protection is external repository configuration rather than code stored in this repository.

**Confirmed 18 August 2026:** the repository owner confirmed an active GitHub ruleset named `Protect main - Rolling Green Baseline`, targeting `main`, with pull-request and required-check protection configured for the repository release gates. `Release gate` is the aggregate release decision and `Deployment gate` is the final in-repository deployment-eligibility signal. GitHub's legacy branch-protection endpoint does not necessarily expose ruleset configuration, so protection verification must inspect the active ruleset rather than infer its absence from that legacy endpoint.

Vercel Production-branch selection, Preview behavior, promotion controls, and rollback permissions remain external settings that must be verified separately. A green Vercel deployment by itself is not the release gate.

Important: an externally-created Vercel Preview may start before GitHub Actions finishes. That Preview is development evidence only. It must never be interpreted as approval to merge or promote Production when prerequisite checks are red.

## GitHub Actions workflows

### `Mettelo CI` — `.github/workflows/ci.yml`

Triggers on every pull request and push to `main`. Concurrency cancels superseded work for the same branch/PR.

#### Change scope

The `scope` job classifies whether authenticated backend E2E is required on both pull requests and pushes to `main`.

- The classifier computes the actual changed files. Pull requests compare base SHA to head SHA; `main` pushes compare the event's `before` SHA to the resulting `github.sha`.
- If a `main` push has no trustworthy predecessor (for example an all-zero `before` SHA), classification fails closed to `unscoped-main-push-full-release` and authenticated backend E2E is mandatory.
- A change is exempt only when every changed file is Markdown documentation or a GitHub workflow-policy YAML file. That class is `docs-or-ci-policy-only`.
- Any application source, API route, migration, Supabase configuration, test, package/dependency file, runtime configuration, script, asset, or other non-documentation file is classified `runtime-or-backend-impact` and requires the scoped authenticated backend gate.
- The classifier prints the changed-file list and classification in the job log. The exemption is therefore explicit release evidence, not a hidden skip.
- If classification itself fails, Release gate fails.

This exception exists to keep safe documentation/policy work from being blocked by runtime-only checks. It must not be expanded casually. Changes that can alter user journeys, data, auth, runtime behavior, or release artifacts require backend evidence appropriate to their blast radius.

#### Fast regression gate

The `verify` job uses Node 22 and runs:

1. `npm ci --no-audit --no-fund`
2. lint and TypeScript typecheck
3. interaction and regression-coverage audits
4. project-interest and phase/domain contract audits
5. the production build (including deployment-configuration and interaction prechecks)
6. Playwright Chromium cache restore plus direct Chromium install/verification when staging is not required
7. a fail-closed Chromium launch preflight on the hosted runner
8. `npm run test:regression` when staging is not required

On failure it uploads the interaction audit artifact when available.

Chromium browser binaries are cached with `actions/cache@v4` under Playwright's standard Linux cache directory and keyed by runner OS plus `package-lock.json`. CI runs `npx playwright install chromium` after cache restore; on an exact cache hit this verifies the browser artifact, and on a miss it downloads the required Playwright Chromium revision. GitHub's Ubuntu hosted image already supplies the core Chromium runtime libraries used by this suite, so CI does not invoke Playwright's apt-based `install-deps` path. A dedicated Chromium launch preflight fails closed if the hosted image ever stops supplying a viable runtime. The cache and provisioning optimization do **not** skip, downgrade, or make browser regression tests non-blocking.

This avoids coupling release completion to transient Ubuntu package-mirror throughput for optional font/X11 packages. The blocking browser suites remain the authoritative rendering, responsive, authenticated, and persistence evidence; if Chromium cannot launch or render the application on the hosted image, the release fails.

#### Staging submission journeys

The `staging-e2e` job runs only when `Change scope` says authenticated backend E2E is required, and only for pushes or same-repository pull requests.

The current zero-cost implementation uses an **ephemeral local Supabase stack inside GitHub Actions** rather than a paid hosted staging project/branch. The job:

1. installs project dependencies;
2. restores the Playwright Chromium browser cache, installs/verifies the required Chromium revision, and verifies Chromium can launch;
3. installs the Supabase CLI;
4. prepares the isolated migration workdir, including CI-only compatibility shims for hosted objects that pre-date canonical migration history;
5. starts the local Supabase stack;
6. exports local-only Supabase credentials into the runner environment;
7. seeds disposable Member, Project Architect, and Admin identities plus deterministic fixtures;
8. starts Mettelo against local Supabase;
9. verifies the Production guard;
10. runs the blocking public browser regression suite;
11. runs blocking authenticated smoke and Mettelo Lab Chromium visual QA;
12. runs the representative blocking persisted-submission journey required by the current infrastructure gate;
13. runs the broader submission suite informationally and uploads evidence when it fails;
14. tears the local stack down.

The config guard rejects Production Supabase and unsafe identity reuse before destructive tests run. `CI_LOCAL_SUPABASE=1` is accepted only for loopback Supabase URLs. Production credentials must never be substituted.

For the current release-infrastructure implementation, these are blocking:

- isolated stack preparation/startup;
- disposable fixture creation;
- Production guard;
- public Chromium regression;
- authenticated Member/Project Architect/Admin smoke and Mettelo Lab Chromium visual QA;
- one representative browser -> API -> database persisted submission path.

The broader project-interest and career submission journeys continue to run as evidence. A failure in one of those broader journeys is informational **unless the changed scope directly affects that journey or shared infrastructure makes it relevant**. When directly affected, that journey becomes release-blocking.

For `docs-or-ci-policy-only` changes this job is expected to be `skipped` by scope. That is not equivalent to silently skipping a required test: the Release gate verifies that the classifier explicitly said backend E2E was not required.

#### Journey-level risk scoping

The workflow-level classifier decides whether backend E2E is needed at all. Within runtime work, reviewers/developers must also identify which domain journeys are release-blocking for the change.

Examples:

- Career application UI/flow changes: career review/final-submit and relevant career Chromium regressions are blocking.
- Project application API/RLS changes: project-interest/application persistence is blocking.
- Shared auth, canonical migrations, broad RLS, common API infrastructure, or CI/release-infrastructure changes: broader authenticated E2E may be required because the blast radius is shared.

An unrelated journey failure must still be recorded and fixed separately, but it should not automatically freeze an unrelated focused change.

#### Release gate

The `release-gate` job runs even when dependencies fail so it can produce a deterministic aggregate decision. It requires:

- successful `Change scope` classification;
- successful `Fast regression gate`;
- successful scoped authenticated backend gate whenever scope requires backend E2E;
- otherwise an expected `skipped` (or successful) staging result only for an explicit `docs-or-ci-policy-only` classification.

A failed, cancelled, or unexpectedly skipped required job is not accepted as green. Informational journey failures are not equivalent to required-gate failures, but they must remain visible in CI evidence and should be tracked to the affected domain.

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
| `npm run test:regression` | form contracts + `tests/critical-ui.spec.ts` + `tests/auth-account-ui.spec.ts` | Critical public UI, mobile menu, routes, forms, and account UI |
| `npm run test:phase1-browser` | `tests/phase1-browser.spec.ts` | Full Phase 1 auth/onboarding responsive browser acceptance |
| `npm run test:e2e:smoke` | `tests/authenticated-smoke.spec.ts` | Member, Architect, and Admin protected-route checks |
| `npm run test:e2e:staging` | authenticated smoke + staging journeys | Full browser -> API -> database -> Admin queue -> notification evidence; may include informational journeys depending on scope |

Playwright enables full parallel execution, one retry, and four CI/two local workers for standard tests. Destructive local E2E uses one worker where deterministic fixture ordering matters.

The Chromium cache is a provisioning optimization only. Its key is tied to the dependency lockfile so a Playwright/browser revision change invalidates the cache automatically. Required Chromium tests still execute on every release path where scope requires them, and a missing, corrupt, incompatible, or non-launchable browser must fail rather than being treated as green evidence.

The Phase 1 browser suite remains available as a separate command and is not currently part of `npm run test:regression` or a separate `main` CI step.

## Vercel flow

Expected operating model (GitHub ruleset confirmed; remaining Vercel settings must be confirmed):

1. Start from the current verified Rolling Green Baseline.
2. Push a focused feature branch and open a pull request.
3. GitHub Actions classifies change scope and runs the required gates.
4. Vercel may create a Preview deployment with Preview-scoped environment variables; this is not release approval.
5. Verify the affected journey on Preview/local isolated E2E, including Admin/data evidence where applicable.
6. `Release gate` must succeed for the checks required by that scope.
7. `Deployment gate` runs only after successful Release gate.
8. Merge only when all required PR checks are green on the exact head SHA.
9. On `main`, GitHub Actions classifies the actual merge/push diff again and runs all checks required by that exact scope.
10. Runtime/backend-impacting changes require deployment validation and read-only Production smoke checks; destructive fixtures must never target Production.
11. Documentation/CI-policy-only changes do not require a new runtime deployment to prove application behavior, though external Vercel Git integration may still attempt one until separately reconfigured.
12. Verify the exact resulting `main` SHA and any required deployed SHA/state.
13. Only after all required evidence for that scope is green does that `main` SHA become the new Rolling Green Baseline.

Vercel Cron invokes the routes listed in [Architecture](ARCHITECTURE.md#scheduled-operations). Cron endpoints require the expected bearer secret.

## Environment separation

| Environment | Supabase | Data rule | Credentials |
| --- | --- | --- | --- |
| Local developer | Local or dedicated development project | Never silently point destructive tests at Production | `.env.local`, never committed |
| GitHub Actions E2E | Ephemeral local Supabase stack | Disposable identities/fixtures only; destroyed after the run | Generated loopback credentials inside the runner |
| Hosted Preview/staging (optional) | Dedicated non-Production project/branch if explicitly provisioned | Disposable accounts and test-tagged records | Preview/staging-scoped variables only |
| Production | Production Supabase project | Read-only smoke unless a specifically approved synthetic journey exists | Vercel Production variables |

No paid hosted staging project/branch should be introduced without explicit owner approval. Forms do not need separate service-role keys per form. Rotate a service-role key if exposed, update every server/CI consumer, and redeploy.

## Pre-merge checklist

- The work branch started from the intended current baseline.
- Success criteria identify the existing behavior that must not regress.
- Documentation and a decision/policy update are included when architecture or release behavior changes.
- Migration and RLS changes are versioned and advisor-reviewed.
- `npm ci`, lint, typecheck, required audits, regression tests, and build pass.
- Production destructive-E2E guard passes whenever backend E2E is required.
- Authenticated smoke and the representative persistence check pass whenever backend E2E is required.
- Every journey directly affected by the PR is explicitly identified and passes its blocking regression/E2E evidence.
- Unrelated informational journey failures are visible and tracked rather than hidden.
- A docs/CI-policy-only exemption is accepted only when the classifier records that exact scope.
- Preview/browser checks cover the relevant mobile, tablet, and desktop widths, keyboard-only interaction, and relevant error states when UI changed.
- Environment additions appear in `.env.example` without secret values.
- Rollback impact is described in the PR.
- No failing or unexpectedly skipped required check is treated as green.
- Deployment gate is the final GitHub Actions release stage.

## Post-merge baseline check

After every merge to `main`:

1. fetch the exact resulting `main` SHA;
2. verify `Change scope` for the exact push/merge diff;
3. verify every check required by that classification and affected journey scope;
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
5. Run Supabase security/performance advisors and the scope-required isolated E2E journey before Production.

### Secret/configuration incident

1. Rotate the affected secret at its provider.
2. Update the correct Vercel Preview/Production and GitHub Actions scopes.
3. Redeploy; merely saving an environment variable does not update an already-built deployment.
4. Verify route behavior and inspect logs without printing secret values or sensitive form payloads.

### Post-rollback record

Add an entry to [DECISIONS.md](DECISIONS.md) with the incident cause/fix and update [Open issues](OPEN-ISSUES.md) until prevention evidence is merged.
