# Manual Vercel deployment policy

Last updated: 21 August 2026

## Owner-approved operating model

Mettelo currently uses **manual Vercel Production deployments** rather than automatic deployment on every merge to `main`.

This is an explicit owner-approved operating decision for the current Vercel free-tier setup, where the team is operating to a **maximum of one Production deployment per day**. The purpose is to allow multiple independently verified pull requests to merge during the day without consuming the Production deployment allowance after every merge.

## Merge policy while manual deployment is enabled

For pull requests that change runtime or backend behaviour:

1. The pull request must still pass the repository's required exact-head checks for its scope.
2. `Release gate` must be green before merge.
3. `Deployment gate`, when emitted by the workflow, remains an in-repository eligibility signal and must not be treated as evidence that Vercel Production has already been deployed.
4. A pull request may merge after its required GitHub release checks are green even when Vercel Production is intentionally still on an earlier `main` SHA because deployment is being batched for the daily manual release.
5. Subsequent pull requests may continue through the normal reconcile -> exact-head CI -> Release gate -> merge sequence during that batch window.
6. Security, authentication, RLS, migration, accessibility, browser, persistence, and other scope-required checks must never be weakened or skipped to accommodate the deployment limit.

## Daily Production release

At the chosen daily release point:

1. Select the latest intended green `main` SHA containing the day's approved merges.
2. Manually deploy that exact SHA to Vercel Production.
3. Confirm the Vercel deployment reaches `READY` and points to the intended `main` SHA.
4. Perform the required read-only Production smoke/route checks for the batched runtime changes.
5. Record any deployment or smoke failure and stop further Production promotion until it is repaired or rolled back.

The Rolling Green Baseline therefore has two pieces of evidence while this policy is active:

- **merge/repository baseline:** latest `main` SHA whose required GitHub Release gates are green;
- **Production baseline:** latest manually deployed `main` SHA that is `READY` and has passed the required Production verification.

These SHAs may temporarily differ during the daily batch window. That difference is expected and is not, by itself, a merge blocker under this owner-approved manual-deployment policy.

## Rollback

If the daily Production deployment fails or introduces a Production regression, do not deploy another unverified feature SHA merely to catch up with `main`. Restore/promote the last known-good Production deployment where permitted, or prepare a reviewed corrective/revert change through the normal repository release gates before the next manual Production deployment.

## Revisit condition

When Mettelo moves away from the current free-tier constraint, or enables reliable automatic Production deployment again, this exception should be removed and the normal per-release deployment-alignment requirement restored in `docs/CI-CD.md`.
