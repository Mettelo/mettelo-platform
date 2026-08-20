# Manual Vercel deployment policy

**Effective:** 20 August 2026  
**Status:** release policy for `mettelo-platform`

## Decision

Mettelo disables Vercel's automatic Git-triggered deployments in `vercel.json`:

```json
{
  "git": {
    "deploymentEnabled": false
  }
}
```

This policy applies to branch pushes, pull-request updates, and merges. Git activity must not itself create a Preview or Production deployment. Vercel deployment is an explicit release action.

This document supersedes any older wording in `docs/CI-CD.md` that says Vercel may automatically create a Preview or may automatically deploy a merge. The rest of the Rolling Green Baseline, risk-scoped release gates, isolated Supabase requirements, and rollback policy remain unchanged.

## Why

Automatic Git deployments were creating deployment noise and could consume Vercel build capacity before GitHub's required release evidence was complete. Manual deployment makes the release boundary explicit and keeps hosting activity behind the repository's `Release gate` and `Deployment gate` rather than ahead of them.

Manual mode does **not** weaken CI. It changes only how a Vercel build is initiated.

## Required release order

For runtime/backend-impacting changes:

1. Start from the current verified Rolling Green Baseline.
2. Open a focused pull request.
3. Let GitHub Actions classify scope and run every required static, browser, isolated-Supabase, authenticated, and persistence check.
4. Require the exact PR head SHA to pass `Release gate` and `Deployment gate`.
5. Merge with an exact-head guard.
6. Verify the exact resulting `main` SHA and all checks required for that `main` push.
7. Initiate Vercel deployment manually only for the intended approved source revision.
8. Verify the resulting Vercel deployment is `READY` and is attributable to the intended source SHA/revision before treating it as release evidence.
9. Run the permitted read-only Production smoke checks for the affected runtime journeys.
10. Advance the Rolling Green Baseline only after all evidence required for that scope is green.

Documentation/CI-policy-only changes still follow their repository-scoped gates and do not require a runtime Production deployment solely to prove unchanged application behavior.

## Exact-source requirement

A manual deployment is not valid release evidence merely because it is `READY`. The operator must be able to identify the source revision that was deployed and show that it is the intended approved `main` state.

If the available deployment mechanism cannot identify or verify the intended source revision, do not use it as a Production promotion path. Use a deployment mechanism that preserves source attribution instead.

## Preview use

Preview deployments are optional and manual. When a Preview is useful for product review, accessibility review, or non-destructive hosted smoke testing, create it explicitly after the relevant branch state is known. A Preview never substitutes for `Release gate`, `Deployment gate`, isolated Supabase evidence, or post-merge verification.

Destructive E2E must continue to use the repository's isolated local Supabase environment and must never point at Production.

## Production and rollback

Production deployment or rollback is an explicit operator action. For rollback, use an owner-approved Vercel rollback/redeployment of a known-good deployment with verifiable source attribution, or merge a Git revert through the normal release gates. After either path, verify the affected runtime and backend read paths before advancing the baseline.

Saving a Vercel environment variable does not update an already-built deployment; an explicit redeployment is required when configuration changes must reach runtime.

## Operational consequence

Because automatic Git deployments are disabled, a successful merge to `main` should not be interpreted as a request for Vercel to build. A missing automatic Vercel deployment after a merge is expected behavior under this policy, not a deployment failure. Runtime releases become complete only when the required repository gates, explicit manual deployment, source attribution, and Production verification are all satisfied.
