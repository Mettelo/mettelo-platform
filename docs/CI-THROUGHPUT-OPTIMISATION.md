# CI throughput optimisation (October 2026)

## What changed

- **Phase 2 isolated catalogue rehearsal:** no longer starts on unrelated `package.json` or `package-lock.json` changes; it still runs for changes to the master catalogue, discovery routes, relevant generators, fixtures and the rehearsal workflow itself. Old runs on the same PR are cancelled automatically.
- **Main Mettelo CI:** retains the existing fast regression gate, full build, typecheck, lint and all five **blocking** isolated-Supabase browser suites. Only the previously **non-blocking** `informational-journeys` shard is removed from the PR matrix, avoiding a sixth disposable Supabase startup for every runtime PR.
- **Optional informational journeys:** still available under **Actions → Informational E2E (on demand) → Run workflow**. This workflow uses its own disposable local Supabase stack and production-target guard.
- **Next.js cache:** the fast regression gate now restores `.next/cache` between commits when the lockfile matches. The build and audits still execute; no test is skipped by the cache.
- **Concurrency:** `Mettelo CI` already uses `cancel-in-progress: true`; the Phase 2 rehearsal and optional informational workflow now do as well.

## Release policy unchanged

Do not weaken required GitHub branch protection or bypass `Release gate`. All required fast checks, staging browser suites, persistence checks and isolated DB verification remain mandatory for relevant changes. The optional full submission journey suite was previously non-blocking and is now run explicitly when needed.

## Operational diagnosis when jobs are queued

If multiple workflows remain **queued** without a running job, first inspect **Actions → Runners** and **Settings → Actions → General** for organisation runner limits, concurrency caps, disabled Actions, billing limits or GitHub-hosted runner availability. YAML optimisations cannot create runner capacity. Do not push repeated no-op commits to restart the queue.

## Measurement

Compare median and p90 **queue time**, **runner execution time**, and **total PR time to green** across the next 10 PRs. Expected immediate savings: one fewer disposable Supabase environment for each runtime PR, fewer Phase 2 rehearsals for unrelated dependency changes, and fewer redundant outdated Phase 2 jobs. No measured speed-up is claimed before the checks actually run.
