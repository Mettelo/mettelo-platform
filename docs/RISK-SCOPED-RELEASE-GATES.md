# Risk-scoped release gates

Date adopted: 18 August 2026

## Decision

Mettelo uses **risk-scoped blocking** inside the Rolling Green Baseline.

A check blocks a pull request when its failure indicates meaningful risk in the code area changed by that pull request. Unrelated end-to-end journeys may still run and report evidence, but they do not automatically block an otherwise safe, well-verified change.

This is not permission to skip testing. It is a rule for deciding which test result is release-blocking.

## Always-blocking evidence

For changes that affect runtime code, the following remain blocking unless an explicitly documented scope exemption applies:

- change-scope classification;
- lint;
- TypeScript typecheck;
- production build;
- static/domain audits required by the repository;
- critical Chromium regression coverage;
- destructive-E2E Production guard;
- authenticated smoke for protected Member, Project Architect, and Admin areas when backend E2E is required;
- the representative persistence check required by the current release scope.

A failed required check means the Rolling Green Baseline does not advance.

## Journey-specific blocking

Journey-level browser/API/database tests are blocking when the pull request changes that journey or shared infrastructure the journey depends on.

Examples:

- Career UI/application changes: career application review/final-submit and relevant career browser regressions are blocking.
- Project application API or RLS changes: project-interest/application persistence journeys are blocking.
- Shared auth, migrations, RLS, release infrastructure, or cross-domain API changes: broader authenticated E2E coverage may be required because the blast radius is shared.

Unrelated journey failures remain visible as warnings/evidence and must be tracked, but they do not automatically freeze an unrelated focused change.

## CI infrastructure acceptance

The zero-cost CI environment uses an ephemeral local Supabase stack inside GitHub Actions. It must:

1. refuse Production Supabase;
2. prepare and apply the local migration set;
3. boot successfully;
4. create disposable E2E identities/fixtures;
5. start Mettelo against that isolated stack;
6. pass authenticated smoke;
7. pass at least one representative browser -> API -> database persisted submission check;
8. tear the stack down after the run.

Broader submission journeys may run informationally and upload Playwright evidence even when they are not release-blocking for that scope.

## Safety boundaries

Risk-scoped blocking must never be used to:

- run destructive E2E against Production;
- turn a directly affected failing journey into a warning merely to obtain green CI;
- weaken security/RLS assertions for convenience;
- merge when lint, typecheck, build, critical regression, Production guard, or another scope-required check is red;
- hide a failing informational journey instead of recording/fixing it separately;
- spend money on hosted staging infrastructure without explicit owner approval.

## Merge and baseline rule

A focused PR may merge when every check required for its classified scope is green on the exact head SHA.

After merge:

1. verify the exact resulting `main` SHA;
2. verify the checks required for that resulting scope/state;
3. verify deployment/revision when runtime deployment is required;
4. only then advance the Rolling Green Baseline.

The governing principle is:

> A failure blocks a PR when it indicates meaningful risk in the code area that PR changes.

This policy should be read together with [CI/CD, deployment, and rollback](CI-CD.md).
