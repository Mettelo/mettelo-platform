# Canonical Supabase baseline reconciliation

## Status

The repository historically depended on hosted Supabase objects whose original creation pre-dated the canonical `supabase/migrations/` history. Disposable CI could reconstruct those objects only because `scripts/prepare-local-supabase.mjs` injected schema files from `supabase/ci/`.

This reconciliation moves the schema-bearing compatibility layers into canonical historical migration positions so a blank database receives the same prerequisite objects from `supabase/migrations/` itself.

## Canonical historical baselines

- `20260809020000_missing_hosted_baseline.sql` — early taxonomy table prerequisites, Careers, content, email/notification infrastructure, `project_runs`, and the private `career-cvs` bucket.
- `20260812090000_project_run_hosted_baseline.sql` — historical project-run columns, run foreign keys/indexes and prerequisite run helper functions.
- `20260816095000_spotlight_hosted_baseline.sql` — historical Spotlight reputation fields and constraints.

The first baseline creates the six taxonomy tables early because `20260809072000_taxonomy_preferences_security.sql` already references their relation tables. Policy, index and seed ownership remains with the existing `20260809072000` and `20260809090000_project_taxonomy.sql` migrations; the baseline does not duplicate that later behavior.

## Production replay safety

These migrations may be encountered by a database that already contains the hosted objects. They therefore use idempotent table/column/index creation and avoid replacing existing hosted policy/function definitions:

- policies are created only when the named historical policy is absent;
- project-run helper functions are defined only when the function signature does not already exist;
- Spotlight constraints are created only when absent;
- the private CV bucket uses `on conflict do nothing`.

Later canonical migrations remain responsible for subsequent hardening and lifecycle changes.

## CI-only compatibility boundary

`supabase/ci/20260818990000_service_role_hosted_grants.sql` remains intentionally CI-only. It grants the disposable local service role the broad privileges required by the isolated release test harness. It is not schema history and must not be promoted to production as a blanket grant migration.

`scripts/prepare-local-supabase.mjs` now rejects every other SQL file under `supabase/ci/` and asserts that all three hosted schema baselines exist under `supabase/migrations/`.

## Verification contract

A change to this baseline is not release-ready until the RED release gate proves all of the following on the exact PR head:

1. the isolated Supabase stack starts from the canonical migrations plus the explicit CI-only grant shim;
2. disposable identities/fixtures seed successfully;
3. the production-target guard passes;
4. authenticated smoke passes;
5. the representative persisted-submission journey passes;
6. the full submission suite completes;
7. the normal fast regression/build gate, Release gate and Deployment gate are green.

## Separate security-hardening backlog

The production Supabase advisor currently reports additional findings, including RLS-enabled service/internal tables without explicit policies and authenticated execution of some `SECURITY DEFINER` helper functions. Those findings require their own authorization review and are deliberately not bundled into this historical-baseline reconciliation.
