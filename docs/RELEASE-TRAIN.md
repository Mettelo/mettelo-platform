# Mettelo release train

## Purpose

Mettelo uses release-train integration branches to preserve the full Production quality gate without repeating the most expensive browser and isolated-Supabase suites for every stacked feature pull request.

## Integration branch

Current train: `release/mettelo-lab-integration`.

Feature pull requests targeting a `release/*` branch must still pass the deterministic quality gate: install, lint, typecheck, repository audits, the Mettelo Lab architecture audit, focused project-interest flow checks, and the production build.

The expensive browser regression, authenticated smoke/visual QA, isolated Supabase and persisted-submission checks are intentionally deferred for release-train PRs only.

## Production boundary

A release train cannot deploy directly to Production. Before any release-train content enters `main`, the combined release branch must open a pull request targeting `main`. Because its target is `main`, that PR receives the normal full runtime release path, including blocking browser regression, authenticated smoke, isolated-Supabase evidence, persistence checks, Release gate and Deployment gate.

A failed required check blocks merge. Tests, authorization, security policy and Production guards must not be weakened to make a release eligible.

## Workflow for contributors

1. Branch from the current release train when the work belongs to the active batch.
2. Open the PR against the active `release/*` branch.
3. Merge only after the release-train deterministic gate is green.
4. Keep unrelated or incomplete work out of the train.
5. When the batch is ready, freeze the train and open one PR from the release branch to `main`.
6. Merge to `main` only after every full release check is green.

After a train lands, create the next release branch from the resulting green `main` for subsequent work.
